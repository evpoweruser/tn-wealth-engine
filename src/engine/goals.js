/**
 * Children's milestone goals engine module.
 * Computes future values, tax gross-ups, and SIP requirements for education and marriage goals.
 * @module engine/goals
 */

/**
 * Calculate the required monthly SIP to reach a future value.
 * Uses the ordinary annuity formula with beginning-of-period adjustment.
 *
 * @param {number} fv - Target future value
 * @param {number} annualRate - Annual return rate as decimal (e.g., 0.108)
 * @param {number} months - Number of months to invest
 * @returns {number} Required monthly SIP amount
 */
export function getSipRequired(fv, annualRate, months) {
  if (months <= 0) return fv;
  const rm = annualRate / 12;
  if (Math.abs(rm) < 1e-12) return fv / months;
  const factor = (Math.pow(1 + rm, months) - 1) / rm * (1 + rm);
  return fv / factor;
}

/**
 * Shared LTCG assumptions for corpus withdrawals (goals + terminal SIP
 * liquidation). Single source of truth — goals.js and simulation.js both use
 * these so the gains fraction can never drift between modules.
 */
export const LTCG_GAINS_FRACTION = 0.6; // share of a withdrawal assumed to be gains
export const LTCG_EXEMPTION = 125000; // annual ₹1.25L LTCG exemption
export const LTCG_RATE = 0.125; // 12.5% LTCG rate

/**
 * Estimate capital-gains tax on a nominal withdrawal amount.
 * @param {number} amount - Nominal withdrawal (₹)
 * @returns {number} LTCG tax (₹, nominal)
 */
export function estimateWithdrawalLtcg(amount) {
  return Math.max(0, amount * LTCG_GAINS_FRACTION - LTCG_EXEMPTION) * LTCG_RATE;
}

/**
 * Compute all milestone goals for all children.
 *
 * Each child has 3 milestones: Higher Secondary, College, Marriage.
 * Education goals inflate at education CPI; marriage at living CPI.
 * Tax is estimated as LTCG: max(0, FV*0.6 - 125000) * 12.5%
 *
 * @param {Array<Object>} children - Array of child objects
 * @param {Object} inflation - Inflation data from computeInflation()
 * @param {number} sipXirr - SIP return rate as decimal
 * @param {number} baseYear - Current year
 * @returns {Array<Object>} Array of goal objects
 */
export function computeGoals(children, inflation, sipXirr, baseYear) {
  const goals = [];

  children.forEach(child => {
    const milestones = [
      { label: 'Higher Sec', age: child.hAge, cost: child.hCost, fund: child.hFund, isEducation: true },
      { label: 'College', age: child.cAge, cost: child.cCost, fund: child.cFund, isEducation: true },
      { label: 'Marriage', age: child.mAge, cost: child.mCost, fund: child.mFund, isEducation: false },
    ];

    milestones.forEach(milestone => {
      const year = (child.birth || baseYear) + milestone.age;
      const yearsLeft = Math.max(0, year - baseYear);
      const inflRate = milestone.isEducation ? inflation.infEdu : inflation.infLiving;

      // Future value with inflation
      const netFV = milestone.cost * Math.pow(1 + inflRate, yearsLeft);

      // Estimated LTCG tax via shared assumptions (see LTCG_* above)
      const tax = estimateWithdrawalLtcg(netFV);
      const grossFV = netFV + tax;

      // Required monthly SIP
      const sipRequired = getSipRequired(grossFV, sipXirr, yearsLeft * 12);

      goals.push({
        childName: child.name,
        childId: child.id,
        label: milestone.label,
        year,
        yearsLeft,
        baseCost: milestone.cost,
        netFV,
        tax,
        grossFV,
        fund: milestone.fund,
        sipRequired,
        isEducation: milestone.isEducation,
      });
    });
  });

  return goals;
}

/**
 * Compute corpus withdrawals by year from goals funded by corpus.
 * Amounts are NET of capital-gains tax (see computeWithdrawalTaxes) so the
 * engine can deduct each goal's tax in its own withdrawal year instead of
 * lumping it into the withdrawal. netFV + tax === grossFV per goal.
 * @param {Array<Object>} goals - From computeGoals()
 * @returns {Object<number, number>} Year -> total net withdrawal amount
 */
export function computeWithdrawals(goals) {
  const withdrawals = {};
  (goals || []).forEach(g => {
    if (g.fund === 'corpus') {
      withdrawals[g.year] = (withdrawals[g.year] || 0) + g.netFV;
    }
  });
  return withdrawals;
}

/**
 * Compute capital-gains tax due by year on corpus-funded goal withdrawals.
 * Pairs 1:1 with computeWithdrawals — the engine deducts both in the
 * withdrawal year (exact timing) instead of midpoint-discounting a lump sum.
 * @param {Array<Object>} goals - From computeGoals()
 * @returns {Object<number, number>} Year -> total LTCG tax amount (nominal ₹)
 */
export function computeWithdrawalTaxes(goals) {
  const taxes = {};
  (goals || []).forEach(g => {
    if (g.fund === 'corpus' && g.tax > 0) {
      taxes[g.year] = (taxes[g.year] || 0) + g.tax;
    }
  });
  return taxes;
}

/**
 * Compute dedicated SIP amounts by year for SIP-funded goals.
 * @param {Array<Object>} goals - From computeGoals()
 * @param {number} baseYear - Current year
 * @param {number} retireYear - Retirement year
 * @returns {Object<number, number>} Year -> total dedicated SIP amount
 */
export function computeDedicatedSIP(goals, baseYear, retireYear) {
  const dedicated = {};
  for (let y = baseYear; y <= retireYear; y++) {
    dedicated[y] = 0;
  }

  goals.forEach(g => {
    if (g.fund === 'sip' && g.yearsLeft > 0) {
      for (let y = baseYear; y < g.year; y++) {
        if (dedicated[y] !== undefined) {
          dedicated[y] += g.sipRequired;
        }
      }
    }
  });

  return dedicated;
}
