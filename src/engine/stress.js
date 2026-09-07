/**
 * Stress-test engine for TN Wealth Engine.
 *
 * Applies 5 orthogonal regime overlays on top of the selected MC mode
 * and returns per-regime robustness stats, plus the interactive
 * what-if crash overlay (applyWhatIfCrash).
 *
 * Overlay logic is a pure function (applyRegimeOverlay) so it can be
 * unit-tested independently from the simulator.
 *
 * @module engine/stress
 */

import { runPath, percentile } from './simulation.js';
import { shockInflation } from './inflation.js';

// ---------------------------------------------------------------------------
// Regime descriptors (label shown in StressPanel, blurb shown as caption)
// ---------------------------------------------------------------------------
export const REGIMES = [
  {
    id: 'early_crash',
    label: 'Early Crash',
    blurb: 'Yr 1–2: SIP −30% / −8%, living inflation 8% / 7%',
  },
  {
    id: 'stagflation',
    label: 'Stagflation',
    blurb: 'Yrs 1–3: SIP XIRR −4 pp, all inflation +3 pp',
  },
  {
    id: 'lost_decade',
    label: 'Lost Decade',
    blurb: 'Yrs 1–10: SIP −5 pp, CPS rate −1 pp, inflation +1 pp',
  },
  {
    id: 'medical_shock',
    label: 'Medical-cost Shock',
    blurb: 'Medical inflation +2 pp all years (no hospital model)',
  },
  {
    id: 'retire_crash',
    label: 'Retirement Crash',
    blurb: 'rYr−1…rYr+1 (+fading yr): SIP −30% / −12%, post-ret growth halved, inflation +2 pp',
  },
];

/**
 * Crash presets for the interactive what-if overlay (depths as decimals).
 * Year stays user-picked; these only set the first-year depth.
 */
export const WHATIF_PRESETS = [
  { id: 'gfc2008', label: '2008', depth: 0.37 },
  { id: 'covid', label: 'COVID', depth: 0.23 },
  { id: 'dotcom', label: 'Dot-com', depth: 0.20 },
];

/**
 * Apply a regime overlay to the per-run sampled parameters.
 * Returns a new params-like object with modified XIRR / rates / inflation.
 *
 * @param {{sXirr:number, cRate:number, infL:number, infM:number, infE:number, infC:number}} p
 * @param {number} yearIdx  0-based absolute year index (accumulation i, drawdown accYears + j)
 * @param {string} regimeId  One of the REGIMES[].id values
 * @param {number} [anchorIdx=0]  Retirement-boundary index (accYears) for
 *   retirement-anchored regimes (retire_crash); ignored by the others
 * @returns {{sXirr:number, cRate:number, infL:number, infM:number, infE:number, infC:number, postRet?:number}}
 *   May include `postRet` to scale drawdown growth (see runPath).
 */
export function applyRegimeOverlay(p, yearIdx, regimeId, anchorIdx = 0) {
  let { sXirr, cRate, infL, infM, infE, infC } = p;

  switch (regimeId) {
    case 'early_crash':
      if (yearIdx === 0) { sXirr = -0.30; infL = 0.08; infC = Math.max(infC, 0.08); }
      if (yearIdx === 1) { sXirr = -0.08; infL = 0.07; infC = Math.max(infC, 0.07); }
      break;

    case 'stagflation':
      if (yearIdx < 3) {
        sXirr = Math.max(-0.10, sXirr - 0.04);
        infL  = infL  + 0.03;
        infM  = infM  + 0.03;
        infE  = infE  + 0.03;
        infC  = infC  + 0.03;
      }
      break;

    case 'lost_decade':
      if (yearIdx < 10) {
        sXirr = Math.max(-0.05, sXirr - 0.05);
        cRate = Math.max(0.03, cRate - 0.01);
        infL  = infL  + 0.01;
        infM  = infM  + 0.01;
        infE  = infE  + 0.01;
        infC  = infC  + 0.01;
      }
      break;

    case 'medical_shock':
      infM = infM + 0.02;
      // Composite nudged proportionally (medShare ~20–30%)
      infC = infC + 0.006;
      break;

    case 'retire_crash': {
      // Retirement-boundary crash, anchored at anchorIdx (= accYears):
      // d=-1 last accumulation year, d=0 retirement year, d=+1 first drawdown year.
      const d = yearIdx - anchorIdx;
      if (d === -1) {
        sXirr = -0.30;
        infL = infL + 0.02; infC = infC + 0.02;
      } else if (d === 0) {
        sXirr = -0.12;
        infL = infL + 0.02; infC = infC + 0.02;
      } else if (d === 1) {
        // sXirr is inert in drawdown (growth uses postRet) — bleed via growth + inflation.
        infL = infL + 0.02; infC = infC + 0.02;
        return { sXirr, cRate, infL, infM, infE, infC, postRet: 'halve' };
      } else if (d === 2) {
        // Fading aftershock: quarter-pace growth for one more year.
        return { sXirr, cRate, infL, infM, infE, infC, postRet: 'quarter' };
      }
      break;
    }

    default:
      break;
  }

  return { sXirr, cRate, infL, infM, infE, infC };
}

