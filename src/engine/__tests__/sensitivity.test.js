import { describe, it, expect } from 'vitest';
import { SENSITIVITY_SHOCKS, runSensitivity } from '../sensitivity.js';

describe('sensitivity engine', () => {
  const baseParams = {
    bYr: 2026,
    rYr: 2052,
    endYr: 2076,
    currentAge: 30,
    pcs: {},
    cpsBal: 1500000,
    cpsAnn: 200000,
    cpsInc: 0.03,
    cpsRate: 0.071,
    annPct: 0,
    annYield: 0.065,
    gratuity: 2500000,
    postRetRate: 0.075,
    retSpend: 40000,
    medShare: 0.20,
    sipMo: 13000,
    sipXirr: 0.108,
    sipStep: 0.03,
    mSurplus: 35000,
    lastPay: { tapsPension: 80000, emoluments: 160000 },
  };

  const baseInflation = {
    infLiving: 0.045,
    infMed: 0.070,
    infEdu: 0.080,
    infComposite: 0.052,
  };

  it('defines exactly 5 one-factor shocks', () => {
    expect(SENSITIVITY_SHOCKS).toHaveLength(5);
    const ids = SENSITIVITY_SHOCKS.map(s => s.id);
    expect(ids).toEqual(['live_extend', 'medical_up', 'equity_down', 'inflation_up', 'cover_halved']);
  });

  it('applies live_extend correctly (+5 years to endYr)', () => {
    const shock = SENSITIVITY_SHOCKS.find(s => s.id === 'live_extend');
    const { params, inflation } = shock.apply(baseParams, baseInflation);
    expect(params.endYr).toBe(baseParams.endYr + 5);
    expect(inflation).toEqual(baseInflation);
  });

  it('applies medical_up correctly (+2pp to medical inflation)', () => {
    const shock = SENSITIVITY_SHOCKS.find(s => s.id === 'medical_up');
    const { params, inflation } = shock.apply(baseParams, baseInflation);
    expect(params).toEqual(baseParams);
    expect(inflation.infMed).toBeCloseTo(0.090, 4);
    expect(inflation.infComposite).toBeCloseTo(0.056, 4);
  });

  it('applies equity_down correctly (-2pp to SIP XIRR)', () => {
    const shock = SENSITIVITY_SHOCKS.find(s => s.id === 'equity_down');
    const { params, inflation } = shock.apply(baseParams, baseInflation);
    expect(params.sipXirr).toBeCloseTo(0.088, 4);
    expect(inflation).toEqual(baseInflation);
  });

  it('applies inflation_up correctly (+1pp across all inflation rates)', () => {
    const shock = SENSITIVITY_SHOCKS.find(s => s.id === 'inflation_up');
    const { params, inflation } = shock.apply(baseParams, baseInflation);
    expect(params).toEqual(baseParams);
    expect(inflation.infLiving).toBeCloseTo(0.055, 4);
    expect(inflation.infMed).toBeCloseTo(0.080, 4);
    expect(inflation.infEdu).toBeCloseTo(0.090, 4);
    expect(inflation.infComposite).toBeCloseTo(0.062, 4);
  });

  it('applies cover_halved correctly (halves monthly SIP)', () => {
    const shock = SENSITIVITY_SHOCKS.find(s => s.id === 'cover_halved');
    const { params, inflation } = shock.apply(baseParams, baseInflation);
    expect(params.sipMo).toBe(baseParams.sipMo / 2);
    expect(inflation).toEqual(baseInflation);
  });

  it('runs sensitivity sweep with reduced paths and computes delta', () => {
    const res = runSensitivity(baseParams, 'taps', baseInflation, {}, { paths: 300, mcMode: 'A', rngSeed: 77 });
    expect(res).toBeDefined();
    expect(res.paths).toBe(300);
    expect(typeof res.baseHolds).toBe('number');
    expect(res.shocks).toHaveLength(5);

    res.shocks.forEach(s => {
      expect(typeof s.shockedHolds).toBe('number');
      expect(s.delta).toBeCloseTo(s.shockedHolds - res.baseHolds, 4);
    });

    // Check sorting: ascending order of delta (most negative first)
    for (let i = 0; i < res.shocks.length - 1; i++) {
      expect(res.shocks[i].delta).toBeLessThanOrEqual(res.shocks[i + 1].delta);
    }
  });

  it('is deterministic when given the same seed', () => {
    const run1 = runSensitivity(baseParams, 'taps', baseInflation, {}, { paths: 300, mcMode: 'A', rngSeed: 123 });
    const run2 = runSensitivity(baseParams, 'taps', baseInflation, {}, { paths: 300, mcMode: 'A', rngSeed: 123 });
    expect(run1).toEqual(run2);
  });
});
