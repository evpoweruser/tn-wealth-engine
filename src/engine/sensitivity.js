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
    friendlyLabel: 'Live 5 years longer',
    desc: 'Retirement horizon extended by 5 years',
    friendlyDesc: 'What if you need money until age 90?',
    suggestion: {
      icon: '🕐',
      headline: 'Build a bigger longevity buffer',
      body: 'Consider increasing your SIP or reducing planned retirement spend to ensure your money outlasts you.',
    },
    apply: (params, inflation) => ({
      params: { ...params, endYr: params.endYr + 5 },
      inflation: { ...inflation },
    }),
  },
  {
    id: 'medical_up',
    label: 'Medical +2pp',
    friendlyLabel: 'Healthcare costs surge',
    desc: 'Medical inflation +2 percentage points',
    friendlyDesc: 'Medical expenses rise 2% faster than expected',
    suggestion: {
      icon: '🏥',
      headline: 'Get a super top-up health insurance',
      body: 'A ₹25–50 Lakh super top-up costs just ₹5k–12k/yr and shields your corpus from medical inflation.',
    },
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
    friendlyLabel: 'Market returns drop',
    desc: 'SIP equity return −2 percentage points',
    friendlyDesc: 'Your investments earn 2% less per year',
    suggestion: {
      icon: '📉',
      headline: 'Diversify across asset classes',
      body: 'Consider adding debt funds, NPS Tier-1, or PPF for stability. Avoid concentrating more than 70% in equity.',
    },
    apply: (params, inflation) => ({
      params: { ...params, sipXirr: Math.max(0, params.sipXirr - 0.02) },
      inflation: { ...inflation },
    }),
  },
  {
    id: 'inflation_up',
    label: 'Inflation +1pp',
    friendlyLabel: 'Everything costs more',
    desc: 'Composite inflation +1 percentage point',
    friendlyDesc: 'Prices rise 1% faster across the board',
    suggestion: {
      icon: '💰',
      headline: 'Add inflation-protected instruments',
      body: 'Lock a portion of your corpus in RBI Floating Rate Bonds, PPF, or Sovereign Gold Bonds to hedge against rising prices.',
    },
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
    friendlyLabel: 'You invest half as much',
    desc: 'Monthly SIP contribution halved',
    friendlyDesc: 'Your monthly investment drops by 50%',
    suggestion: {
      icon: '📊',
      headline: 'Automate your SIP via bank mandate',
      body: 'Set up auto-debit so your SIP continues uninterrupted. Even a 10% annual step-up compounds massively over decades.',
    },
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
 * @returns {{ baseHolds: number, baseBequestP50: number, paths: number, shocks: Array }}
 *   Each shock: { id, label, desc, baseHolds, shockedHolds, delta,
 *   baseBequestP50, bequestP50 } — bequests are median real ₹ (for ₹ impact cards).
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
  const baseBequestP50 = baseResult.bequestP50 ?? 0;

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
      friendlyLabel: shock.friendlyLabel,
      desc: shock.desc,
      friendlyDesc: shock.friendlyDesc,
      suggestion: shock.suggestion,
      baseHolds,
      shockedHolds,
      delta, // in percentage points
      baseBequestP50,
      bequestP50: shockResult.bequestP50 ?? 0, // median real ₹
    };
  });

  // Sort shocks by delta ascending (most negative / damaging shock at top)
  shocks.sort((a, b) => a.delta - b.delta);

  return {
    baseHolds,
    baseBequestP50,
    paths,
    shocks,
  };
}
