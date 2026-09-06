import { describe, it, expect } from 'vitest';
import {
  computeHealthScore,
  computeSrrResilience,
  computeTaxEfficiency,
  recommendScoreActions,
} from '../score.js';

const drawRecords = (liqs) =>
  liqs.map((liquid, i) => ({ yr: 2050 + i, age: 60 + i, phase: 'draw', liquid, tot: liquid }));

describe('wealth score module', () => {
  it('weights parts 0.40 / 0.25 / 0.20 / 0.15', () => {
    const results = {
      survivePct: 100,
      neverShortPct: 100,
      taxP50: 0,
      // records.liquid is ₹ Cr; liquidStart is ₹ (engine units) — keep the mix honest.
      mid: { records: drawRecords([5, 5, 5, 5, 5]), totalWealthAtRetire: 5e7, liquidStart: 5e7 },
    };
    // srr = 100 (no dip), taxEff = 100 (no tax) → score 100
    expect(computeHealthScore(results).score).toBe(100);

    const half = {
      survivePct: 50,
      neverShortPct: 50,
      taxP50: 0,
      mid: { records: drawRecords([2.5, 2.5, 2.5, 2.5, 2.5]), totalWealthAtRetire: 5e7, liquidStart: 5e7 },
    };
    // srr = 50, taxEff = 100 → 0.4·50+0.25·50+0.2·50+0.15·100 = 57.5 → 58
    expect(computeHealthScore(half).score).toBe(58);
  });

  it('srr reflects the worst early-drawdown dip', () => {
    expect(computeSrrResilience(drawRecords([5, 3, 4, 5, 5]), 5)).toBe(60);
    expect(computeSrrResilience([], 5)).toBe(100);
    expect(computeSrrResilience(drawRecords([0, 0, 0, 0, 0]), 5)).toBe(0);
  });

  it('tax efficiency falls as lifetime tax burden rises', () => {
    expect(computeTaxEfficiency(0, 5e7)).toBe(100);
    const eff = computeTaxEfficiency(5e6, 5e7);
    expect(eff).toBeGreaterThan(85);
    expect(eff).toBeLessThan(100);
    expect(computeTaxEfficiency(5e6, 0)).toBe(0);
  });

  it('clamps degenerate inputs to 0–100', () => {
    const { score, parts } = computeHealthScore({});
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    Object.values(parts).forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    });
  });

  it('recommends actions targeting the weakest parts (max 3)', () => {
    const state = { sipMo: 13000, sipStep: 3, retSpend: 40000 };
    const recs = recommendScoreActions(state, { survive: 70, neverShort: 60, srr: 50, taxEff: 90 });
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs[0].id).toBe('raise-stepup'); // weakest part first (srr 50)
    expect(recs[0].action).toMatchObject({ type: 'SET_FIELD', field: 'sipStep', value: 4 });
    const raiseSip = recs.find((r) => r.id === 'raise-sip');
    expect(raiseSip.action).toMatchObject({ field: 'sipMo', value: 15000 });
  });

  it('returns no actions for a perfect plan', () => {
    expect(
      recommendScoreActions({ sipMo: 1, sipStep: 1, retSpend: 1 }, { survive: 100, neverShort: 100, srr: 100, taxEff: 100 })
    ).toEqual([]);
  });
});
