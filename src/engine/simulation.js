/**
 * Core simulation engine.
 * Runs deterministic paths and Monte Carlo simulations for retirement planning.
 * @module engine/simulation
 */

import { shockInflation } from './inflation.js';

/**
 * Box-Muller transform to generate standard normal random deviates.
 * @returns {number} A sample from N(0,1)
 */
export function randn() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Compute a percentile from a sorted array.
 * @param {number[]} sorted - Sorted array of values
 * @param {number} q - Quantile (0-1)
 * @returns {number}
 */
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

/**
 * Run a single deterministic simulation path.
 *
 * @param {Object} params - Simulation parameters (all rates as decimals)
 * @param {number} params.bYr - Base year (current year)
 * @param {number} params.rYr - Retirement year
 * @param {number} params.endYr - End year (life expectancy)
 * @param {number} params.currentAge - Current age
 * @param {Object<number, number>} params.pcs - Pay commission years and bumps
 * @param {number} params.cpsBal - Current CPS balance
 * @param {number} params.cpsAnn - Current annual CPS contribution
 * @param {number} params.cpsInc - Annual increment rate (decimal, e.g., 0.03)
 * @param {number} params.annPct - Annuity percentage (0-100)
 * @param {number} params.annYield - Annuity yield rate (decimal, e.g., 0.065)
 * @param {number} params.gratuity - Gratuity amount
 * @param {number} params.postRetRate - Post-retirement return (decimal, e.g., 0.075)
 * @param {number} params.retSpend - Monthly retirement spend
 * @param {number} params.medShare - Medical share (decimal, e.g., 0.2)
 * @param {number} params.sipMo - Monthly SIP amount
 * @param {number} params.sipStep - SIP step-up rate (decimal, e.g., 0.03)
 * @param {Object} params.lastPay - { basic, da, emoluments, tapsPension }
 * @param {string} mode - 'taps' or 'cps'
 * @param {number} cRate - CPS return rate (decimal)
 * @param {number} sXirr - SIP XIRR (decimal)
 * @param {number} infL - Living inflation rate (decimal)
 * @param {number} infM - Medical inflation rate (decimal)
 * @param {number} infE - Education inflation rate (decimal)
 * @param {number} infC - Composite inflation rate (decimal)
 * @param {Object<number, number>} wDraws - Withdrawal schedule by year
 * @returns {Object} Simulation results
 */
export function runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, wDraws) {
  let cpsAnn = params.cpsAnn;
  let sipMo = params.sipMo;
  let cpsBal = params.cpsBal;
  let sipBal = 0;

  const accYears = Math.max(0, params.rYr - params.bYr);
  const records = [];
  const monthlyR = Math.pow(1 + cRate, 1 / 12) - 1;

  // === ACCUMULATION PHASE ===
  for (let i = 0; i <= accYears; i++) {
    const yr = params.bYr + i;

    if (i > 0) {
      cpsAnn *= 1 + params.cpsInc;
      if (params.pcs[yr]) cpsAnn *= 1 + params.pcs[yr];
      sipMo *= 1 + params.sipStep;
    }

    // CPS: compound monthly for 12 months
    for (let mm = 0; mm < 12; mm++) {
      cpsBal = cpsBal * (1 + monthlyR) + (cpsAnn / 12);
    }

    // SIP: compound monthly for 12 months
    for (let mm = 0; mm < 12; mm++) {
      sipBal = (sipBal + sipMo) * (1 + sXirr / 12);
    }

    // Withdraw for goals funded from SIP corpus
    if (wDraws[yr] && wDraws[yr] > 0) {
      sipBal = Math.max(0, sipBal - wDraws[yr]);
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
      real: (total / Math.pow(1 + infC, i)) / 1e7,
      pension: 0,
    });
  }

  // === RETIREMENT TRANSITION ===
  const finCPS = cpsBal;
  const lp = params.lastPay || { tapsPension: 0, emoluments: 0 };
  const tapsP = lp.tapsPension || 0;

  let annuityCorpus = 0;
  let cpsPension = 0;
  if (mode === 'cps' && params.annPct > 0) {
    annuityCorpus = finCPS * (params.annPct / 100);
    cpsPension = (annuityCorpus * params.annYield) / 12;
  }

  const monthlyPension = mode === 'taps' ? tapsP : cpsPension;
  const residual = mode === 'taps' ? 0 : Math.max(0, finCPS - annuityCorpus);
  let liquid = residual + sipBal + params.gratuity;
  const liquidStart = liquid;

  // === DRAWDOWN PHASE ===
  const drawdownYears = Math.max(0, params.endYr - params.rYr);
  let depletedYear = null;
  let pension = monthlyPension;

  for (let j = 1; j <= drawdownYears; j++) {
    const yr = params.rYr + j;
    const elapsed = accYears + j;

    // TAPS pension grows with composite inflation (DA parity approximation)
    if (mode === 'taps') {
      pension = tapsP * Math.pow(1 + infC, j);
    }

    // Monthly expenses: medical + living portions inflate separately
    const medExp = params.retSpend * params.medShare * Math.pow(1 + infM, elapsed);
    const livExp = params.retSpend * (1 - params.medShare) * Math.pow(1 + infL, elapsed);
    const monthlyExp = medExp + livExp;

    // Net drawdown after pension
    const netDrawdown = Math.max(0, monthlyExp - pension);

    // Monthly drawdown with returns
    for (let mm = 0; mm < 12; mm++) {
      liquid = liquid * (1 + params.postRetRate / 12) - netDrawdown;
      if (liquid <= 0) {
        liquid = 0;
        if (!depletedYear) depletedYear = yr;
        break;
      }
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
      real: (totalValue / Math.pow(1 + infC, elapsed)) / 1e7,
      pension,
      depleted: liquid === 0,
    });
  }

  return {
    records,
    finCPS,
    annuityCorpus,
    monthlyPension,
    tapsPension: tapsP,
    liquidStart,
    depletedYear,
    mode,
    lastEmol: lp.emoluments || 0,
  };
}

