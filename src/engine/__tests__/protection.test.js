import { describe, it, expect } from 'vitest';
import {
  PROTECTION_LEGS,
  TERM_AGE_BANDS,
  protectionLump,
  suggestTermTarget,
  protectionGap,
  estimateTermPremium,
  premiumFeasible,
} from '../protection.js';

describe('Protection & Term Gap Engine Module', () => {
  describe('PROTECTION_LEGS Constants', () => {
    it('defines statutory and voluntary protection leg defaults correctly', () => {
      expect(PROTECTION_LEGS).toHaveLength(3);
      expect(PROTECTION_LEGS[0]).toMatchObject({ key: 'fbf', amount: 150000 });
      expect(PROTECTION_LEGS[1]).toMatchObject({ key: 'security', amount: 500000 });
      expect(PROTECTION_LEGS[2]).toMatchObject({ key: 'dcf', amount: 10000000 });
    });
  });

  describe('protectionLump()', () => {
    it('computes total protection and liquid pool with all legs active', () => {
      const res = protectionLump({
        fbfOn: true,
        securityOn: true,
        dcfOn: true,
        termAmt: 5000000,
        gratuity: 2500000,
        cpsBal: 1500000,
        sipBal: 1000000,
      });

      expect(res.protectionTotal).toBe(150000 + 500000 + 10000000 + 5000000);
      expect(res.protectionNonTerm).toBe(10650000);
      // Pool MUST exclude termAmt by construction to prevent double counting
      expect(res.poolWithoutTerm).toBe(10650000 + 2500000 + 1500000 + 1000000);
      expect(res.poolWithoutTerm).not.toContain(5000000);
    });

    it('excludes inactive legs when toggled off', () => {
      const res = protectionLump({
        fbfOn: true,
        securityOn: false,
        dcfOn: false,
        termAmt: 0,
        gratuity: 2500000,
        cpsBal: 0,
        sipBal: 0,
      });

      expect(res.protectionTotal).toBe(150000);
      expect(res.protectionNonTerm).toBe(150000);
      expect(res.poolWithoutTerm).toBe(150000 + 2500000);
    });
  });

  describe('suggestTermTarget()', () => {
    it('calculates 12x annual income target by default', () => {
      const annualIncome = 56100 * 1.6 * 12; // ₹10,77,120
      const target = suggestTermTarget(annualIncome);
      expect(target).toBe(Math.round(annualIncome * 12));
      expect(target).toBe(12925440);
    });

    it('supports custom multiples', () => {
      const annualIncome = 1000000;
      expect(suggestTermTarget(annualIncome, 15)).toBe(15000000);
      expect(suggestTermTarget(annualIncome, 20)).toBe(20000000);
    });

    it('returns 0 for zero or invalid income', () => {
      expect(suggestTermTarget(0)).toBe(0);
      expect(suggestTermTarget(-5000)).toBe(0);
      expect(suggestTermTarget(null)).toBe(0);
    });
  });

  describe('protectionGap()', () => {
    it('calculates gap when target exceeds existing pool', () => {
      const gapRes = protectionGap({ targetCover: 12000000, poolWithoutTerm: 4000000 });
      expect(gapRes.gap).toBe(8000000);
      expect(gapRes.covered).toBe(false);
      expect(gapRes.percentCovered).toBe(33);
    });

    it('returns 0 gap when existing pool covers target', () => {
      const gapRes = protectionGap({ targetCover: 10000000, poolWithoutTerm: 15000000 });
      expect(gapRes.gap).toBe(0);
      expect(gapRes.covered).toBe(true);
      expect(gapRes.percentCovered).toBe(100);
    });

    it('handles zero target cover gracefully', () => {
      const gapRes = protectionGap({ targetCover: 0, poolWithoutTerm: 5000000 });
      expect(gapRes.gap).toBe(0);
      expect(gapRes.covered).toBe(true);
      expect(gapRes.percentCovered).toBe(100);
    });
  });

  describe('estimateTermPremium()', () => {
    it('estimates premiums correctly across age bands for ₹1 Crore cover', () => {
      expect(estimateTermPremium(30, 10000000)).toMatchObject({ premiumAnnual: 10000, ratePerCr: 10000, ageBand: 'Age 18–34' });
      expect(estimateTermPremium(37, 10000000)).toMatchObject({ premiumAnnual: 14000, ratePerCr: 14000, ageBand: 'Age 35–39' });
      expect(estimateTermPremium(42, 10000000)).toMatchObject({ premiumAnnual: 20000, ratePerCr: 20000, ageBand: 'Age 40–44' });
      expect(estimateTermPremium(47, 10000000)).toMatchObject({ premiumAnnual: 30000, ratePerCr: 30000, ageBand: 'Age 45–49' });
      expect(estimateTermPremium(55, 10000000)).toMatchObject({ premiumAnnual: 45000, ratePerCr: 45000, ageBand: 'Age 50+' });
    });

    it('scales linearly with cover amount', () => {
      const age37 = estimateTermPremium(37, 20000000); // 2 Cr
      expect(age37.premiumAnnual).toBe(28000);

      const age37Half = estimateTermPremium(37, 5000000); // 50 Lakhs (0.5 Cr)
      expect(age37Half.premiumAnnual).toBe(7000);
    });
  });

  describe('premiumFeasible()', () => {
    it('marks premium as feasible when monthly cost <= surplus', () => {
      const res = premiumFeasible(24000, 35000); // ₹2,000/mo vs ₹35,000 surplus
      expect(res.monthlyPremium).toBe(2000);
      expect(res.feasible).toBe(true);
      expect(res.surplusRemaining).toBe(33000);
      expect(res.pctOfSurplus).toBe(6);
    });

    it('handles exact limit boundary', () => {
      const res = premiumFeasible(12000, 1000); // ₹1,000/mo vs ₹1,000 surplus
      expect(res.monthlyPremium).toBe(1000);
      expect(res.feasible).toBe(true);
      expect(res.surplusRemaining).toBe(0);
      expect(res.pctOfSurplus).toBe(100);
    });

    it('marks premium as unfeasible when monthly cost exceeds surplus', () => {
      const res = premiumFeasible(60000, 2000); // ₹5,000/mo vs ₹2,000 surplus
      expect(res.monthlyPremium).toBe(5000);
      expect(res.feasible).toBe(false);
      expect(res.surplusRemaining).toBe(-3000);
    });
  });
});
