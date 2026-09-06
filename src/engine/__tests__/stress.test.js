import { describe, it, expect } from 'vitest';
import { applyRegimeOverlay, REGIMES, runStressPanel } from '../stress.js';

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
  it('exports exactly 4 regimes', () => {
    expect(REGIMES).toHaveLength(4);
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
  it('returns an array of 4 regime results', () => {
    const results = runStressPanel(
      SYNTHETIC_PARAMS, 'taps',
      { infLiving: 0.045, infMed: 0.07, infEdu: 0.08, infComposite: 0.05 },
      {},
      { paths: 50, mcMode: 'A', rngSeed: 42 }
    );
    expect(results).toHaveLength(4);
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
