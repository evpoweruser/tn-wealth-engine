/**
 * TN Wealth Score (0–100) — single-number financial health index.
 *
 *   Health Score = 0.40·SurvivePct + 0.25·NeverShortPct
 *                + 0.20·SRR Resilience + 0.15·Tax Efficiency
 *
 * - SurvivePct / NeverShortPct come straight from the Monte Carlo aggregates.
 * - SRR Resilience: worst liquid level over the first 5 drawdown years of the
 *   median path, as a share of liquid at retirement (sequence-of-returns dip).
 * - Tax Efficiency: lifetime real tax burden vs retirement wealth —
 *   100·(1 − tax/(wealth + tax)).
 *
 * All parts are 0–100 clamped so the score is always a valid index.
 *
 * @module engine/score
 */

function clamp100(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

/**
 * Sequence-of-returns resilience from median-path drawdown records.
 *
 * @param {Array<object>} records - Median path records ({ phase, liquid })
 * @param {number} liquidStart - Liquid corpus at retirement (₹ Cr)
 * @returns {number} 0–100
 */
export function computeSrrResilience(records, liquidStart) {
  const draw = (records || []).filter((r) => r.phase === 'draw').slice(0, 5);
  if (!draw.length || !(liquidStart > 0)) return 100;
  const minLiq = Math.min(...draw.map((r) => r.liquid ?? 0));
  return clamp100((minLiq / liquidStart) * 100);
}

/**
 * Tax efficiency from lifetime real tax vs retirement wealth.
 *
 * @param {number} taxP50 - Median lifetime real tax (₹)
 * @param {number} wealthAtRetire - Total wealth at retirement (₹)
 * @returns {number} 0–100
 */
export function computeTaxEfficiency(taxP50, wealthAtRetire) {
  const t = Number(taxP50) || 0;
  const w = Number(wealthAtRetire) || 0;
  if (w <= 0) return t <= 0 ? 100 : 0;
  return clamp100((1 - t / (w + t)) * 100);
}

/**
 * Compute the full health score from headline simulation results.
 *
 * @param {object} results - Headline results ({ survivePct, neverShortPct,
 *   taxP50, mid: { records, totalWealthAtRetire, liquidStart } })
 * @returns {{ score:number, parts:{ survive:number, neverShort:number, srr:number, taxEff:number } }}
 */
export function computeHealthScore(results) {
  const survive = clamp100(results?.survivePct ?? 0);
  const neverShort = clamp100(results?.neverShortPct ?? 0);
  const mid = results?.mid || {};
  // NB: records store liquid in ₹ Cr while liquidStart is in ₹ — normalize.
  const srr = computeSrrResilience(mid.records, (mid.liquidStart || 0) / 1e7);
  const taxEff = computeTaxEfficiency(
    results?.taxP50,
    mid.totalWealthAtRetire || mid.liquidStart || 0
  );
  const score = Math.round(0.4 * survive + 0.25 * neverShort + 0.2 * srr + 0.15 * taxEff);
  return { score: clamp100(score), parts: { survive, neverShort, srr, taxEff } };
}

/**
 * 1-click recommendations targeting the weakest score parts.
 * Each entry is either an applicable state action or a tip (action: null).
 *
 * @param {object} state - Raw engine context state (display units)
 * @param {{ survive:number, neverShort:number, srr:number, taxEff:number }} parts
 * @returns {Array<{ id:string, label:string, detail:string, action:object|null }>} ≤3 items
 */
export function recommendScoreActions(state, parts) {
  if (!state || !parts) return [];
  const recs = [];
  const sipMo = Number(state.sipMo) || 0;
  const sipStep = Number(state.sipStep) || 0;
  const retSpend = Number(state.retSpend) || 0;

  const ranked = [
    ['survive', parts.survive],
    ['neverShort', parts.neverShort],
    ['srr', parts.srr],
    ['taxEff', parts.taxEff],
  ].sort((a, b) => a[1] - b[1]);

  for (const [key] of ranked) {
    if (recs.length >= 3) break;
    if (key === 'survive' && parts.survive < 99) {
      recs.push({
        id: 'raise-sip',
        label: `Raise monthly SIP to ${sipMo + 2000}`,
        detail: 'Lifts plan survival directly',
        action: { type: 'SET_FIELD', field: 'sipMo', value: sipMo + 2000 },
      });
    } else if (key === 'neverShort' && parts.neverShort < 90) {
      recs.push({
        id: 'trim-spend',
        label: `Trim retirement spend to ${Math.max(5000, retSpend - 2000)}`,
        detail: 'Fewer shortfall years across paths',
        action: { type: 'SET_FIELD', field: 'retSpend', value: Math.max(5000, retSpend - 2000) },
      });
    } else if (key === 'srr' && parts.srr < 80) {
      recs.push({
        id: 'raise-stepup',
        label: `Raise SIP step-up to ${(sipStep + 1).toFixed(1)}%`,
        detail: 'Bigger early corpus cushions bad early years',
        action: { type: 'SET_FIELD', field: 'sipStep', value: sipStep + 1 },
      });
    } else if (key === 'taxEff' && parts.taxEff < 85) {
      recs.push({
        id: 'tax-tip',
        label: 'Split withdrawals across family PANs',
        detail: 'Dual-PAN modeling is on the roadmap — sizes lower slab drag',
        action: null,
      });
    }
  }
  return recs;
}
