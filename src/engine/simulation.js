/**
 * Core simulation engine.
 * Runs deterministic paths and Monte Carlo simulations for retirement planning.
 * @module engine/simulation
 */

import { shockInflation } from './inflation.js';
import { pensionTaxForYear } from './tax.js';
import { LTCG_GAINS_FRACTION, LTCG_EXEMPTION, LTCG_RATE } from './goals.js';

// ---------------------------------------------------------------------------
// Seedable RNG — mulberry32 (fast, good statistical quality, ~20 lines)
// Default seed 42 gives stable Never-short % between keystrokes.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller normal variate using a supplied uniform RNG.
 * @param {() => number} rng - uniform [0,1) generator
 */
function randnWith(rng) {
  let u = 0, v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Legacy unseeded export (kept for any external callers). */
export function randn() {
  return randnWith(Math.random);
}

export function percentile(sorted, q) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

// ---------------------------------------------------------------------------
// runPath
// ---------------------------------------------------------------------------
/**
 * Run a single deterministic retirement path.
 *
 * @param {object} params        Simulation parameters
 * @param {string} mode          'taps' | 'cps' | 'compare'
 * @param {number} cRate         CPS annual crediting rate (decimal)
 * @param {number} sXirr         SIP annual XIRR (decimal)
 * @param {number} infL          Living inflation (decimal)
 * @param {number} infM          Medical inflation (decimal)
 * @param {number} infE          Education inflation (decimal)
 * @param {number} infC          Composite inflation (decimal)
 * @param {object} [wDraws]      Year-keyed goal withdrawal map (NET of LTCG — see wTaxDraws)
 * @param {Function} [yearlyOverlay]  Optional per-year rate modifier:
 *   (rates: {sXirr, cRate, infL, infM, infE, infC}, yearIdx: number) => same shape.
 *   Called at the start of each accumulation and drawdown year. yearIdx is the
 *   absolute year index (0-based from the base year): accumulation year i,
 *   drawdown year accYears + j. Return rates are used for that year only.
 * @param {object} [wTaxDraws]   Year-keyed capital-gains tax map for goal
 *   withdrawals (pairs 1:1 with wDraws years). Deducted from balances in the
 *   withdrawal year with exact-year deflation into taxReal.
 */
export function runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, wDraws, yearlyOverlay, wTaxDraws = null) {
  let cpsAnn = params.cpsAnn;
  let sipMo = params.sipMo;
  let cpsBal = params.cpsBal;
  let sipBal = 0;
  const accYears = Math.max(0, params.rYr - params.bYr);
  const records = [];

  // --- Lifetime-tax accumulators (nominal ₹ + exact-year-deflated real ₹).
  // Fed by goal-withdrawal LTCG in the accumulation loop, the terminal SIP
  // liquidation tax at the retirement transition, and pension tax + goal LTCG
  // in the drawdown loop.
  let taxNominal = 0;
  let taxReal    = 0;

  // Running cumulative inflation indices (1.0 = base year purchasing power)
  let cumInfL = 1.0;
  let cumInfM = 1.0;
  let cumInfC = 1.0;

  // === ACCUMULATION PHASE ===
  for (let i = 0; i <= accYears; i++) {
    const yr = params.bYr + i;

    // Apply per-year overlay (stress regimes with time-limited windows).
    // Base rates are unchanged for subsequent years — the overlay is stateless per year.
    let ySXirr = sXirr;
    let yCRate = cRate;
    let yInfL = infL;
    let yInfM = infM;
    let yInfE = infE;
    let yInfC = infC;
    if (yearlyOverlay && i > 0) {
      const ov = yearlyOverlay({ sXirr, cRate, infL, infM, infE, infC }, i);
      ySXirr = ov.sXirr; yCRate = ov.cRate;
      yInfL  = ov.infL;  yInfM  = ov.infM;
      yInfE  = ov.infE;  yInfC  = ov.infC;
    } else if (yearlyOverlay && i === 0) {
      // Year 0 overlay — applied to the first accumulation year
      const ov = yearlyOverlay({ sXirr, cRate, infL, infM, infE, infC }, 0);
      ySXirr = ov.sXirr; yCRate = ov.cRate;
      yInfL  = ov.infL;  yInfM  = ov.infM;
      yInfE  = ov.infE;  yInfC  = ov.infC;
    }

    if (i > 0) {
      cumInfL *= (1 + yInfL);
      cumInfM *= (1 + yInfM);
      cumInfC *= (1 + yInfC);

      cpsAnn *= 1 + params.cpsInc;
      if (params.pcs && params.pcs[yr]) cpsAnn *= 1 + params.pcs[yr];
      sipMo *= 1 + params.sipStep;
    }

    // Monthly CPS rate from possibly-overlaid cRate
    const yMonthlyR = Math.pow(1 + yCRate, 1 / 12) - 1;

    // CPS: compound monthly for 12 months at this year's crediting rate
    for (let mm = 0; mm < 12; mm++) {
      cpsBal = cpsBal * (1 + yMonthlyR) + (cpsAnn / 12);
    }

    // SIP: compound monthly for 12 months at this year's XIRR
    for (let mm = 0; mm < 12; mm++) {
      sipBal = (sipBal + sipMo) * (1 + ySXirr / 12);
    }

    // Withdraw for goals funded from SIP corpus (net amount; the paired
    // capital-gains tax is deducted separately below for exact-year attribution)
    if (wDraws && wDraws[yr] && wDraws[yr] > 0) {
      sipBal = Math.max(0, sipBal - wDraws[yr]);
    }
    // Capital-gains tax on this year's goal withdrawals — deducted from the
    // corpus in the withdrawal year (not midpoint-discounted).
    if (wTaxDraws && wTaxDraws[yr] && wTaxDraws[yr] > 0 && sipBal > 0) {
      const goalTax = Math.min(sipBal, wTaxDraws[yr]);
      sipBal -= goalTax;
      taxNominal += goalTax;
      taxReal += goalTax / cumInfC;
    }

    const total = cpsBal + sipBal;
    records.push({
      yr,
      age: params.currentAge + i,
      phase: 'acc',
      cps: cpsBal / 1e7,
      sip: sipBal / 1e7,
      liquid: total / 1e7,
      tot: total / 1e7,
      real: (total / cumInfC) / 1e7,
      pension: 0,
    });
  }

  // === RETIREMENT TRANSITION ===
  const finCPS = cpsBal;
  const finSIP = sipBal;
  const lp = params.lastPay || { tapsPension: 0, emoluments: 0 };
  const tapsP = lp.tapsPension || 0;
  const totalWealthAtRetire = finCPS + finSIP + params.gratuity;
  const cumInfCAtRetire = cumInfC;
  const realWealthAtRetire = totalWealthAtRetire / cumInfCAtRetire;

  let annuityCorpus = 0;
  let cpsPension = 0;
  if (mode === 'cps' && params.annPct > 0) {
    annuityCorpus = finCPS * (params.annPct / 100);
    cpsPension = (annuityCorpus * params.annYield) / 12;
  }

  const monthlyPension = mode === 'taps' ? tapsP : cpsPension;
  const residualCPS = mode === 'taps' ? 0 : Math.max(0, finCPS - annuityCorpus);
  let liquid = residualCPS + finSIP + params.gratuity;

  // Terminal capital-gains tax on SIP corpus liquidation at retirement.
  // Gains fraction mirrors the goals assumption (60% of balance); CPS and
  // gratuity are untouched. Deducted before the liquidStart snapshot.
  // (Shared constants live in goals.js LTCG_GAINS_FRACTION / LTCG_*.)
  const sipGains = finSIP * LTCG_GAINS_FRACTION;
  const sipTaxable = Math.max(0, sipGains - LTCG_EXEMPTION);
  const terminalSipTax = sipTaxable * LTCG_RATE;
  if (terminalSipTax > 0) {
    liquid = Math.max(0, liquid - terminalSipTax);
    taxNominal += terminalSipTax;
    taxReal += terminalSipTax / cumInfCAtRetire;
  }
  const liquidStart = liquid;

  // === DRAWDOWN PHASE ===
  const drawdownYears = Math.max(0, params.endYr - params.rYr);
  let depletedYear = null;
  let pension = monthlyPension;

  // --- Long-term care (LTC) config — off unless params.ltcOn is true, so
  // default results are bit-identical to pre-LTC runs. When on: medical
  // inflation steps up from medStepAge (65: ~7% -> ~10%) and a one-time
  // critical-illness shock is deducted at ltcShockAge (75).
  const ltcOn = params.ltcOn === true;
  const medStepAge = params.medStepAge ?? 65;
  const medStepUp = params.medStepUp ?? 0.03;
  const ltcShockAge = params.ltcShockAge ?? 75;
  const ltcShockAmt = params.ltcShockAmt ?? 500000;
  let ltcShockYear = null;

  // --- Robustness accumulators ---
  let shortYears = 0;          // count of years where liquid hits 0
  let firstShortYear = null;   // first such year
  let lifetimeMedSpendNominal = 0; // Σ annual medical spend (nominal ₹)

  for (let j = 1; j <= drawdownYears; j++) {
    const yr = params.rYr + j;
    const elapsed = accYears + j;

    // Apply per-year overlay (same absolute yearIdx timeline as accumulation:
    // accYears + j). Windowed regimes self-disable past their window; all-years
    // regimes (e.g. medical_shock) bite here. Only inflation components apply
    // in drawdown — SIP/CPS balances are fixed at retirement.
    let yInfL = infL;
    let yInfM = infM;
    let yInfC = infC;
    if (yearlyOverlay) {
      const ov = yearlyOverlay({ sXirr, cRate, infL, infM, infE, infC }, elapsed);
      yInfL = ov.infL; yInfM = ov.infM; yInfC = ov.infC;
    }

    cumInfL *= (1 + yInfL);
    // LTC age-tiering: medical inflation accelerates from medStepAge.
    const age = params.currentAge + elapsed;
    const yInfMeff = (ltcOn && age >= medStepAge) ? yInfM + medStepUp : yInfM;
    cumInfM *= (1 + yInfMeff);
    cumInfC *= (1 + yInfC);

    if (mode === 'taps') {
      pension = tapsP * (cumInfC / cumInfCAtRetire);
    }

    const medExp = params.retSpend * params.medShare * cumInfM;
    const livExp = params.retSpend * (1 - params.medShare) * cumInfL;
    const monthlyExp = medExp + livExp;
    lifetimeMedSpendNominal += medExp * 12;

    // Simplified pension tax: annualise monthly pension for slab lookup.
    // The tax is a real drag on the corpus (monthly slice of the annual bill).
    const annualPension = pension * 12;
    const yearTaxNominal = pensionTaxForYear(annualPension);
    taxNominal += yearTaxNominal;
    // Per-year deflation (exact): discount each year's tax by exact cumulative inflation
    taxReal += yearTaxNominal / cumInfC;

    const netDrawdown = Math.max(0, monthlyExp - pension + yearTaxNominal / 12);

    for (let mm = 0; mm < 12; mm++) {
      liquid = liquid * (1 + params.postRetRate / 12) - netDrawdown;
      if (liquid <= 0) {
        liquid = 0;
        if (!depletedYear) depletedYear = yr;
        break;
      }
    }

    // Deduct post-retirement lump-sum milestone goal (net) if due this year,
    // plus its capital-gains tax — same exact-year pairing as accumulation.
    if (wDraws && wDraws[yr] && wDraws[yr] > 0) {
      liquid = Math.max(0, liquid - wDraws[yr]);
      if (liquid === 0 && !depletedYear) {
        depletedYear = yr;
      }
    }
    if (wTaxDraws && wTaxDraws[yr] && wTaxDraws[yr] > 0 && liquid > 0) {
      const goalTax = Math.min(liquid, wTaxDraws[yr]);
      liquid -= goalTax;
      taxNominal += goalTax;
      taxReal += goalTax / cumInfC;
      if (liquid === 0 && !depletedYear) {
        depletedYear = yr;
      }
    }

    // LTC critical-illness shock: one-time out-of-pocket deduction at ltcShockAge.
    let ltcShock = 0;
    if (ltcOn && ltcShockAmt > 0 && age === ltcShockAge && liquid > 0) {
      ltcShock = Math.min(liquid, ltcShockAmt);
      liquid -= ltcShock;
      if (!ltcShockYear) ltcShockYear = yr;
      if (liquid === 0 && !depletedYear) {
        depletedYear = yr;
      }
    }

    const isDepleted = liquid === 0;
    if (isDepleted) {
      shortYears++;
      if (!firstShortYear) firstShortYear = yr;
    }

    const totalValue = liquid + (mode === 'taps' ? 0 : annuityCorpus);
    records.push({
      yr,
      age: params.currentAge + elapsed,
      phase: 'draw',
      cps: (mode === 'taps' ? 0 : annuityCorpus) / 1e7,
      sip: 0,
      liquid: liquid / 1e7,
      tot: totalValue / 1e7,
      real: (totalValue / cumInfC) / 1e7,
      pension,
      depleted: isDepleted,
      // Monthly nominal retirement spend split (₹) — feeds the spending chart.
      expLiv: livExp,
      expMed: medExp,
      expTot: monthlyExp,
      ltcShock,
    });
  }

  // Bequest: terminal record values
  const termRec = records[records.length - 1];
  const bequestNominal = termRec ? termRec.tot * 1e7 : 0;
  const bequestReal    = termRec ? termRec.real * 1e7 : 0;

  // NOTE: goal-withdrawal LTCG is no longer midpoint-discounted here — it is
  // deducted year-exact via wTaxDraws in both loops above (plus the terminal
  // SIP liquidation tax at the retirement transition).

  return {
    records,
    finCPS,
    finSIP,
    totalWealthAtRetire,
    realWealthAtRetire,
    annuityCorpus,
    monthlyPension,
    tapsPension: tapsP,
    liquidStart,
    depletedYear,
    mode,
    lastEmol: lp.emoluments || 0,
    ltcShockYear,
    // Robustness fields
    shortYears,
    firstShortYear,
    taxNominal,
    taxReal,
    lifetimeMedSpendNominal,
    bequestNominal,
    bequestReal,
  };
}