/**
 * Run Monte Carlo simulation.
 * @param {Object} params - Simulation parameters
 * @param {string} mode - 'taps' or 'cps'
 * @param {Object} inflation - Full inflation data from computeInflation()
 * @param {Object} withdrawals - Withdrawal schedule
 * @param {Object} mcConfig - { runs: number, mcMode: 'A'|'B'|'C' }
 * @returns {Object} MC results with percentile bands
 */
export function runMonteCarlo(params, mode, inflation, withdrawals, mcConfig) {
  const { runs = 1000, mcMode = 'A' } = mcConfig;
  const paths = [];
  let survive = 0;

  for (let r = 0; r < runs; r++) {
    let sXirr = params.sipXirr;
    let cRate = params.cpsRate;
    let infL = inflation.infLiving;
    let infM = inflation.infMed;
    let infE = inflation.infEdu;
    let infC = inflation.infComposite;

    // Mode A: SIP XIRR shock
    sXirr = clamp(params.sipXirr + randn() * 0.035, 0.02, 0.22);

    // Mode B: + Inflation shock
    if (mcMode === 'B' || mcMode === 'C') {
      const shock = randn() * 0.012;
      const shocked = shockInflation(inflation, shock);
      infL = shocked.infLiving;
      infM = shocked.infMed;
      infE = shocked.infEdu;
      infC = shocked.infComposite;
    }

    // Mode C: + CPS rate shock
    if (mcMode === 'C') {
      cRate = clamp(params.cpsRate + randn() * 0.008, 0.04, 0.12);
    }

    const res = runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, withdrawals);
    paths.push(res);
    if (!res.depletedYear) survive++;
  }

  // Extract percentile bands
  const nY = paths[0].records.length;
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
  const retTots = paths.map(x => x.records[ri >= 0 ? ri : x.records.length - 1].tot).sort((a, b) => a - b);
  const liquidStarts = paths.map(x => x.liquidStart).sort((a, b) => a - b);
  const medFinCPS = paths.map(x => x.finCPS).sort((a, b) => a - b)[Math.floor(runs / 2)] || 0;

  return {
    low: { records: low },
    high: { records: high },
    mid: {
      records: mid,
      finCPS: medFinCPS,
      annuityCorpus: paths[0].annuityCorpus,
      monthlyPension: paths[0].monthlyPension,
      tapsPension: paths[0].tapsPension,
      liquidStart: percentile(liquidStarts, 0.5),
      depletedYear: null,
      mode,
      lastEmol: paths[0].lastEmol,
    },
    survivePct: (survive / runs) * 100,
    retP10: percentile(retTots, 0.1) * 1e7,
    retP90: percentile(retTots, 0.9) * 1e7,
    retMed: percentile(retTots, 0.5) * 1e7,
  };
}
