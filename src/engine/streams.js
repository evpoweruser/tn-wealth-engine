/**
 * College stream cost projector.
 *
 * Answers: "Engineering vs Medical vs Arts — what will it actually cost when
 * my child turns 18, and what monthly SIP funds it?"
 *
 * Cost figures are INDICATIVE 2026 Tamil Nadu private-college estimates
 * (per-year tuition + typical fees). They age quickly — every stream shows its
 * source year and the UI offers a one-tap override with actual college quotes.
 * No live fee API exists (offline-first app); treat this as a dataset with a
 * yearly refresh line item, not ground truth.
 *
 * @module engine/streams
 */

import { getSipRequired } from './goals.js';

/**
 * Curated streams. todayAnnual = indicative annual cost in ₹ (sourceYear);
 * courseYears = program length; trend = annual fee-inflation assumption.
 */
export const STREAMS = [
  {
    id: 'arts',
    label: 'Arts & Humanities',
    examples: 'B.A. History, Literature, B.Com (aided/private)',
    todayAnnual: 60000,
    courseYears: 3,
    trend: 0.06,
    sourceYear: 2026,
  },
  {
    id: 'engineering',
    label: 'Engineering',
    examples: 'B.E./B.Tech, private TN college (incl. hostel avg)',
    todayAnnual: 220000,
    courseYears: 4,
    trend: 0.08,
    sourceYear: 2026,
  },
  {
    id: 'medical',
    label: 'Medical (MBBS)',
    examples: 'Private medical college, TN fee-committee slab avg',
    todayAnnual: 1800000,
    courseYears: 5.5,
    trend: 0.09,
    sourceYear: 2026,
  },
  {
    id: 'management',
    label: 'Management (MBA)',
    examples: 'Tier-2 B-school, 2-yr program after UG',
    todayAnnual: 300000,
    courseYears: 2,
    trend: 0.07,
    sourceYear: 2026,
  },
];

/**
 * Project the total program cost for a child starting in `yearsLeft` years.
 * Sums each course year grown by the stream trend:
 *   total = Σ todayAnnual × (1 + trend)^(yearsLeft + k), k = 0..courseYears-1
 * (fractional final year, e.g. MBBS 5.5, is prorated).
 *
 * @param {object} stream - One of STREAMS
 * @param {number} yearsLeft - Years until course entry (>= 0)
 * @param {number} [overrideAnnual] - User-quoted annual cost (₹), replaces dataset figure
 * @returns {{ total:number, entryYearAnnual:number, yearsLeft:number }}
 */
export function projectStreamCost(stream, yearsLeft, overrideAnnual) {
  const yl = Math.max(0, yearsLeft || 0);
  const annual = overrideAnnual > 0 ? overrideAnnual : stream.todayAnnual;
  const fullYears = Math.floor(stream.courseYears);
  const frac = stream.courseYears - fullYears;
  let total = 0;
  for (let k = 0; k < fullYears; k++) {
    total += annual * Math.pow(1 + stream.trend, yl + k);
  }
  if (frac > 0) {
    total += annual * frac * Math.pow(1 + stream.trend, yl + fullYears);
  }
  return {
    total: Math.round(total),
    entryYearAnnual: Math.round(annual * Math.pow(1 + stream.trend, yl)),
    yearsLeft: yl,
  };
}

/**
 * Monthly SIP needed from now to fund the projected total.
 *
 * @param {number} total - Projected program cost (₹)
 * @param {number} yearsLeft - Years until entry
 * @param {number} sipXirr - SIP return assumption (decimal)
 * @returns {number} Required monthly SIP (₹)
 */
export function streamSipRequired(total, yearsLeft, sipXirr) {
  return getSipRequired(total, sipXirr, Math.max(0, yearsLeft) * 12);
}

/**
 * Build the apply-payload + cost shift for a child adopting a stream.
 * Pure — the panel dispatches the payload and previews impact via
 * evaluateGoalTradeoff with the derived shift.
 *
 * @param {object} child - Child record ({ id, cAge, cCost, ... })
 * @param {number} projectedTotal - From projectStreamCost().total
 * @returns {{ childId:(string|number), cAge:number, cCost:number, costShift:number }}
 */
export function buildStreamScenario(child, projectedTotal) {
  const cCost = Math.max(0, Math.round(projectedTotal || 0));
  return {
    childId: child.id,
    cAge: child.cAge ?? 18,
    cCost,
    costShift: cCost - (child.cCost ?? 0),
  };
}
