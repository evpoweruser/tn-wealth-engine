/**
 * Panel explainer content for the ⓘ buttons across Plan and Stress Lab views.
 *
 * Every entry has exactly four sections:
 * - assumptions: model inputs taken as given
 * - says: how to read the numbers
 * - doesntSay: limits and common misreadings
 * - howToRead: one-line usage guidance
 *
 * Keep entries aligned with the engine (see docs/DECISIONS.md). A shape test
 * (src/content/__tests__/panelInfo.test.js) enforces the contract.
 */

export const PANEL_INFO = {
  kpi: {
    title: 'Key indicators',
    assumptions: [
      'Monte Carlo mode runs 1,000 paths (seed 42); deterministic mode runs one path.',
      'Taxes (pension, goal LTCG, terminal SIP tax) are deducted from the corpus as modelled (ADR-008).',
    ],
    says: [
      'Wealth at Retire, Monthly Pension and Liquid Base are median outcomes (P10–P90 range in subtitles).',
      'Longevity shows “Depletes YYYY” only when a majority of paths fail (exhaust > 50%) — otherwise the plan age.',
      'Plan Success is the share of paths sustaining to the plan age.',
    ],
    doesntSay: [
      'A 95% success rate still means ~1-in-20 failure — check Exhausts and the Stress Lab.',
      'Monthly Pension under TAPS is pay-based and insulated from market crashes; the corpus cards are not.',
    ],
    howToRead: 'Green across all five with high Plan Success means a healthy plan; any red card deserves a Lab visit.',
  },

  narrative: {
    title: 'Reading the result',
    assumptions: [
      'Sentences are generated from headline results plus the worst stress regime and top sensitivity shock.',
      'Thresholds (e.g. what counts as “high resilience”) are fixed planning bands, not personal advice.',
    ],
    says: [
      'A plain-English verdict: sustainability, downside (P10), lifetime tax drag, and the single biggest risk.',
      'Status badges pulse green / amber / red with Plan Success bands.',
    ],
    doesntSay: [
      'It is a summary, not analysis — it will not tell you *why* a shock hurts or how to fix it.',
      'It is not financial advice; bands are generic, not tuned to your risk appetite.',
    ],
    howToRead: 'Read the two sentences, then click through to the Lab panel each one points at.',
  },

  'health-score': {
    title: 'TN Wealth Score (0–100)',
    assumptions: [
      'Score = 0.40·Survival + 0.25·Never-short + 0.20·Early-year cushion + 0.15·Tax efficiency.',
      'Early-year cushion measures the worst liquid dip over the first 5 drawdown years of the median path.',
    ],
    says: [
      'One number rolling up survival odds, shortfall frequency, sequence-risk cushion and tax drag.',
      'Part bars show which component drags the score; Apply buttons dispatch real input changes.',
    ],
    doesntSay: [
      'It does not capture goal timing pain (a funded-but-late college fee still scores fine).',
      'Weights are a house view, not a universal truth — a 78 vs 82 gap is noise, not signal.',
    ],
    howToRead: 'Chase the lowest part bar first; re-check the score after applying a recommendation.',
  },

  milestones: {
    title: 'Goal timeline',
    assumptions: [
      'Each child has three milestones (Higher Sec ~15, College ~18, Marriage ~25) with your costs and funding choice.',
      'Future costs inflate at education CPI (school/college) or living CPI (marriage).',
    ],
    says: [
      'When each goal lands, what it costs in future rupees, and whether the corpus or a dedicated SIP funds it.',
      'Corpus goals withdraw from savings in that year (plus capital-gains tax); SIP goals need the shown monthly SIP.',
    ],
    doesntSay: [
      'It does not check affordability — a goal can sit on the timeline while the plan fails around it.',
      'Ages and costs are your inputs; the engine never moves or trims them (the optimizer only tests scenarios).',
    ],
    howToRead: 'Confirm every milestone sits where you expect, then verify funding in Feasibility and survival in the Lab.',
  },

  spending: {
    title: 'Retirement spending breakdown',
    assumptions: [
      'Median-path drawdown years only; monthly spend split by your medical-share setting.',
      'Living spend compounds with living inflation, medical with medical inflation (plus LTC step-up if enabled).',
    ],
    says: [
      'How monthly outflow evolves: blue living costs vs red healthcare/OOP — watch red’s share grow with age.',
      'Values are nominal rupees of that future year, not today’s money.',
    ],
    doesntSay: [
      'It is not a budget — one-off shocks (LTC event at 75, milestone goals) are not in these bars.',
      'Median path only; bad market paths spend the same but deplete faster (see Tornado).',
    ],
    howToRead: 'If healthcare dominates by age 80, revisit medical share, cover, or the LTC toggle.',
  },

  buckets: {
    title: 'Retirement bucket allocation',
    assumptions: [
      'Heuristic rule, not an optimization: Cash ≈ 2 yrs spend, Bridge ≈ next 3 yrs, Stability 40% of the rest, Growth 60%.',
      'Based on liquid corpus at retirement and current monthly spend.',
    ],
    says: [
      'A mental model for time-horizon matching: near-term safety vs long-horizon growth on the same corpus.',
      'Segments resize live as spend or corpus inputs change.',
    ],
    doesntSay: [
      'It is not a portfolio recommendation and ignores your actual asset allocation.',
      'It does not model rebalancing, bucket refills, or sequencing between buckets.',
    ],
    howToRead: 'Use it to sanity-check runway (Cash + Bridge ≈ 5 yrs spend); invest per your allocation settings.',
  },

  feasibility: {
    title: 'SIP vs surplus',
    assumptions: [
      'Bars stack base monthly SIP (blue) + dedicated SIP for SIP-funded goals (amber) per accumulation year.',
      'Green line is your stated monthly surplus; SIP step-up compounds the base each year.',
    ],
    says: [
      'Whether the total monthly commitment stays under surplus every year until retirement.',
      'Amber spikes reveal years where SIP-funded goals demand extra contributions.',
    ],
    doesntSay: [
      'It does not judge the surplus figure itself — an overstated surplus hides real strain.',
      'Corpus-funded goals never appear here (they withdraw later instead).',
    ],
    howToRead: 'Any year breaching the green line needs a smaller goal, later goal, or bigger surplus.',
  },

  'goals-table': {
    title: 'Goals table',
    assumptions: [
      'Future values use the same inflation and SIP-return settings as the simulation.',
      'Tax column is the estimated LTCG (60% gains, ₹1.25L exemption, 12.5%) embedded in each goal’s cost.',
    ],
    says: [
      'Every milestone with base cost, inflated future value, tax gross-up and required monthly SIP if SIP-funded.',
      'Totals reconcile with the timeline and feasibility views.',
    ],
    doesntSay: [
      'It does not show whether the corpus actually covers these in bad market paths.',
      'Required-SIP figures assume steady returns from today — not guaranteed.',
    ],
    howToRead: 'Audit individual goal math here; test affordability in the optimizer and Lab.',
  },

  compare: {
    title: 'TAPS vs CPS comparison',
    assumptions: [
      'Two deterministic paths (no Monte Carlo spread) on identical career and market settings.',
      'Goal withdrawals are excluded from this comparison (engine limitation).',
    ],
    says: [
      'Side-by-side: assured monthly pension under TAPS vs lump-sum + optional annuity under CPS.',
      'Best for understanding scheme mechanics, not for picking a winner on odds.',
    ],
    doesntSay: [
      'It ignores goal withdrawals and market randomness — both can flip a close call.',
      '“Bigger number” ignores risk: assured pension has zero market variance by design.',
    ],
    howToRead: 'Learn the tradeoff here; decide on survival odds and Lab results, not this panel alone.',
  },

  robustness: {
    title: 'Robustness odds',
    assumptions: [
      'Monte Carlo aggregates over the full path count (seed 42): shortfalls, depletion, terminal bequest, lifetime tax.',
      'Taxes are genuinely deducted from the corpus in-simulation (ADR-008), so odds already reflect the tax drag.',
      'Bequest counts liquid corpus only — annuity money dies with the annuitant and is excluded.',
    ],
    says: [
      'Never-short: paths never hitting zero. Exhausts: paths depleting before plan age (inverse of survival).',
      'Real Bequest: inheritable terminal corpus in today’s money (P50 median, P10 downside). Lifetime Tax: all taxes paid, real terms.',
    ],
    doesntSay: [
      'Percentages are frequencies over simulated paths, not guarantees about your future.',
      'Tax uses frozen FY26-27 slabs for all future years — real slabs will change.',
    ],
    howToRead: 'Healthy = high Never-short, low Exhausts, bequest above your legacy target; then stress-test it below.',
  },

  optimizer: {
    title: 'Goal optimizer & stream planner',
    assumptions: [
      'Reverse solver: bisection search (≤12 iterations, 250 paths each plus a 1,000-path verification, seed 42).',
      'Solves one variable at a time (SIP step-up, monthly SIP, or retirement spend).',
      'Stream costs are indicative 2026 TN private-college estimates grown by stream fee trends — override with actual quotes.',
    ],
    says: [
      'The exact input value needed to hit 90/95/99% survival, with current-vs-solved comparison and one-click Apply.',
      'Per stream: projected total at college entry, required monthly SIP from now, and live plan-survival impact.',
    ],
    doesntSay: [
      'It cannot invent money: infeasible targets return the boundary value, not a miracle.',
      'It never touches asset allocation, returns, or inflation — only the solved variables and goal costs.',
      'Stream figures are estimates, not quotes — verify against actual college fee structures.',
    ],
    howToRead: 'Solve first for the cheapest lever, Apply it, then re-run the Lab to confirm the risk picture improved.',
  },

  'wealth-chart': {
    title: 'Accumulation & drawdown chart',
    assumptions: [
      'Green/liquid lines are the median path; the amber band is the P10–P90 Monte Carlo envelope.',
      'Overlays (red regime, amber what-if) are deterministic single paths, not probability bands.',
    ],
    says: [
      'Lifetime trajectory in nominal ₹ Cr, with the purple marker splitting accumulation from drawdown.',
      'Hover any year for total/liquid/overlay values plus milestone tags.',
    ],
    doesntSay: [
      'The median line is not “the forecast” — half of simulated paths run below it.',
      'Overlay lines are scenarios, not predictions; they share the chart’s scale but not its probabilities.',
    ],
    howToRead: 'Compare the green line against the band edges; drop overlays on top to see when damage lands.',
  },

  'what-if': {
    title: 'What-if crash simulator',
    assumptions: [
      'Crash year + first-year depth (10–50%, presets: 2008 −37%, COVID −23%, dot-com −20%), plus a half-depth echo year and +2pp inflation.',
      'If the crash falls in drawdown, damage bleeds via halved corpus growth (equity returns can’t hit a stable corpus).',
    ],
    says: [
      'Amber dotted trajectory plus the explicit readout: final corpus ₹ and % fall vs the median plan.',
      'Late-horizon crashes move the line little but the % still quantifies the damage.',
    ],
    doesntSay: [
      'The % compares a deterministic shock path against the median plan — two different animals, directionally right, not exact.',
      'It models one crash only; clustered crashes need the Lost Decade regime instead.',
    ],
    howToRead: 'Slide the crash to retirement (the danger zone) first — that % is your sequence-risk number.',
  },

  'stress-regimes': {
    title: 'Stress regimes',
    assumptions: [
      'Five historical/theoretical regimes at 300–500 reduced paths each (seed 99, independent of the headline seed).',
      'Windowed shocks hit only their labeled years; Medical Shock spans the whole horizon.',
    ],
    says: [
      'Holds % (paths sustaining to plan age), median shortfall years, median + P10 bequest, and exhaust % per regime.',
      'Spouse-cover line: TAPS family pension ≈ 60% of pension (G.O.Ms.No.07) — pay-based, shock-proof. Click any row to plot its deterministic path on the wealth chart.',
    ],
    doesntSay: [
      'Reduced paths mean noisier estimates than headline odds — treat 1–2pp gaps as ties.',
      'TAPS pension is pay-based and insulated; these shocks punish the corpus legs only.',
      'P10 bequest reads ₹0 whenever ≥10% of paths deplete — that is the math working, not missing data.',
    ],
    howToRead: 'Find the lowest Holds row — that regime is your plan’s worst enemy; mitigate it first.',
  },

  tornado: {
    title: 'What-If Stress Test (sensitivity tornado)',
    assumptions: [
      'Five one-factor shocks, each re-running Monte Carlo with the identical seed (Common Random Numbers), so deltas are pure parameter effects, not sampling noise.',
      'Bars show the change in plan-holds probability (Δpp), sorted most-damaging first.',
    ],
    says: [
      'Which single assumption breaks the plan most: longevity, medical inflation, equity returns, general inflation, or SIP cover.',
      'Hover any bar for exact holds impact plus median-bequest ₹ impact.',
    ],
    doesntSay: [
      'Factors never move alone in real life — combined shocks (see Stress Lab regimes) usually hurt more than any single bar.',
      'A near-zero bar means insensitive *at current settings*; big input changes can reorder the ranking.',
    ],
    howToRead: 'Fix the top red bar’s underlying input first, then re-run — the ranking updates live.',
  },

  protection: {
    title: 'Family Protection & Term Cover',
    assumptions: [
      'Statutory & voluntary legs: FBF (₹1.5L), Family Security Fund (₹5L), Doctors Corpus Fund (₹1Cr).',
      'Term gap target defaults to 12× annual emoluments (editable target multiple).',
      'Term insurance is excluded from existing liquid asset pool by construction to prevent double-counting.',
    ],
    says: [
      'Itemizes existing liquid pool (Gratuity + CPS + SIP + active non-term protection legs) against target cover.',
      'Displays protection gap and provides indicative 2026 market annual premium estimates by age band.',
      'Checks whether monthly term premium fits comfortably within your monthly surplus.',
    ],
    doesntSay: [
      'Indicative premiums are market range estimates for healthy non-smokers, not binding quotes.',
      '12× income is a rule of thumb — families with heavy milestone goals or loans may require higher cover.',
    ],
    howToRead: 'Check if existing statutory legs cover your target; if a gap remains, click + Add Suggested Term Cover and verify surplus feasibility.',
  },
};

/** Ordered panel ids (stable for tests and future indexes). */
export const PANEL_IDS = Object.keys(PANEL_INFO);
