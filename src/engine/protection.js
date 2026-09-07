/**
 * Protection Stack and Term-Cover Gap Planner engine module.
 *
 * Models statutory and voluntary protection legs (Family Benefit Fund, Family
 * Security Fund, Doctors Corpus Fund, Term Cover) and calculates term insurance
 * gap, indicative market premium, and monthly surplus feasibility.
 *
 * @module engine/protection
 */

/**
 * Baseline statutory and voluntary protection leg definitions.
 */
export const PROTECTION_LEGS = [
  {
    key: 'fbf',
    label: 'Family Benefit Fund (FBF)',
    amount: 150000, // ₹1.5 Lakh flat (G.O. / Karuvoolam Treasuries)
    qualifier: 'Statutory TN Govt benefit',
    note: 'Includes ₹5,000 immediate funeral advance',
  },
  {
    key: 'security',
    label: 'Family Security Fund',
    amount: 500000, // ₹5 Lakh flat (2021 revision, ₹110/mo subscription)
    qualifier: 'Statutory TN Govt subscriber fund',
    note: 'G.O.Ms.No. 129 revision',
  },
  {
    key: 'dcf',
    label: 'Doctors Corpus Fund (DCF)',
    amount: 10000000, // ₹1 Crore flat (TNGDA voluntary scheme, ₹500/mo)
    qualifier: 'TNGDA members on-duty death cover',
    note: 'Voluntary scheme — verify current membership status',
  },
];

/**
 * Indicative 2026 annual premium rates per ₹1 Crore cover for healthy non-smoker.
 */
export const TERM_AGE_BANDS = [
  { minAge: 18, maxAge: 34, ratePerCr: 10000, label: 'Age 18–34' },
  { minAge: 35, maxAge: 39, ratePerCr: 14000, label: 'Age 35–39' },
  { minAge: 40, maxAge: 44, ratePerCr: 20000, label: 'Age 40–44' },
  { minAge: 45, maxAge: 49, ratePerCr: 30000, label: 'Age 45–49' },
  { minAge: 50, maxAge: 100, ratePerCr: 45000, label: 'Age 50+' },
];

/**
 * Itemizes protection legs and calculates total protection + existing liquid pool at today.
 *
 * Note: termAmt is excluded from poolWithoutTerm by construction to prevent double-counting
 * when calculating protection gaps.
 *
 * @param {object} opts
 * @param {boolean} [opts.fbfOn=true]
 * @param {boolean} [opts.securityOn=true]
 * @param {boolean} [opts.dcfOn=true]
 * @param {number} [opts.termAmt=0]
 * @param {number} [opts.gratuity=0]
 * @param {number} [opts.cpsBal=0]
 * @param {number} [opts.sipBal=0]
 * @returns {object}
 */
export function protectionLump(opts = {}) {
  const {
    fbfOn = true,
    securityOn = true,
    dcfOn = true,
    termAmt = 0,
    gratuity = 0,
    cpsBal = 0,
    sipBal = 0,
  } = opts;

  const legs = [
    { ...PROTECTION_LEGS[0], active: fbfOn, currentAmount: fbfOn ? 150000 : 0 },
    { ...PROTECTION_LEGS[1], active: securityOn, currentAmount: securityOn ? 500000 : 0 },
    { ...PROTECTION_LEGS[2], active: dcfOn, currentAmount: dcfOn ? 10000000 : 0 },
    {
      key: 'term',
      label: 'Term Insurance Cover',
      amount: Math.max(0, termAmt),
      active: termAmt > 0,
      currentAmount: Math.max(0, termAmt),
      qualifier: 'Private contractual policy',
      note: 'Needs active policy in force',
    },
  ];

  const protectionTotal = legs.reduce((sum, leg) => sum + (leg.active ? leg.amount : 0), 0);
  const protectionNonTerm = (fbfOn ? 150000 : 0) + (securityOn ? 500000 : 0) + (dcfOn ? 10000000 : 0);
  
  // Existing pool at today = non-term protection legs + current liquid balances (Gratuity + CPS + SIP)
  const poolWithoutTerm = protectionNonTerm + Math.max(0, gratuity) + Math.max(0, cpsBal) + Math.max(0, sipBal);

  return {
    legs,
    protectionTotal,
    protectionNonTerm,
    poolWithoutTerm,
  };
}

