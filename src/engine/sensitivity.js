/**
 * Sensitivity Tornado engine ("What breaks it") for TN Wealth Engine.
 *
 * Runs 5 one-factor shocks at reduced paths (300-500) using runMonteCarlo:
 * 1. Live +5y (life expectancy / end year + 5)
 * 2. Medical +2pp (medical inflation +2 percentage points)
 * 3. Equity −2pp (SIP XIRR −2 percentage points)
 * 4. Inflation +1pp (all inflation rates +1 percentage point)
 * 5. Cover (SIP) halved (monthly SIP contribution halved)
 *
 * @module engine/sensitivity
 */

import { runMonteCarlo } from './simulation.js';

export const SENSITIVITY_SHOCKS = [
  {
    id: 'live_extend',
    label: 'Live +5y',
    desc: 'Retirement horizon extended by 5 years',
    apply: (params, inflation) => ({
      params: { ...params, endYr: params.endYr + 5 },
      inflation: { ...inflation },
    }),
  },
  {
    id: 'medical_up',
    label: 'Medical +2pp',
    desc: 'Medical inflation +2 percentage points',
    apply: (params, inflation) => ({
      params: { ...params },
      inflation: {
        ...inflation,
        infMed: inflation.infMed + 0.02,
        infComposite: inflation.infComposite + 0.004,
      },
    }),
  },
  {
    id: 'equity_down',
    label: 'Equity −2pp',
    desc: 'SIP equity return −2 percentage points',
    apply: (params, inflation) => ({
      params: { ...params, sipXirr: Math.max(0, params.sipXirr - 0.02) },
      inflation: { ...inflation },
    }),
  },
  {
    id: 'inflation_up',
    label: 'Inflation +1pp',
    desc: 'Composite inflation +1 percentage point',
    apply: (params, inflation) => ({
      params: { ...params },
      inflation: {
        infLiving: inflation.infLiving + 0.01,
        infMed: inflation.infMed + 0.01,
        infEdu: inflation.infEdu + 0.01,
        infComposite: inflation.infComposite + 0.01,
      },
    }),
  },
  {
    id: 'cover_halved',
    label: 'Cover halved',
    desc: 'Monthly SIP contribution halved',
    apply: (params, inflation) => ({
      params: { ...params, sipMo: params.sipMo / 2 },
      inflation: { ...inflation },
    }),
  },
];

/**
 * Run one-factor sensitivity sweep across all 5 shocks.
 * Reuses runMonteCarlo at reduced paths.
 *
 * @param {object} params       Simulation params
 * @param {string} mode         'taps' | 'cps' | 'compare'
 * @param {object} inflation    Base inflation object
 * @param {object} withdrawals  Year-keyed goal withdrawals
 * @param {object} opts
 * @param {number} [opts.paths=400]   Reduced paths (300-500)
 * @param {string} [opts.mcMode='A']  MC mode
 * @param {number} [opts.rngSeed=77]  RNG seed for reproducibility
 * @returns {{ baseHolds: number, paths: number, shocks: Array }}
 */
export function runSensitivity(params, mode, inflation, withdrawals, opts = {}) {
  const {
    paths = 400,
    mcMode = 'A',
    rngSeed = 77,
  } = opts;

  const baseConfig = { runs: paths, mcMode, rngSeed };
  const baseResult = runMonteCarlo(params, mode, inflation, withdrawals, baseConfig);
  const baseHolds = baseResult.survivePct;

  const shocks = SENSITIVITY_SHOCKS.map((shock, idx) => {
    const { params: shockedParams, inflation: shockedInflation } = shock.apply(params, inflation);
    // Use the SAME seed as baseline (Common Random Numbers).
    // This ensures Δpp is purely due to the shock, not sampling noise.
    const shockConfig = { runs: paths, mcMode, rngSeed }; // same seed as base
    const shockResult = runMonteCarlo(shockedParams, mode, shockedInflation, withdrawals, shockConfig);
    const shockedHolds = shockResult.survivePct;
    const delta = shockedHolds - baseHolds;

    return {
      id: shock.id,
      label: shock.label,
      desc: shock.desc,
      baseHolds,
      shockedHolds,
      delta, // in percentage points
    };
  });

  // Sort shocks by delta ascending (most negative / damaging shock at top)
  shocks.sort((a, b) => a.delta - b.delta);

  return {
    baseHolds,
    paths,
    shocks,
  };
}
