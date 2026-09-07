import { describe, it, expect } from 'vitest';
import { applyRegimeOverlay, applyWhatIfCrash, terminalFallPct, WHATIF_PRESETS, REGIMES, runStressPanel } from '../stress.js';

// ── applyRegimeOverlay tests ─────────────────────────────────────────────────

const baseP = { sXirr: 0.10, cRate: 0.071, infL: 0.045, infM: 0.07, infE: 0.08, infC: 0.05 };

describe('applyRegimeOverlay — early_crash', () => {
  it('yr 0: SIP forced to −30%, living inf 8%', () => {
    const out = applyRegimeOverlay(baseP, 0, 'early_crash');
    expect(out.sXirr).toBe(-0.30);
    expect(out.infL).toBe(0.08);
  });

  it('yr 1: SIP forced to −8%, living inf 7%', () => {
    const out = applyRegimeOverlay(baseP, 1, 'early_crash');
    expect(out.sXirr).toBe(-0.08);
    expect(out.infL).toBe(0.07);
  });

  it('yr 2: no overlay — values unchanged', () => {
    const out = applyRegimeOverlay(baseP, 2, 'early_crash');
    expect(out.sXirr).toBeCloseTo(baseP.sXirr);
    expect(out.infL).toBeCloseTo(baseP.infL);
  });

  it('cRate unchanged in early_crash', () => {
    const out = applyRegimeOverlay(baseP, 0, 'early_crash');
    expect(out.cRate).toBeCloseTo(baseP.cRate);
  });
});

describe('applyRegimeOverlay — stagflation', () => {
  it('yr 0: SIP −4pp, all inflation +3pp', () => {
    const out = applyRegimeOverlay(baseP, 0, 'stagflation');
    expect(out.sXirr).toBeCloseTo(baseP.sXirr - 0.04, 10);
    expect(out.infL).toBeCloseTo(baseP.infL + 0.03, 10);
    expect(out.infM).toBeCloseTo(baseP.infM + 0.03, 10);
    expect(out.infC).toBeCloseTo(baseP.infC + 0.03, 10);
  });

  it('yr 2: still within 3-year window', () => {
    const out = applyRegimeOverlay(baseP, 2, 'stagflation');
    expect(out.infL).toBeCloseTo(baseP.infL + 0.03, 10);
  });

  it('yr 3: outside window — no overlay', () => {
    const out = applyRegimeOverlay(baseP, 3, 'stagflation');
    expect(out.infL).toBeCloseTo(baseP.infL, 10);
  });
});

describe('applyRegimeOverlay — lost_decade', () => {
  it('yr 0: SIP −5pp, CPS −1pp, inflation +1pp', () => {
    const out = applyRegimeOverlay(baseP, 0, 'lost_decade');
    expect(out.sXirr).toBeCloseTo(baseP.sXirr - 0.05, 10);
    expect(out.cRate).toBeCloseTo(baseP.cRate - 0.01, 10);
    expect(out.infL).toBeCloseTo(baseP.infL + 0.01, 10);
  });

  it('yr 9: still within 10-year window', () => {
    const out = applyRegimeOverlay(baseP, 9, 'lost_decade');
    expect(out.sXirr).toBeCloseTo(baseP.sXirr - 0.05, 10);
  });

  it('yr 10: outside window — no overlay', () => {
    const out = applyRegimeOverlay(baseP, 10, 'lost_decade');
    expect(out.sXirr).toBeCloseTo(baseP.sXirr, 10);
  });
});

describe('applyRegimeOverlay — medical_shock', () => {
  it('all years: infM +2pp, infC nudged up', () => {
    const out = applyRegimeOverlay(baseP, 5, 'medical_shock');
    expect(out.infM).toBeCloseTo(baseP.infM + 0.02, 10);
    expect(out.infC).toBeCloseTo(baseP.infC + 0.006, 10);
  });

  it('sXirr and cRate unchanged', () => {
    const out = applyRegimeOverlay(baseP, 0, 'medical_shock');
    expect(out.sXirr).toBeCloseTo(baseP.sXirr, 10);
    expect(out.cRate).toBeCloseTo(baseP.cRate, 10);
  });
});

// ── REGIMES descriptor tests ─────────────────────────────────────────────────

