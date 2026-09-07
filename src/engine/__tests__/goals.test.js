import { describe, it, expect } from 'vitest';
import {
  computeGoals,
  computeWithdrawals,
  computeWithdrawalTaxes,
  estimateWithdrawalLtcg,
  LTCG_GAINS_FRACTION,
  LTCG_EXEMPTION,
  LTCG_RATE,
} from '../goals.js';

const inflation = { infLiving: 0.05, infMed: 0.07, infEdu: 0.08, infComposite: 0.055 };

describe('withdrawal tax helpers', () => {
  it('estimates LTCG with shared constants (60% gains, ₹1.25L exempt, 12.5%)', () => {
    expect(LTCG_GAINS_FRACTION).toBe(0.6);
    expect(LTCG_EXEMPTION).toBe(125000);
    expect(LTCG_RATE).toBe(0.125);
    expect(estimateWithdrawalLtcg(1_000_000)).toBeCloseTo((600_000 - 125_000) * 0.125, 6);
    expect(estimateWithdrawalLtcg(100_000)).toBe(0); // gains 60k < exemption
    expect(estimateWithdrawalLtcg(0)).toBe(0);
  });

  it('splits each corpus goal into net withdrawal + year-keyed tax (net + tax == gross)', () => {
    const children = [
      { id: 'c1', name: 'A', birth: 2020, hAge: 15, hCost: 200000, hFund: 'corpus', cAge: 18, cCost: 2000000, cFund: 'corpus', mAge: 25, mCost: 1000000, mFund: 'sip' },
    ];
    const goals = computeGoals(children, inflation, 0.108, 2026);
    const draws = computeWithdrawals(goals);
    const taxes = computeWithdrawalTaxes(goals);

    // SIP-funded marriage goal excluded from both maps
    const corpusGoals = goals.filter((g) => g.fund === 'corpus');
    expect(corpusGoals.length).toBe(2);
    expect(Object.keys(draws).length).toBe(2);
    expect(Object.keys(taxes).length).toBe(2);

    // Per-year invariant: net + tax === gross
    for (const g of corpusGoals) {
      expect(draws[g.year] + (taxes[g.year] || 0)).toBeCloseTo(g.grossFV, 6);
      expect(draws[g.year]).toBeCloseTo(g.netFV, 6);
      expect(taxes[g.year]).toBeCloseTo(g.tax, 6);
    }
  });

  it('returns empty maps for no goals / non-corpus funding', () => {
    expect(computeWithdrawals([])).toEqual({});
    expect(computeWithdrawalTaxes([])).toEqual({});
    const goals = computeGoals(
      [{ id: 'c1', name: 'A', birth: 2020, hAge: 15, hCost: 1, hFund: 'sip', cAge: 18, cCost: 1, cFund: 'sip', mAge: 25, mCost: 1, mFund: 'sip' }],
      inflation, 0.108, 2026
    );
    expect(computeWithdrawals(goals)).toEqual({});
    expect(computeWithdrawalTaxes(goals)).toEqual({});
  });
});