// ---------------------------------------------------------------------------
// runMonteCarlo
// ---------------------------------------------------------------------------
export function runMonteCarlo(params, mode, inflation, withdrawals, mcConfig, wTaxDraws = null) {
  const { runs = 1000, mcMode = 'A', rngSeed = 42 } = mcConfig;
  const paths = [];
  let survive = 0;

  // Each run gets its own deterministic sub-seed derived from the master seed
  const masterRng = mulberry32(rngSeed);

  for (let r = 0; r < runs; r++) {
    // Fresh seeded RNG per run (stable across re-renders)
    const runRng = mulberry32(Math.floor(masterRng() * 2 ** 32));

    let sXirr = params.sipXirr;
    let cRate = params.cpsRate;
    let infL = inflation.infLiving;
    let infM = inflation.infMed;
    let infE = inflation.infEdu;
    let infC = inflation.infComposite;

    sXirr = clamp(params.sipXirr + randnWith(runRng) * 0.035, 0.02, 0.22);

    if (mcMode === 'B' || mcMode === 'C') {
      const shock = randnWith(runRng) * 0.012;
      const shocked = shockInflation(inflation, shock);
      infL = shocked.infLiving;
      infM = shocked.infMed;
      infE = shocked.infEdu;
      infC = shocked.infComposite;
    }

    if (mcMode === 'C') {
      cRate = clamp(params.cpsRate + randnWith(runRng) * 0.008, 0.04, 0.12);
    }

    const res = runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, withdrawals, undefined, wTaxDraws);
    paths.push(res);
    if (!res.depletedYear) survive++;
  }

  const nY = paths[0].records.length;
  if (!nY) {
    throw new Error(
      'runMonteCarlo: runPath produced zero records — sim params are malformed ' +
      '(check bYr/rYr/endYr are defined numbers and rYr > bYr). ' +
      'Pass engine-unit params via buildSimParams(), never raw context state.'
    );
  }
  const low = [], mid = [], high = [];

  for (let i = 0; i < nY; i++) {
    const tots = paths.map(x => x.records[i].tot).sort((a, b) => a - b);
    const liqs = paths.map(x => x.records[i].liquid).sort((a, b) => a - b);
    const base = paths[0].records[i];

    low.push({ ...base, tot: percentile(tots, 0.1), liquid: percentile(liqs, 0.1) });
    mid.push({ ...base, tot: percentile(tots, 0.5), liquid: percentile(liqs, 0.5) });
    high.push({ ...base, tot: percentile(tots, 0.9), liquid: percentile(liqs, 0.9) });
  }

  const ri = paths[0].records.findIndex(r => r.yr === params.rYr);
  const riIdx = ri >= 0 ? ri : paths[0].records.length - 1;
  const retTots = paths.map(x => x.records[riIdx].tot).sort((a, b) => a - b);
  const liquidStarts = paths.map(x => x.liquidStart).sort((a, b) => a - b);
  const totalWealths = paths.map(x => x.totalWealthAtRetire).sort((a, b) => a - b);
  const realWealths  = paths.map(x => x.realWealthAtRetire).sort((a, b) => a - b);
  const medFinCPS    = paths.map(x => x.finCPS).sort((a, b) => a - b)[Math.floor(runs / 2)] || 0;

  // --- Robustness aggregations ---
  const neverShortPct = (paths.filter(p => p.shortYears === 0).length / runs) * 100;
  const exhaustPct    = 100 - (survive / runs) * 100;

  // Median depletion year among exhausted runs
  const depYears = paths.filter(p => p.depletedYear !== null).map(p => p.depletedYear).sort((a, b) => a - b);
  const deplYearMed = depYears.length ? depYears[Math.floor(depYears.length / 2)] : null;

  // Bequest (terminal real value)
  const bqReals = paths.map(p => p.bequestReal).sort((a, b) => a - b);
  const bequestP10 = percentile(bqReals, 0.1);
  const bequestP50 = percentile(bqReals, 0.5);

  // Tax
  const taxReals = paths.map(p => p.taxReal).sort((a, b) => a - b);
  const taxP50 = percentile(taxReals, 0.5);

  // Short years
  const shortYrArr = paths.map(p => p.shortYears).sort((a, b) => a - b);
  const shortYrsP50 = percentile(shortYrArr, 0.5);

  const fstShortArr = paths.filter(p => p.firstShortYear).map(p => p.firstShortYear).sort((a, b) => a - b);
  const firstShortP50 = fstShortArr.length ? fstShortArr[Math.floor(fstShortArr.length / 2)] : null;

  return {
    low: { records: low },
    high: { records: high },
    mid: {
      records: mid,
      finCPS: medFinCPS,
      totalWealthAtRetire: percentile(totalWealths, 0.5),
      realWealthAtRetire: percentile(realWealths, 0.5),
      annuityCorpus: paths[0].annuityCorpus,
      monthlyPension: paths[0].monthlyPension,
      tapsPension: paths[0].tapsPension,
      liquidStart: percentile(liquidStarts, 0.5),
      depletedYear: deplYearMed,   // fixed: was hardcoded null
      mode,
      lastEmol: paths[0].lastEmol,
    },
    survivePct: (survive / runs) * 100,
    retP10: percentile(retTots, 0.1) * 1e7,
    retP90: percentile(retTots, 0.9) * 1e7,
    retMed: percentile(retTots, 0.5) * 1e7,
    // Robustness stats
    neverShortPct,
    exhaustPct,
    deplYearMed,
    bequestP10,
    bequestP50,
    taxP50,
    shortYrsP50,
    firstShortP50,
  };
}
