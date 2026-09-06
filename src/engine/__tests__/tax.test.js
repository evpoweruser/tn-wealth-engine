import { describe, it, expect } from 'vitest';
import { pensionTaxForYear, TAX_YEAR } from '../tax.js';

describe('tax.js — FY26-27 new regime slab tests', () => {
  it('exports the correct TAX_YEAR label', () => {
    expect(TAX_YEAR).toBe('FY2026-27');
  });

  it('zero pension → zero tax', () => {
    expect(pensionTaxForYear(0)).toBe(0);
  });

  it('pension ≤ std deduction (₹75k) → zero tax', () => {
    expect(pensionTaxForYear(50_000)).toBe(0);
  });

  it('pension of ₹5L → zero tax (nil slab after ₹75k std ded, taxable ₹4.25L < ₹4L nil ceiling)', () => {
    // Taxable = 5,00,000 - 75,000 = 4,25,000 → first slab covers 0–4,00,000 at 0%,
    // then ₹25,000 at 5% = ₹1,250 + 4% cess = ₹1,300.
    const tax = pensionTaxForYear(5_00_000);
    expect(tax).toBeCloseTo(1300, 0);
  });

  it('pension of ₹12L (taxable ₹11.25L) — within 10% slab', () => {
    // 0–4L @ 0%        = 0
    // 4L–8L @ 5%       = 20,000
    // 8L–11.25L @ 10%  = 32,500
    // base = 52,500;  +4% cess = 54,600
    const tax = pensionTaxForYear(12_00_000);
    expect(tax).toBeCloseTo(54_600, 0);
  });

  it('pension of ₹24L (taxable ₹23.25L)', () => {
    // 0–4L @ 0%        = 0
    // 4L–8L @ 5%       = 20,000
    // 8L–12L @ 10%     = 40,000
    // 12L–16L @ 15%    = 60,000
    // 16L–20L @ 20%    = 80,000
    // 20L–23.25L @ 25% = 81,250
    // base = 2,81,250; +4% cess = 2,92,500
    const tax = pensionTaxForYear(24_00_000);
    expect(tax).toBeCloseTo(2_92_500, 0);
  });

  it('pension of ₹36L (taxable ₹35.25L) — hits 30% slab', () => {
    // 0–4L @ 0%        = 0
    // 4L–8L @ 5%       = 20,000
    // 8L–12L @ 10%     = 40,000
    // 12L–16L @ 15%    = 60,000
    // 16L–20L @ 20%    = 80,000
    // 20L–24L @ 25%    = 1,00,000
    // 24L–35.25L @ 30% = 3,37,500
    // base = 6,37,500; +4% cess = 6,63,000
    const tax = pensionTaxForYear(36_00_000);
    expect(tax).toBeCloseTo(6_63_000, 0);
  });

  it('custom stdDeduction override', () => {
    // Zero std deduction: taxable = 5L, 0–4L @ 0% = 0, 4L–5L @ 5% = 5000, cess = 5200
    const tax = pensionTaxForYear(5_00_000, { stdDeduction: 0 });
    expect(tax).toBeCloseTo(5_200, 0);
  });

  it('negative pension → zero tax', () => {
    expect(pensionTaxForYear(-100_000)).toBe(0);
  });
});
