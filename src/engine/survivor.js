/**
 * Survivor ("if I die in service") benefit calculator.
 *
 * Death-year inputs (emoluments, service length, balances) come from the career
 * engine and median simulation records; this module turns them into the family
 * payout picture: two-phase spouse pension, DCRG gratuity, protection legs,
 * and the children-inherit pool. Pure functions — no mortality weighting
 * ("if", not "when").
 *
 * Rule sources: G.O.Ms.No.07 09-01-2026 (TAPS 60%-of-pension family pension),
 * TN Pension Rules 1978 §45(1)(b) via G.O.Ms.No.448 07-06-1995 (death gratuity
 * slabs), Treasuries karuvoolam (FBF ₹1.5L; enhanced 50% × 7yrs/till 65),
 * 2021 revision (Security Fund ₹5L), TNGDA/DCF reports (₹1Cr, members/duty).
 *
 * @module engine/survivor
 */

import { protectionLump } from './protection.js';

/** DCRG ceiling under TAPS (₹25 lakh). */
export const DCRG_CEILING = 2500000;

/** Enhanced family-pension window after death in service. */
export const ENHANCED_YEARS = 7;
export const ENHANCED_FRACTION = 0.5; // 50% of emoluments (TN rules)

/**
 * Death gratuity by qualifying service (TN Pension Rules §45(1)(b) slabs),
 * capped at the DCRG ceiling.
 *
 * @param {number} emolumentsMonthly - Monthly emoluments at death (₹)
 * @param {number} serviceYears - Completed qualifying service years
 * @returns {number} Gratuity (₹)
 */
export function deathGratuity(emolumentsMonthly, serviceYears) {
  const e = Math.max(0, emolumentsMonthly || 0);
  const s = Math.max(0, serviceYears || 0);
  let months;
  if (s < 1) months = 2;
  else if (s < 5) months = 6;
  else if (s < 20) months = 12;
  else months = Math.min(33, Math.floor(s * 2) * 0.5);
  return Math.min(DCRG_CEILING, months * e);
}

/**
 * Full survivor picture for death in a given service year.
 *
 * @param {object} opts
 * @param {number} opts.emolumentsAtDeath - Monthly emoluments at death (₹)
 * @param {number} opts.serviceYears - Completed service years at death
 * @param {number} [opts.sipBalance=0] - SIP corpus at death year (₹, median path)
 * @param {number} [opts.cpsBalance=0] - CPS corpus at death year (₹, median path)
 * @param {boolean} [opts.fbfOn=true]
 * @param {boolean} [opts.securityOn=true]
 * @param {boolean} [opts.dcfOn=true]
 * @param {number} [opts.termAmt=0]
 * @returns {object} { phase1Mo, phase2Mo, gratuity, legs, protectionTotal,
 *   lumpTotal, childrenInherit }
 */
export function survivorBenefit({
  emolumentsAtDeath,
  serviceYears,
  sipBalance = 0,
  cpsBalance = 0,
  fbfOn = true,
  securityOn = true,
  dcfOn = true,
  termAmt = 0,
}) {
  const emol = Math.max(0, emolumentsAtDeath || 0);
  // Phase 1: enhanced 50% of emoluments × 7 yrs; Phase 2: 60% of the
  // notional 50% pension (0.6 × 0.5 × emoluments), DA-indexed in reality.
  const phase1Mo = emol * ENHANCED_FRACTION;
  const phase2Mo = emol * 0.5 * 0.6;
  const gratuity = deathGratuity(emol, serviceYears);

  const prot = protectionLump({
    fbfOn,
    securityOn,
    dcfOn,
    termAmt,
    gratuity,
    cpsBal: cpsBalance,
    sipBal: sipBalance,
  });

  // Children-inherit pool = full family lump pool (protection + balances).
  // poolWithoutTerm already = protectionNonTerm + gratuity + cps + sip.
  const lumpTotal = prot.poolWithoutTerm + Math.max(0, termAmt);

  return {
    phase1Mo: Math.round(phase1Mo),
    phase2Mo: Math.round(phase2Mo),
    enhancedYears: ENHANCED_YEARS,
    gratuity: Math.round(gratuity),
    legs: prot.legs,
    protectionTotal: prot.protectionTotal,
    lumpTotal: Math.round(lumpTotal),
    childrenInherit: Math.round(lumpTotal),
  };
}
