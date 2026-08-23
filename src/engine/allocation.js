/**
 * Asset allocation engine module.
 * Computes blended portfolio returns from asset class weights.
 * @module engine/allocation
 */

/**
 * Expected annual returns by asset class.
 * Based on long-term historical averages for Indian investors.
 */
export const ASSET_RETURNS = {
  indianEq: 0.14,   // Indian equity (Nifty 50 long-term)
  usEq: 0.15,       // US equity (S&P 500, INR-adjusted)
  debt: 0.075,      // Indian debt funds
  gold: 0.12,       // Gold (INR-denominated)
};

/**
 * Compute the blended expected return from an asset allocation.
 * @param {{ indianEq: number, usEq: number, debt: number, gold: number }} allocation
 *   Allocation weights as percentages (0-100)
 * @returns {{ blendedReturn: number, totalAllocation: number, isValid: boolean }}
 */
export function computeBlendedReturn(allocation) {
  const { indianEq = 0, usEq = 0, debt = 0, gold = 0 } = allocation;
  const totalAllocation = indianEq + usEq + debt + gold;
  const blendedReturn = totalAllocation > 0
    ? (indianEq * ASSET_RETURNS.indianEq +
       usEq * ASSET_RETURNS.usEq +
       debt * ASSET_RETURNS.debt +
       gold * ASSET_RETURNS.gold) / totalAllocation
    : 0;

  return {
    blendedReturn,
    totalAllocation,
    isValid: totalAllocation === 100,
  };
}
