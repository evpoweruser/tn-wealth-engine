/**
 * Stress-test engine for TN Wealth Engine.
 *
 * Applies 4 orthogonal regime overlays on top of the selected MC mode
 * and returns per-regime robustness stats.
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
];

/**
 * Apply a regime overlay to the per-run sampled parameters.
 * Returns a new params-like object with modified XIRR / rates / inflation.
 *
 * @param {{sXirr:number, cRate:number, infL:number, infM:number, infE:number, infC:number}} p
 * @param {number} yearIdx  0-based accumulation year index (for time-limited overlays)
 * @param {string} regimeId  One of the REGIMES[].id values
 * @returns {{sXirr:number, cRate:number, infL:number, infM:number, infE:number, infC:number}}
 */
export function applyRegimeOverlay(p, yearIdx, regimeId) {
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

    default:
      break;
  }

  return { sXirr, cRate, infL, infM, infE, infC };
}

/**
 * Run all 4 stress regimes using reduced paths.
 *
 * @param {object}   params       Simulation params (same shape as runMonteCarlo)
 * @param {string}   mode         'taps' | 'cps' | 'compare'
 * @param {object}   inflation    Base inflation object (infLiving, infMed, infEdu, infComposite)
 * @param {object}   withdrawals  Year-keyed goal withdrawal map
 * @param {object}   opts
 * @param {number}   [opts.paths=400]   Paths per regime
 * @param {string}   [opts.mcMode='A']  MC sampling breadth
 * @param {number}   [opts.rngSeed=99]  Separate seed so stress results are independent
 * @param {Function} [opts.sampleParams]  Optional sampler override (for testing)
 * @returns {Array<{regime, holdsPct, shortYrsP50, bequestP10, exhaustPct}>}
 */
export function runStressPanel(params, mode, inflation, withdrawals, opts = {}) {
  const {
    paths: nPaths = 400,
    mcMode = 'A',
    rngSeed = 99,
    sampleParams,
  } = opts;

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
      const yearlyOverlay = (rates, yearIdx) =>
        applyRegimeOverlay(
          // Merge the sampled MC base rates with the overlay (not raw params)
          { ...baseRates },
          yearIdx,
          regime.id
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
        yearlyOverlay   // ← proper per-year callback
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
