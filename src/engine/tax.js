/**
 * Simplified pension / annuity income-tax estimator.
 *
 * Regime: New Tax Regime (FY 2026-27, Budget 2025 announcement).
 * Standard deduction: ₹75,000 (salaried / pensioner).
 * Cess: 4% on tax.
 *
 * Slabs (after standard deduction):
 *   0 – 4,00,000      → 0%
 *   4,00,001 – 8,00,000  → 5%
 *   8,00,001 – 12,00,000 → 10%
 *   12,00,001 – 16,00,000 → 15%
 *   16,00,001 – 20,00,000 → 20%
 *   20,00,001 – 24,00,000 → 25%
 *   > 24,00,000          → 30%
 *
 * NOTE: This is a planning estimate. It does not model surcharge,
 * section 87A rebate beyond the nil slab, TDS, or non-pension income.
 * Update TAX_YEAR and SLABS when Finance Bill changes apply.
 *
 * @module engine/tax
 */

export const TAX_YEAR = 'FY2026-27';

const STANDARD_DEDUCTION = 75_000;

/**
 * Slab table: [upperLimit (inclusive), rate].
 * The last entry has upper = Infinity (catch-all top rate).
 */
const SLABS = [
  [4_00_000, 0.00],
  [8_00_000, 0.05],
  [12_00_000, 0.10],
  [16_00_000, 0.15],
  [20_00_000, 0.20],
  [24_00_000, 0.25],
  [Infinity,  0.30],
];

const CESS_RATE = 0.04;

/**
 * Compute nominal income-tax on annual pension / annuity income.
 *
 * @param {number} annualPension  Gross annual pension/annuity in ₹ (nominal).
 * @param {object} [opts]
 * @param {number} [opts.stdDeduction=75000]  Override standard deduction.
 * @returns {number}  Tax payable in ₹ (nominal). Never negative.
 */
export function pensionTaxForYear(annualPension, opts = {}) {
  const stdDed = opts.stdDeduction ?? STANDARD_DEDUCTION;
  const taxable = Math.max(0, annualPension - stdDed);
  if (taxable === 0) return 0;

  let prev = 0;
  let baseTax = 0;

  for (const [upper, rate] of SLABS) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, upper) - prev;
    baseTax += slice * rate;
    prev = upper;
    if (upper === Infinity) break;
  }

  return baseTax * (1 + CESS_RATE);
}
