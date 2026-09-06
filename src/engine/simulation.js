/**
 * Core simulation engine.
 * Runs deterministic paths and Monte Carlo simulations for retirement planning.
 * @module engine/simulation
 */

import { shockInflation } from './inflation.js';
import { pensionTaxForYear } from './tax.js';

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
 * @param {object} [wDraws]      Year-keyed goal withdrawal map
  * @param {Function} [yearlyOverlay]  Optional per-year rate modifier:
  *   (rates: {sXirr, cRate, infL, infM, infE, infC}, yearIdx: number) => same shape.
  *   Called at the start of each accumulation and drawdown year. yearIdx is the
  *   absolute year index (0-based from the base year): accumulation year i,
  *   drawdown year accYears + j. Return rates are used for that year only.
 */
export function runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, wDraws, yearlyOverlay) {
  let cpsAnn = params.cpsAnn;
  let sipMo = params.sipMo;
  let cpsBal = params.cpsBal;
  let sipBal = 0;
  const accYears = Math.max(0, params.rYr - params.bYr);
  const records = [];

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

    // Withdraw for goals funded from SIP corpus
    if (wDraws && wDraws[yr] && wDraws[yr] > 0) {
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
  const liquidStart = liquid;

  // === DRAWDOWN PHASE ===
  const drawdownYears = Math.max(0, params.endYr - params.rYr);
  let depletedYear = null;
  let pension = monthlyPension;

  // --- Robustness accumulators ---
  let shortYears = 0;          // count of years where liquid hits 0
  let firstShortYear = null;   // first such year
  let taxNominal = 0;          // Σ annual pension tax (nominal ₹)
  let taxReal    = 0;          // Σ annual pension tax deflated to today's ₹ (per-year, exact)
  let lifetimeMedSpendNominal = 0; // stub – medical spend (future feature)

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
    cumInfM *= (1 + yInfM);
    cumInfC *= (1 + yInfC);

    if (mode === 'taps') {
      pension = tapsP * (cumInfC / cumInfCAtRetire);
    }

    const medExp = params.retSpend * params.medShare * cumInfM;
    const livExp = params.retSpend * (1 - params.medShare) * cumInfL;
    const monthlyExp = medExp + livExp;
    lifetimeMedSpendNominal += medExp * 12;

    const netDrawdown = Math.max(0, monthlyExp - pension);

    // Simplified pension tax: annualise monthly pension for slab lookup
    const annualPension = pension * 12;
    const yearTaxNominal = pensionTaxForYear(annualPension);
    taxNominal += yearTaxNominal;
    // Per-year deflation (exact): discount each year's tax by exact cumulative inflation
    taxReal += yearTaxNominal / cumInfC;

    for (let mm = 0; mm < 12; mm++) {
      liquid = liquid * (1 + params.postRetRate / 12) - netDrawdown;
      if (liquid <= 0) {
        liquid = 0;
        if (!depletedYear) depletedYear = yr;
        break;
      }
    }

    // Deduct post-retirement lump-sum milestone goal if due this year
    if (wDraws && wDraws[yr] && wDraws[yr] > 0) {
      liquid = Math.max(0, liquid - wDraws[yr]);
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
    });
  }

  // Bequest: terminal record values
  const termRec = records[records.length - 1];
  const bequestNominal = termRec ? termRec.tot * 1e7 : 0;
  const bequestReal    = termRec ? termRec.real * 1e7 : 0;

  // Add goals LTCG to real tax (informational — goal tax is already embedded in
  // grossFV withdrawals, so this is display-only, not a double-deduction).
  const goalsLtcgNominal = params.goalsLtcgNominal || 0;
  // Goals LTCG is spread across accumulation years; discount at midpoint
  const goalsLtcgReal = goalsLtcgNominal / Math.pow(1 + infC, accYears / 2);
  taxReal += goalsLtcgReal;

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
export function runMonteCarlo(params, mode, inflation, withdrawals, mcConfig) {
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

    const res = runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, withdrawals);
    paths.push(res);
    if (!res.depletedYear) survive++;
  }

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