/**
 * Terminal fall of a shocked trajectory vs a baseline, in percent.
 * Matches by calendar year on the overlapping tail and compares the last
 * common point (typically the terminal corpus): (shock − base) / base × 100.
 *
 * @param {Array<{yr:number, tot:number}>} baseRecords - Baseline records
 * @param {Array<{yr:number}>} shockSeries - Shocked series with a numeric value under valueKey
 * @param {string} [valueKey='tot'] - Key holding the shocked total per year
 * @returns {{ fallPct:number|null, baseTerm:number|null, shockTerm:number|null }}
 */
export function terminalFallPct(baseRecords, shockSeries, valueKey = 'tot') {
  if (!baseRecords?.length || !shockSeries?.length) {
    return { fallPct: null, baseTerm: null, shockTerm: null };
  }
  const baseByYear = new Map(baseRecords.map((r) => [r.yr, r.tot]));
  let baseTerm = null;
  let shockTerm = null;
  for (const p of shockSeries) {
    const b = baseByYear.get(p.yr);
    if (b != null && p[valueKey] != null) {
      baseTerm = b;
      shockTerm = p[valueKey];
    }
  }
  if (baseTerm == null || shockTerm == null || baseTerm === 0) {
    return { fallPct: null, baseTerm, shockTerm };
  }
  return { fallPct: ((shockTerm - baseTerm) / baseTerm) * 100, baseTerm, shockTerm };
}

/**
 * Interactive what-if crash overlay (user-picked year + depth).
 * Pure function — same overlay contract as applyRegimeOverlay.
 *
 * @param {{sXirr:number, cRate:number, infL:number, infM:number, infE:number, infC:number}} p
 * @param {number} yearIdx  Absolute year index
 * @param {{ crashIdx:number, depth:number }} spec  depth as decimal (0.37 = −37%)
 * @returns same shape as input (may include `postRet` directive — see below)
 *
 * NOTE: drawdown `postRet` directives ('halve' — growth halves while the shock
 * window covers a drawdown year) are symbolic; runPath resolves them against
 * params.postRetRate. This keeps overlays pure and independent of params.
 */
export function applyWhatIfCrash(p, yearIdx, { crashIdx, depth }) {
  const d = Math.max(0.05, Math.min(0.6, depth || 0));
  let { sXirr, cRate, infL, infM, infE, infC } = p;

  if (yearIdx === crashIdx) {
    sXirr = -d;
    infL = infL + 0.02; infC = infC + 0.02;
  } else if (yearIdx === crashIdx + 1) {
    // Echo year (mirrors early_crash shape): half depth, mild inflation.
    sXirr = Math.max(-0.10, p.sXirr - d / 2);
    infL = infL + 0.01; infC = infC + 0.01;
  } else {
    return { sXirr, cRate, infL, infM, infE, infC };
  }
  // If the crash year falls in drawdown, sXirr is inert there — bleed via growth.
  return { sXirr, cRate, infL, infM, infE, infC, postRet: 'halve' };
}

