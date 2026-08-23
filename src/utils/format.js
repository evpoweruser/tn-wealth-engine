/**
 * Format a number as Indian Rupees in Crores
 * @param {number} x - Value in rupees
 * @returns {string}
 */
export const fmtCr = (x) => '₹' + (x / 1e7).toFixed(2) + ' Cr';

/**
 * Format a number as Indian Rupees with locale formatting
 * @param {number} x - Value in rupees
 * @returns {string}
 */
export const fmt = (x) => '₹' + Math.round(x).toLocaleString('en-IN');

/**
 * Format percentage
 * @param {number} x - Value as decimal (0.1 = 10%)
 * @param {number} [decimals=1] - Decimal places
 * @returns {string}
 */
export const fmtPct = (x, decimals = 1) => (x * 100).toFixed(decimals) + '%';

/**
 * Clamp a value between min and max
 * @param {number} x
 * @param {number} a - min
 * @param {number} b - max
 * @returns {number}
 */
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Calculate age from date of birth string
 * @param {string} dobStr - Date string (YYYY-MM-DD)
 * @returns {number}
 */
export function ageFromDob(dobStr) {
  const d = new Date(dobStr);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return Math.max(0, a);
}