/**
 * Suggests prefilled term target cover based on annual income and multiple (default 12x).
 *
 * @param {number} annualIncome - Annual income in ₹
 * @param {number} [multiple=12] - Target multiple (e.g. 12x)
 * @returns {number} Suggested target cover in ₹
 */
export function suggestTermTarget(annualIncome, multiple = 12) {
  if (typeof annualIncome !== 'number' || Number.isNaN(annualIncome) || annualIncome <= 0) {
    return 0;
  }
  const mult = typeof multiple === 'number' && !Number.isNaN(multiple) && multiple > 0 ? multiple : 12;
  return Math.round(annualIncome * mult);
}

/**
 * Calculates protection shortfall / gap against target cover.
 *
 * @param {object} opts
 * @param {number} opts.targetCover
 * @param {number} opts.poolWithoutTerm
 * @returns {{ targetCover: number, poolWithoutTerm: number, gap: number, covered: boolean, percentCovered: number }}
 */
export function protectionGap({ targetCover = 0, poolWithoutTerm = 0 }) {
  const target = Math.max(0, targetCover);
  const pool = Math.max(0, poolWithoutTerm);
  const gap = Math.max(0, target - pool);
  const covered = pool >= target;
  const percentCovered = target > 0 ? Math.min(100, Math.round((pool / target) * 100)) : 100;

  return {
    targetCover: target,
    poolWithoutTerm: pool,
    gap,
    covered,
    percentCovered,
  };
}

/**
 * Estimates indicative annual premium for term cover based on age band.
 *
 * @param {number} age - Current age
 * @param {number} targetCover - Target cover in ₹ (or coverCrores)
 * @returns {{ premiumAnnual: number, ratePerCr: number, ageBand: string, disclaimer: string }}
 */
export function estimateTermPremium(age = 35, targetCover = 0) {
  const currentAge = typeof age === 'number' && !Number.isNaN(age) ? age : 35;
  const coverAmt = typeof targetCover === 'number' && !Number.isNaN(targetCover) ? Math.max(0, targetCover) : 0;
  const coverCrores = coverAmt > 1000 ? coverAmt / 10000000 : coverAmt; // handles both ₹ and Cr units

  const band = TERM_AGE_BANDS.find(b => currentAge >= b.minAge && currentAge <= b.maxAge) || TERM_AGE_BANDS[TERM_AGE_BANDS.length - 1];
  const premiumAnnual = Math.round(coverCrores * band.ratePerCr);

  return {
    premiumAnnual,
    ratePerCr: band.ratePerCr,
    ageBand: band.label,
    disclaimer: 'indicative 2026 market range for healthy non-smoker — get quotes',
  };
}

/**
 * Checks if annual term premium is feasible within monthly surplus.
 *
 * @param {number} premiumAnnual - Annual premium in ₹
 * @param {number} mSurplus - Monthly surplus in ₹
 * @returns {{ feasible: boolean, monthlyPremium: number, mSurplus: number, surplusRemaining: number, pctOfSurplus: number }}
 */
export function premiumFeasible(premiumAnnual = 0, mSurplus = 0) {
  const pAnnual = typeof premiumAnnual === 'number' && !Number.isNaN(premiumAnnual) ? Math.max(0, premiumAnnual) : 0;
  const surplus = typeof mSurplus === 'number' && !Number.isNaN(mSurplus) ? Math.max(0, mSurplus) : 0;

  const monthlyPremium = Math.round(pAnnual / 12);
  const feasible = monthlyPremium <= surplus;
  const surplusRemaining = surplus - monthlyPremium;
  const pctOfSurplus = surplus > 0 ? Math.round((monthlyPremium / surplus) * 100) : 0;

  return {
    feasible,
    monthlyPremium,
    mSurplus: surplus,
    surplusRemaining,
    pctOfSurplus,
  };
}