/**
 * Run all 5 stress regimes using reduced paths.
 *
 * @param {object}   params       Simulation params (same shape as runMonteCarlo)
 * @param {string}   mode         'taps' | 'cps' | 'compare'
 * @param {object}   inflation    Base inflation object (infLiving, infMed, infEdu, infComposite)
 * @param {object}   withdrawals  Year-keyed goal withdrawal map (net of LTCG)
 * @param {object}   opts
 * @param {number}   [opts.paths=400]   Paths per regime
 * @param {string}   [opts.mcMode='A']  MC sampling breadth
 * @param {number}   [opts.rngSeed=99]  Separate seed so stress results are independent
 * @param {object}   [opts.wTaxDraws=null]  Year-keyed goal LTCG map (pairs with withdrawals)
 * @param {Function} [opts.sampleParams]  Optional sampler override (for testing)
 * @returns {Array<{regime, holdsPct, shortYrsP50, bequestP10, exhaustPct}>}
 */
export function runStressPanel(params, mode, inflation, withdrawals, opts = {}) {
  const {
    paths: nPaths = 400,
    mcMode = 'A',
    rngSeed = 99,
    wTaxDraws = null,
    sampleParams,
  } = opts;

  // Retirement-boundary anchor for retirement-anchored regimes
  // (accumulation loop runs i=0..accYears, so rYr is at index accYears).
  const anchorIdx = Math.max(0, (params.rYr ?? 0) - (params.bYr ?? 0));

  return REGIMES.map((regime) => {
    const results = [];

    // Simple mulberry32 for per-regime reproducibility
    let seed = rngSeed ^ regime.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const randnLocal = () => {
      let u = 0, v = 0;
      while (!u) u = rng();
      while (!v) v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    for (let r = 0; r < nPaths; r++) {
      // Base MC sampling (mirrors runMonteCarlo logic)
      let sXirr = params.sipXirr;
      let cRate  = params.cpsRate;
      let infL   = inflation.infLiving;
      let infM   = inflation.infMed;
      let infE   = inflation.infEdu;
      let infC   = inflation.infComposite;

      sXirr = clamp(params.sipXirr + randnLocal() * 0.035, 0.02, 0.22);

      if (mcMode === 'B' || mcMode === 'C') {
        const shock = randnLocal() * 0.012;
        const shocked = shockInflation(inflation, shock);
        infL = shocked.infLiving;
        infM = shocked.infMed;
        infE = shocked.infEdu;
        infC = shocked.infComposite;
      }

      if (mcMode === 'C') {
        cRate = clamp(params.cpsRate + randnLocal() * 0.008, 0.04, 0.12);
      }

      if (sampleParams) {
        ({ sXirr, cRate, infL, infM, infE, infC } = sampleParams(r));
      }

      // Base (per-path sampled) rates, captured for the overlay closure
      const baseRates = { sXirr, cRate, infL, infM, infE, infC };

      // Per-year overlay: applies the regime only during its labeled window.
      // applyRegimeOverlay already gates on yearIdx so post-window years
      // return rates unchanged — no more whole-horizon application.
      // anchorIdx positions retirement-anchored regimes (retire_crash).
      const yearlyOverlay = (rates, yearIdx) =>
        applyRegimeOverlay(
          // Merge the sampled MC base rates with the overlay (not raw params)
          { ...baseRates },
          yearIdx,
          regime.id,
          anchorIdx
        );

      const res = runPath(
        params,
        mode,
        baseRates.cRate,
        baseRates.sXirr,
        baseRates.infL,
        baseRates.infM,
        baseRates.infE,
        baseRates.infC,
        withdrawals,
        yearlyOverlay,   // ← proper per-year callback
        wTaxDraws        // ← year-exact goal LTCG pairing
      );

      results.push(res);
    }

    const survive    = results.filter(r => !r.depletedYear).length;
    const holdsPct   = (survive / nPaths) * 100;
    const exhaustPct = 100 - holdsPct;

    const shortYrArr  = results.map(r => r.shortYears).sort((a, b) => a - b);
    const shortYrsP50 = percentile(shortYrArr, 0.5);

    const bqReals  = results.map(r => r.bequestReal).sort((a, b) => a - b);
    const bequestP10 = percentile(bqReals, 0.1);
    const bequestP50 = percentile(bqReals, 0.5);

    return {
      regime,
      holdsPct,
      exhaustPct,
      shortYrsP50,
      bequestP10,
      bequestP50,
    };
  });
}
