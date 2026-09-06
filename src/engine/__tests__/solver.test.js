import { describe, it, expect } from 'vitest';
import { solveTargetSurvival, evaluateGoalTradeoff } from '../solver.js';

describe('solver module', () => {
  const mockParams = {
    bYr: 2026,
    rYr: 2050,
    endYr: 2079,
    currentAge: 32,
    lifeAge: 85,
    cpsBal: 1000000,
    cpsAnn: 150000,
    cpsRate: 0.071,
    sipMo: 25000,
    sipStep: 0.03,
    sipXirr: 0.108,
    retSpend: 75000,
  };

  const mockInflation = {
    infLiving: 0.05,
    infMed: 0.07,
    infEdu: 0.08,
    infComposite: 0.055,
  };

  const mockState = {
    ...mockParams,
    doj: '2015-06-01',
    dor: '2050-05-31',
    retireMode: 'taps',
    children: [
      { id: 'c1', name: 'Child 1', birth: '2018', hAge: 15, hCost: 200000, cAge: 18, cCost: 2000000, mAge: 25, mCost: 1500000 },
    ],
  };

  describe('solveTargetSurvival', () => {
    it('solves for required sipStep to achieve target survival rate', () => {
      const tightParams = { ...mockParams, retSpend: 150000 };
      const result = solveTargetSurvival({
        params: tightParams,
        mode: 'taps',
        inflation: mockInflation,
        targetSurvivePct: 95,
        solveField: 'sipStep',
        mcRuns: 200,
      });

      expect(result).toBeDefined();
      expect(result.field).toBe('sipStep');
      expect(result.targetSurvivePct).toBe(95);
      expect(typeof result.solvedValue).toBe('number');
      expect(result.achievedSurvivePct).toBeGreaterThanOrEqual(90);
    });

    it('solves for required monthly SIP (sipMo) to achieve 90% target survival', () => {
      const result = solveTargetSurvival({
        params: mockParams,
        mode: 'taps',
        inflation: mockInflation,
        targetSurvivePct: 90,
        solveField: 'sipMo',
        mcRuns: 200,
      });

      expect(result.field).toBe('sipMo');
      expect(result.solvedValue).toBeGreaterThan(0);
      expect(typeof result.delta).toBe('number');
    });
  });

  describe('evaluateGoalTradeoff', () => {
    it('calculates survival rate delta when deferring milestone ages', () => {
      const result = evaluateGoalTradeoff({
        simParams: mockParams,
        mode: 'taps',
        inflation: mockInflation,
        children: mockState.children,
        goalModifications: [
          { childId: 'c1', cAgeShift: 2, mCostShift: -500000 }, // Defer college 2 yrs, reduce marriage by 5L
        ],
      });

      expect(result).toBeDefined();
      expect(typeof result.baselineSurvivePct).toBe('number');
      expect(typeof result.modifiedSurvivePct).toBe('number');
      expect(typeof result.deltaSurvivePct).toBe('number');
      // Regression: raw-state plumbing used to yield NaN goals / empty records.
      expect(Number.isFinite(result.baselineSurvivePct)).toBe(true);
      expect(Number.isFinite(result.modifiedSurvivePct)).toBe(true);
      expect(result.baselineSurvivePct).toBeGreaterThanOrEqual(0);
      expect(result.baselineSurvivePct).toBeLessThanOrEqual(100);
      expect(result.modifiedChildren[0].cAge).toBe(20);
      expect(result.modifiedChildren[0].mCost).toBe(1000000);
    });
  });
});