describe('REGIMES descriptors', () => {
  it('exports exactly 5 regimes', () => {
    expect(REGIMES).toHaveLength(5);
  });

  it('each regime has id, label, blurb', () => {
    for (const r of REGIMES) {
      expect(r.id).toBeTruthy();
      expect(r.label).toBeTruthy();
      expect(r.blurb).toBeTruthy();
    }
  });

  it('contains all expected regime ids', () => {
    const ids = REGIMES.map(r => r.id);
    expect(ids).toContain('early_crash');
    expect(ids).toContain('stagflation');
    expect(ids).toContain('lost_decade');
    expect(ids).toContain('medical_shock');
    expect(ids).toContain('retire_crash');
  });
});

describe('retire_crash anchor-relative window', () => {
  const baseP = { sXirr: 0.10, cRate: 0.071, infL: 0.045, infM: 0.07, infE: 0.08, infC: 0.05 };
  const anchor = 20; // accYears

  it('fires exactly at anchor−1, anchor, anchor+1 (+fading anchor+2)', () => {
    const pre = applyRegimeOverlay(baseP, anchor - 2, 'retire_crash', anchor);
    expect(pre.sXirr).toBeCloseTo(baseP.sXirr, 10);
    expect(pre).not.toHaveProperty('postRet');

    const y0 = applyRegimeOverlay(baseP, anchor - 1, 'retire_crash', anchor);
    expect(y0.sXirr).toBeCloseTo(-0.30, 10);
    expect(y0.infL).toBeCloseTo(baseP.infL + 0.02, 10);

    const y1 = applyRegimeOverlay(baseP, anchor, 'retire_crash', anchor);
    expect(y1.sXirr).toBeCloseTo(-0.12, 10);

    const y2 = applyRegimeOverlay(baseP, anchor + 1, 'retire_crash', anchor);
    expect(y2.sXirr).toBeCloseTo(baseP.sXirr, 10); // sXirr untouched (inert downstream)
    expect(y2.postRet).toBe('halve');

    const y3 = applyRegimeOverlay(baseP, anchor + 2, 'retire_crash', anchor);
    expect(y3.postRet).toBe('quarter');

    const post = applyRegimeOverlay(baseP, anchor + 3, 'retire_crash', anchor);
    expect(post).toEqual(baseP);
  });

  it('moves with the anchor (retirement year), not year 0', () => {
    const other = applyRegimeOverlay(baseP, 30, 'retire_crash', 31);
    expect(other.sXirr).toBeCloseTo(-0.30, 10);
    const sameIdxOtherAnchor = applyRegimeOverlay(baseP, 30, 'retire_crash', 20);
    expect(sameIdxOtherAnchor.sXirr).toBeCloseTo(baseP.sXirr, 10);
  });
});

describe('applyWhatIfCrash interactive overlay', () => {
  const baseP = { sXirr: 0.10, cRate: 0.071, infL: 0.045, infM: 0.07, infE: 0.08, infC: 0.05 };

  it('fires at crashIdx with the picked depth, echoes at +1, identity elsewhere', () => {
    const hit = applyWhatIfCrash(baseP, 15, { crashIdx: 15, depth: 0.37 });
    expect(hit.sXirr).toBeCloseTo(-0.37, 10);
    expect(hit.infL).toBeCloseTo(baseP.infL + 0.02, 10);
    expect(hit.postRet).toBe('halve');

    const echo = applyWhatIfCrash(baseP, 16, { crashIdx: 15, depth: 0.37 });
    expect(echo.sXirr).toBeCloseTo(Math.max(-0.10, 0.10 - 0.185), 10);

    expect(applyWhatIfCrash(baseP, 14, { crashIdx: 15, depth: 0.37 })).toEqual(baseP);
    expect(applyWhatIfCrash(baseP, 17, { crashIdx: 15, depth: 0.37 })).toEqual(baseP);
  });

  it('clamps depth to 5–60%', () => {
    expect(applyWhatIfCrash(baseP, 5, { crashIdx: 5, depth: 0.99 }).sXirr).toBeCloseTo(-0.60, 10);
    expect(applyWhatIfCrash(baseP, 5, { crashIdx: 5, depth: 0.01 }).sXirr).toBeCloseTo(-0.05, 10);
  });

  it('ships historical presets as depths', () => {
    const byId = Object.fromEntries(WHATIF_PRESETS.map((p) => [p.id, p.depth]));
    expect(byId.gfc2008).toBeCloseTo(0.37, 10);
    expect(byId.covid).toBeCloseTo(0.23, 10);
    expect(byId.dotcom).toBeCloseTo(0.20, 10);
  });
});

