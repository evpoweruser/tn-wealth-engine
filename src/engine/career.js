/**
 * Career progression engine module.
 * Projects last pay for TAPS pension and builds detailed CPS corpus.
 * @module engine/career
 */

/**
 * Project the last pay at retirement for TAPS pension calculation.
 *
 * Models: annual 3% increment, DACP promotions, MD degree bonus,
 * Pay Commission jumps (+25% with DA reset), and DA escalation.
 *
 * @param {Object} config
 * @param {string} config.doj - Date of joining (ISO string)
 * @param {string} config.dor - Date of retirement (ISO string)
 * @param {number} config.startBasic - Starting basic pay
 * @param {number} config.daPct - Current DA percentage (e.g., 60)
 * @param {number} config.mdYear - Year of MD degree
 * @param {number} config.mdIncr - Number of advance increments for MD
 * @param {{ 8: number, 15: number, 17: number, 20: number }} config.dacp
 *   DACP increment percentages (e.g., { 8: 8, 15: 10, 17: 8, 20: 15 })
 * @param {Object<number, number>} config.payCommissions
 *   Pay commission years and bump amounts (e.g., { 2027: 0.25, 2037: 0.25 })
 * @returns {{ basic: number, da: number, emoluments: number, tapsPension: number }}
 */
export function projectLastPay(config) {
  const doj = new Date(config.doj);
  const dor = new Date(config.dor);
  let basic = config.startBasic || 56100;
  let da = (config.daPct || 60) / 100;
  const mdYear = config.mdYear || 2026;
  const mdIncr = config.mdIncr || 2;
  const pcs = config.payCommissions || {};

  // Convert DACP percentages to decimals, keyed by years of service
  const dacp = {};
  if (config.dacp) {
    Object.entries(config.dacp).forEach(([yrs, pct]) => {
      dacp[Number(yrs)] = (pct || 0) / 100;
    });
  }

  let y = doj.getFullYear();
  let m = doj.getMonth();
  const eY = dor.getFullYear();
  const eM = dor.getMonth();

  while (y < eY || (y === eY && m <= eM)) {
    // MD degree bonus in July of the MD year
    if (y === mdYear && m === 6) {
      basic *= Math.pow(1.03, mdIncr);
    }

    // Pay Commission in January: +25% to basic, DA resets to 0
    if (pcs[y] && m === 0) {
      basic *= 1 + pcs[y];
      da = 0;
    }

    // Advance to next month
    m++;
    if (m > 11) {
      m = 0;
      y++;

      // Annual increment (3%)
      basic *= 1.03;

      // DACP promotion check
      const serviceYears = y - doj.getFullYear();
      if (dacp[serviceYears]) {
        basic *= 1 + dacp[serviceYears];
      }

      // DA escalation: +6 percentage points per year, capped at 60%
      da = Math.min(0.6, da + 0.06);
    }
  }

  const emoluments = basic * (1 + da);
  const tapsPension = 0.5 * emoluments;

  return { basic, da, emoluments, tapsPension };
}

/**
 * Build detailed CPS corpus projection from DOJ to today.
 *
 * BUG FIX: The original code had an inner loop that compounded CPS 12 times
 * per single month iteration, causing a 12x overcount. This version correctly
 * compounds once per month.
 *
 * @param {Object} config - Same as projectLastPay config, plus:
 * @param {number} config.cpsRate - Annual CPS return rate as percentage (e.g., 7.1)
 * @param {Date} [config.today] - Current date (defaults to now)
 * @returns {{ corpus: number, annualContribution: number, lastPay: Object }}
 */
export function buildDetailedCPS(config) {
  const doj = new Date(config.doj);
  const today = config.today || new Date();
  let basic = config.startBasic || 56100;
  let da = (config.daPct || 60) / 100;
  const annualRate = (config.cpsRate || 7.1) / 100;
  const monthlyR = Math.pow(1 + annualRate, 1 / 12) - 1;
  const mdYear = config.mdYear || 2026;
  const mdIncr = config.mdIncr || 2;

  const dacp = {};
  if (config.dacp) {
    Object.entries(config.dacp).forEach(([yrs, pct]) => {
      dacp[Number(yrs)] = (pct || 0) / 100;
    });
  }

  const pcs = config.payCommissions || {};
  let corpus = 0;
  let y = doj.getFullYear();
  let m = doj.getMonth();

  while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
    // MD degree bonus in July
    if (y === mdYear && m === 6) {
      basic *= Math.pow(1.03, mdIncr);
    }

    // Pay Commission in January
    if (pcs[y] && m === 0) {
      basic *= 1 + pcs[y];
      da = 0;
    }

    // Monthly CPS contribution = 20% of (Basic + DA) / 12 months
    // But since we're iterating month-by-month, we use the full monthly amount
    const monthlyContrib = (0.2 * basic * (1 + da)) / 12;

    // BUG FIX: Compound ONCE per month (was 12x in original)
    corpus = corpus * (1 + monthlyR) + monthlyContrib;

    // Advance to next month
    m++;
    if (m > 11) {
      m = 0;
      y++;
      basic *= 1.03;
      const serviceYears = y - doj.getFullYear();
      if (dacp[serviceYears]) {
        basic *= 1 + dacp[serviceYears];
      }
      da = Math.min(0.6, da + 0.06);
    }
  }

  const annualContribution = Math.round(basic * (1 + da) * 0.2);
  const lastPay = projectLastPay(config);

  return { corpus: Math.round(corpus), annualContribution, lastPay };
}
