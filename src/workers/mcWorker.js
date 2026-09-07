import { runPath, randn, percentile } from '../engine/simulation.js';
import { shockInflation } from '../engine/inflation.js';

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

self.onmessage = function(e) {
  const { params, mode, inflation, withdrawals, mcConfig, wTaxDraws = null } = e.data;
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
    if (mcMode === 'A' || mcMode === 'B' || mcMode === 'C') {
        sXirr = clamp(params.sipXirr + randn() * 0.035, 0.02, 0.22);
    }
    
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
    
    const res = runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, withdrawals, undefined, wTaxDraws);
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
  
  // Retirement-year percentiles
  const ri = paths[0].records.findIndex(r => r.yr === params.rYr);
  const retTots = paths.map(x => x.records[ri >= 0 ? ri : x.records.length - 1].tot).sort((a, b) => a - b);
  const liquidStarts = paths.map(x => x.liquidStart).sort((a, b) => a - b);
  const totalWealths = paths.map(x => x.totalWealthAtRetire).sort((a, b) => a - b);
  const realWealths  = paths.map(x => x.realWealthAtRetire).sort((a, b) => a - b);
  const medFinCPS = paths.map(x => x.finCPS).sort((a, b) => a - b)[Math.floor(runs / 2)] || 0;

  // --- Robustness aggregations (mirrors runMonteCarlo in simulation.js) ---
  const neverShortPct = (paths.filter(p => p.shortYears === 0).length / runs) * 100;
  const exhaustPct    = 100 - (survive / runs) * 100;
  const depYears = paths.filter(p => p.depletedYear !== null).map(p => p.depletedYear).sort((a, b) => a - b);
  const deplYearMed = depYears.length ? depYears[Math.floor(depYears.length / 2)] : null;
  const bqReals = paths.map(p => p.bequestReal).sort((a, b) => a - b);
  const taxReals = paths.map(p => p.taxReal).sort((a, b) => a - b);
  const shortYrArr = paths.map(p => p.shortYears).sort((a, b) => a - b);

  self.postMessage({
    low: { records: low },
    high: { records: high },
    mid: {
      records: mid,
      finCPS: medFinCPS,
      annuityCorpus: paths[0].annuityCorpus,
      monthlyPension: paths[0].monthlyPension,
      tapsPension: paths[0].tapsPension,
      familyPension: paths[0].familyPension || 0,
      liquidStart: percentile(liquidStarts, 0.5),
      totalWealthAtRetire: percentile(totalWealths, 0.5),
      realWealthAtRetire: percentile(realWealths, 0.5),
      depletedYear: deplYearMed,  // was hardcoded null — now matches main-thread logic
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
    bequestP10: percentile(bqReals, 0.1),
    bequestP50: percentile(bqReals, 0.5),
    taxP50: percentile(taxReals, 0.5),
    shortYrsP50: percentile(shortYrArr, 0.5),
  });
};