describe('terminalFallPct', () => {
  const base = [
    { yr: 2044, tot: 10 },
    { yr: 2045, tot: 11 },
    { yr: 2046, tot: 12 },
  ];

  it('compares the last common year as a percent fall', () => {
    const shock = [
      { yr: 2044, whatIfTot: 10 },
      { yr: 2045, whatIfTot: 9 },
      { yr: 2046, whatIfTot: 8 },
    ];
    const { fallPct, baseTerm, shockTerm } = terminalFallPct(base, shock, 'whatIfTot');
    expect(baseTerm).toBe(12);
    expect(shockTerm).toBe(8);
    expect(fallPct).toBeCloseTo(-33.333, 2);
  });

  it('ignores non-overlapping years and nulls gracefully', () => {
    expect(terminalFallPct([], [{ yr: 2044, whatIfTot: 1 }], 'whatIfTot').fallPct).toBeNull();
    expect(terminalFallPct(base, [], 'whatIfTot').fallPct).toBeNull();
    expect(terminalFallPct([{ yr: 2044, tot: 0 }], [{ yr: 2044, whatIfTot: 0 }], 'whatIfTot').fallPct).toBeNull();
    const partial = terminalFallPct(base, [{ yr: 2099, whatIfTot: 5 }], 'whatIfTot');
    expect(partial.fallPct).toBeNull();
  });
});

// ── runStressPanel aggregation tests ────────────────────────────────────────

const SYNTHETIC_PARAMS = {
  bYr: 2024, rYr: 2030, endYr: 2060,
  currentAge: 30, pcs: {},
  cpsBal: 500000, cpsAnn: 200000, cpsInc: 0.03, cpsRate: 0.071,
  annPct: 0, annYield: 0.065,
  gratuity: 2500000, postRetRate: 0.075,
  retSpend: 40000, medShare: 0.20,
  sipMo: 13000, sipXirr: 0.10, sipStep: 0.03, mSurplus: 35000,
  lastPay: { tapsPension: 50000, emoluments: 100000 },
};

describe('runStressPanel — aggregation sanity', () => {
  it('returns an array of 5 regime results', () => {
    const results = runStressPanel(
      SYNTHETIC_PARAMS, 'taps',
      { infLiving: 0.045, infMed: 0.07, infEdu: 0.08, infComposite: 0.05 },
      {},
      { paths: 50, mcMode: 'A', rngSeed: 42 }
    );
    expect(results).toHaveLength(5);
  });

  it('each result has required keys', () => {
    const results = runStressPanel(
      SYNTHETIC_PARAMS, 'taps',
      { infLiving: 0.045, infMed: 0.07, infEdu: 0.08, infComposite: 0.05 },
      {},
      { paths: 50, mcMode: 'A', rngSeed: 42 }
    );
    for (const r of results) {
      expect(r).toHaveProperty('regime');
      expect(r).toHaveProperty('holdsPct');
      expect(r).toHaveProperty('exhaustPct');
      expect(r).toHaveProperty('shortYrsP50');
      expect(r).toHaveProperty('bequestP10');
      expect(r).toHaveProperty('bequestP50');
    }
  });

  it('holdsPct + exhaustPct = 100 for each regime', () => {
    const results = runStressPanel(
      SYNTHETIC_PARAMS, 'taps',
      { infLiving: 0.045, infMed: 0.07, infEdu: 0.08, infComposite: 0.05 },
      {},
      { paths: 50, mcMode: 'A', rngSeed: 42 }
    );
    for (const r of results) {
      expect(r.holdsPct + r.exhaustPct).toBeCloseTo(100, 5);
    }
  });

  it('early_crash produces lower holdsPct than base (medical_shock) for this param set', () => {
    const results = runStressPanel(
      SYNTHETIC_PARAMS, 'taps',
      { infLiving: 0.045, infMed: 0.07, infEdu: 0.08, infComposite: 0.05 },
      {},
      { paths: 100, mcMode: 'A', rngSeed: 42 }
    );
    const crash = results.find(r => r.regime.id === 'early_crash');
    const med   = results.find(r => r.regime.id === 'medical_shock');
    // early_crash should be harsher (lower holds) than medical_shock
    expect(crash.holdsPct).toBeLessThanOrEqual(med.holdsPct);
  });
});
