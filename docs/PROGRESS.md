# Project Progress & Roadmap

Last Updated: 2026-09-07
Current Status: Tornado redesign (layman labels, opaque tooltips, smart action plan)
shipped 2026-09-07; all roadmap UI + LTC + Wealth Score + hardening done; see TASK_LOG.
Open: private-sector EPF/NPS mode. Idea backlog: Dual-PAN tax, multi-currency NRI mode.

This file is the single source of truth for project state. Deep technical specs live in
`docs/WALKTHROUGH.md` and `docs/ROBUSTNESS_AND_STRESS_PANEL.md` — linked, not duplicated.
Rule: `.agents/rules/tracking.md`. Chronological log: `docs/TASK_LOG.md`. Why-archive: `docs/DECISIONS.md`.

## Immediate Next Tasks (from 2026-09-06 code review — highest priority first)

- (All engine and core features completed!)

## 🏢 Planned: Private-Sector Mode (EPF + NPS toggle)
- [ ] **Scheme toggle (TN Govt vs Private)**: `retireMode: 'private'` alongside taps/cps/compare;
  sidebar scheme switch showing EPF/NPS inputs instead of CPS/TAPS.
- [ ] **EPF accumulation**: `epfBal`, employee + employer monthly contribution, EPF crediting
  rate compounding (review yearly rate), fully withdrawable at retirement.
- [ ] **NPS accumulation + mandatory annuity**: `npsMo` contributions, market-linked growth;
  at retirement 60% lump-sum + **40% mandatory annuity purchase** → monthly pension via
  annuity yield (vs CPS `annPct` which is optional).
- [ ] **Engine integration**: `runPath`/`runMonteCarlo` private branch (EPF+NPS corpus,
  NPS annuity pension, gratuity), robustness/tax/score/stress/sensitivity reuse as-is.
- [ ] **Headline + PDF**: KpiGrid/ComparePanel private-mode cards, PDF private section,
  narrative support, `buildSimParams` new fields, tests (accumulation math, 60/40 split).

## 👪 Planned: Family Tab (everything children + survivor cover)

View shell + content move:
- [ ] **Family view shell** — third header tab (Plan | Family | Stress Lab), persisted
  `tn_view`, lazy-loaded chunk; `Dashboard.jsx` switch; sidebar drops ChildrenSection
  (→5 sections) with a "N goals →" Family link for discoverability.
- [ ] **Move family content** — child input cards, MilestoneTimeline, GoalsTable,
  Stream Planner (extracted standalone from GoalOptimizerPanel; Reverse Solver stays
  in Lab), FeasibilityChart. PDF print root is view-independent — export unaffected.

Survivor calculator ("if I die in service", death-year slider across service years):
- [ ] **Engine** — `projectEmolumentsAtYear` (same stepping as `projectLastPay`;
  pinned ≡ lastPay at rYr), new `src/engine/survivor.js`, `familyPension` passthrough
  (already in runPath/MC mid). Balances at death year read from median records.
- [ ] **Logic** — spouse two-phase pension: enhanced 50% of emoluments × 7 yrs, then
  normal 60%-of-notional-pension (0.6 × 50% emoluments), DA-indexed, labeled. DCRG
  gratuity by service slab (<1y 2×, 1–5y 6×, 5–11y 12×, 11–20y 20×, 20+y ½-month per
  6 months up to 33× monthly emoluments, ₹25L cap) — slabs re-verified at build.
  Lump stack = gratuity + SIP/CPS balances at death year + protection legs below.
  Children-inherit pool = full lump stack. No mortality weighting ("if", not "when").
- [ ] **Assumptions (locked)** — TAPS family pension 60% of last pension drawn per
  G.O.Ms.No.07 09-01-2026 (DA at par; sources: News18 G.O. FAQ, GKToday,
  govtschemes.in, usthadian). Pre-2003 TN rules context: enhanced 50% × 7yrs/till 65
  (tn.gov.in Treasuries). CPS lump-sum: no family pension (annuity spouse option
  unmodeled). Nominees/succession law, end-of-life bills, inheritance tax: unmodeled.
  DCRG ₹25L ceiling noted.

Protection legs (all toggles + term amount live in the Family tab Protection section):
- [ ] **Family Benefit Fund — flat ₹1.5L** (Treasuries karuvoolam; incl ₹5k funeral
  advance within it). Toggle `fbfOn`, default on.
- [ ] **Family Security Fund — flat ₹5L** (2021 revision, ₹110/mo subscription).
  Toggle `securityOn`, default on. Separate leg from FBF (different scheme/G.O.).
- [ ] **Doctors Corpus Fund — flat ₹1Cr** (TNGDA voluntary scheme, ₹500/mo; reported
  2024 on-duty payouts, G.O. Oct 2021). Toggle `dcfOn`, default on. Labeled:
  members-only, duty-death basis, figure fund-dependent — confirm current.
- [ ] **Term cover — user amount, default ₹0 (none held)**. Pure private-policy money:
  needs in-force policy; independent payer/trigger from DCF (contractual sum vs
  pooled fund). No premium modeling.
- [ ] **Engine** — `PROTECTION_LEGS` table (amounts + qualifiers + sources) +
  `protectionLump()` itemized math; survivor result gains legs, protection total,
  family-pool total. State via existing validation/clamp pattern.

Term-cover gap planner (no term held → plan the purchase):
- [ ] **Logic** — suggested target = 12 × annual income (prefilled from emoluments,
  multiple editable); pool = gratuity + SIP/CPS-to-date + FBF/Security/DCF (term
  excluded by construction); gap = max(0, target − pool); CTA sets `termAmt`.
- [ ] **Premium estimator** — indicative annual premium by age band (30–34 / 35–39 /
  40–44 / 45–49 / 50+, healthy-non-smoker market ranges, verified at build),
  always overridable; feasibility check vs monthly surplus. Informational only —
  no simulation drag. Labeled "get real quotes", never presented as quotes.
- [ ] **Assumptions (locked)** — 12× is a rule of thumb, not advice; goals-heavy
  families may need more (multiple is editable, pool math stays visible).

Docs/tests/ship:
- [ ] **Docs** — ADR-011 (stack + every source incl. TNGDA/DCF links), About §7
  extension (+Security Fund, DCF, term rows), panelInfo survivor entry,
  content-shape test coverage for new copy.
- [ ] **Tests** — emoluments-at-Y ≡ lastPay at rYr; slab boundaries; phase-1→phase-2
  math; leg toggles; gap math (covered/zero/shortfall); premium band boundaries +
  monotonicity; prefill from emoluments. Existing suites untouched (additive only).
- [ ] **Verify + ship** — full `vitest`/lint/build, three-tab click-through, PDF from
  each view, commit/push/deploy + live check.

## 🎨 Future Visual Appeal & UI/UX Enhancement Roadmap

### 1. Card & Dashboard Micro-Aesthetics
- [x] **Glassmorphism & Multi-Stop Border Glows** — Added floating CSS backdrop-blurs (`backdrop-filter: blur(12px-16px)`) with gradient hover borders to KPI cards and Narrative Card (`KpiCard.module.css`, `NarrativeCard.module.css`).
- [x] **Pulsing Status Badges** — Added CSS pulse glow keyframe animations (`@keyframes pulseGlowSuccess/Warning/Info`) to narrative status badges.
- [x] **Animated KPI Number Transitions** — `useCountUp` eased transitions wired via `KpiCard` (`countTo`/`countFormat`) across `KpiGrid` + `RobustnessGrid`.

### 2. Chart Polish & Interactivity
- [x] **Gradient Fills for Monte Carlo Bands** — Added multi-stop SVG linearGradients (`#mcBandGradient`, `#liquidAreaGradient`) for soft area fills in `WealthChart.jsx`.
- [x] **Glowing Tornado Chart Bars** — Added red/green gradient bar fills with cyan/amber highlights and glowing box-shadows in `TornadoChart.module.css`.
- [x] **Dynamic Stress Overlay Line** — Clicking a StressPanel row toggles a deterministic
  stressed trajectory (dashed red line) over `WealthChart.jsx` (`App.jsx` overlay state).

### 3. Config Sidebar & Goal Timeline Visuals
- [x] **Milestone Goal Visual Timeline** — Created interactive horizontal SVG node timeline chart (`MilestoneTimeline.jsx`) showing target ages, future costs, and funding badges (`Corpus` vs `SIP`).
- [x] **Gradient Range Slider Fill** — Updated `RangeInput.module.css` with multi-stop cyan-to-indigo gradient track fill and glowing thumb control.
- [x] **Sidebar Glassmorphism & Header Accent** — Added glass backdrop-blur and cyan pill count badge to `Sidebar.module.css`.

### 4. Solvency India Inspired Visualizations (New Roadmap)
- [x] **Dual-Axis Spending Breakdown Chart** — `SpendingChart.jsx` stacked living/healthcare
  areas from median-path drawdown records (`expLiv`/`expMed` recorded by `runPath`).
- [x] **Live Rupee Shorthand Helper**: Live green label converting raw input numbers into Indian words (`₹2.5 Crore` / `₹75 Lakhs` / `₹25k`) across all sidebar inputs and RangeInput components.
- [x] **Retirement Bucket Allocation Bar** — `BucketBar.jsx` heuristic bar
  (Cash 2y spend / Bridge 3y / Stability 40% / Growth 60% of liquid remainder).

## Completed Features

- [x] **Stress Lab view + what-if crash + retirement crash (2026-09-07, ADR-009)** —
  header Plan/Stress-Lab tabs (persisted, lazy-loaded Lab chunk); Lab hosts robustness,
  optimizer, wealth chart, what-if controls, regimes, tornado; interactive crash
  simulator (year + 10–50% depth sliders, 2008/COVID/dot-com presets, amber dashed
  line coexisting with regime overlay); `retire_crash` regime (rYr−1…rYr+1 + fading
  year, post-ret growth halved); PDF export auto-switches views for chart capture.
- [x] **What-if terminal fall readout (2026-09-07)** — `terminalFallPct` compares the
  shocked terminal corpus vs the median plan at the last common year; shown in the
  chart legend badge and the controls card as final-corpus ₹ + % fall.
- [x] **College Stream Planner (2026-09-07)** — replaced the confusing stepper matrix:
  curated Arts/Engineering/Medical/Management dataset (indicative 2026 TN costs +
  fee trends) with exact per-course-year projection, required-SIP math, live survival
  impact via the existing tradeoff engine, quote override, and one-click Apply.
- [x] **Panel ⓘ explainers (2026-09-07)** — `src/content/panelInfo.js` map (15 panels ×
  assumptions / says / doesn’t-say / how-to-read) + shared `InfoButton` modal;
  wired into every Plan + Lab panel header (incl. slim headers for grid-only panels;
  StressPanel badge corrected 4→5 regimes).
- [x] **Inheritance + spouse cover (2026-09-07, ADR-010)** — bequest is liquid-only
  terminal (annuity excluded; TAPS identical, CPS+annuity drops to truth); TAPS family
  pension 60%-of-pension per G.O.Ms.No.07 returned by engine; stress table gains
  BEQUEST P50 + P10 depleted hints + spouse-cover line; PDF Page-4 spouse row;
  About tab §7 (family pension & inheritance, gratuity note, verify-with-Treasury).

- [x] **Withdrawal-year taxation (2026-09-07, ADR-008)** — goal LTCG split into net
  withdrawals + year-keyed tax map (exact-year deduction/deflation, totals identical
  to legacy gross); terminal SIP-liquidation LTCG at retirement (60% gains, CPS/gratuity
  exempt); pension tax as monthly drawdown drag; midpoint discount removed.

- [x] **Sensitivity tornado visualization upgrade (2026-09-07)** — true diverging
  center-axis bars (damage left/red, benefit right/green, symmetric scale), rank
  badges, hover impact cards (holds Δpp + median-bequest Δ₹), axis end labels;
  engine adds `baseBequestP50`/`bequestP50` per shock (`sensitivity.js` + tests).
- [x] **Tornado redesign follow-up (2026-09-07, `43eaa76`)** — layman-friendly labels
  (`friendlyLabel`/`friendlyDesc`) + per-shock smart action-plan suggestions
  (`suggestion` {icon, headline, body}); verified live on apex.

- [x] **Smart Goal Optimizer & Reverse Solver (2026-09-07)** — `src/engine/solver.js` (bisection solver for 90/95/99% survival rate + goal tradeoff evaluator) + `GoalOptimizerPanel.jsx` (interactive solver UI & tradeoff matrix) + 3 unit tests (`solver.test.js`).
- [x] **Dead-code cleanup (2026-09-06)** — deleted unreferenced `src/assets/{react,vite}.svg`,
  `src/assets/hero.png`, `public/icons.svg`, and local repomix dumps (~370 KB); removed unused
  `useState/useEffect` (`useSimulation.js`), `ASSET_RETURNS` + `derivedState` (`SipSection.jsx`),
  `results` prop + `goals` (`ComparePanel.jsx` + caller), `retireYear` param (`computeGoals`
  + caller). Uncommitted in working tree; full record in TASK_LOG.
- [x] **PDF robustness & stress resilience section** (`src/utils/pdfReport.js`) — Added dedicated
  Plan Robustness & Stress Resilience vector table to Page 4 of exported PDF reports.

- [x] **Drawdown-loop overlay invocation** (`src/engine/simulation.js`) — `yearlyOverlay(base, accYears + j)`
  invoked per drawdown year for windowed and all-years stress inflation regimes.
- [x] **Cumulative inflation indices for real deflators** (`src/engine/simulation.js`) — Replaced
  closed-form `Math.pow(1+rate, t)` with running cumulative products (`cumInfL`, `cumInfM`, `cumInfC`)
  for 100% exact deflation under variable stress inflation rates.
- [x] **runPath overlay wiring test suite** (`src/engine/__tests__/simulation-wiring.test.js`) — 8 unit
  tests validating identity overlays, constant-rate equivalence, window reconvergence, and drawdown inflation.

- [x] **Robustness Grid (4 cards)** — Never-short %, Exhausts %, Real Bequest, Lifetime Tax
  (`src/components/dashboard/RobustnessGrid.jsx`, `src/engine/tax.js`, seeded RNG +
  accumulators in `src/engine/simulation.js`) — commit `590fc59`.
- [x] **Stress Testing Panel (4 regimes)** — `src/engine/stress.js` + `StressPanel.jsx` +
  `useStressPanel` hook, reduced paths, real goal withdrawals — commit `590fc59`.
- [x] **Windowed stress overlays (P0 fix)** — `yearlyOverlay(rates, yearIdx)` callback threaded
  into `runPath` accumulation loop; regimes shock only labeled years — commit `590fc59`.
- [x] **Longevity gating** — "Depletes YYYY" shown only when `exhaustPct > 50`
  (`KpiGrid.jsx:47`, `pdfReport.js`) — commit `590fc59`.
- [x] **Sensitivity tornado with CRN** — `src/engine/sensitivity.js`, identical seed for
  baseline + shocks, `TornadoChart.jsx` — see TASK_LOG for commit.
- [x] **Auto Narrative + PDF Executive Summary** — `src/utils/narrative.js`,
  `NarrativeCard.jsx`, 4 unit tests — commit `877bb36`.
- [x] **Visual revamp + light/dark themes** — design tokens, sticky header, chart polish
  (see `git log` pre-`590fc59`).
- [x] **Multi-page vector PDF report** — `src/utils/pdfReport.js` (`Rs.` glyph-safe).
- [x] **Lean reviewer + progress-setter install** — `opencode.json` (agents `build, planner,
  code-reviewer, tdd-guide`; commands `/plan, /tdd, /code-review, /security, /verify,
  /checkpoint, /test-coverage`) + `.opencode/skills/{tdd-workflow,verification-loop,
  security-review,coding-standards,frontend-patterns,architecture-decision-records}/SKILL.md`
  extracted from ECC (uncommitted; see TASK_LOG).
- [x] **Whole-project review baseline (2026-09-06)** — confirmed open: drawdown-loop overlay
  P0 (`simulation.js:178-236` never calls `yearlyOverlay`), cumulative inflation P1 (no
  `cumC/cumL/cumM`, closed-form `Math.pow`), wiring-test gap P1, PDF stress/sensitivity
  P0 (`pdfReport.js:60-77` ignores `stress-panel`/`sensitivity` hooks). New P0: PWA icons
  missing (`vite.config.js:19-36` vs `public/`). New P1s: compare/PDF `withdrawals={}`,
  per-render `simParamsForStress` recompute, eager Recharts, single error boundary, dead
  `isLoading:false`. Security: clean (no secrets, no sinks, `npm audit --high` 0 vulns);
  input validation MEDIUM (no clamping/schema). Full report in TASK_LOG entry.

## Verification Commands

- Unit tests: `npm test` (vitest; 95/95 passing as of 2026-09-07 — 11 suites: tax 9,
  narrative 4, wiring 22, stress 26, solver 4, sensitivity 8, goals 3, score 6,
  validation 4, panelInfo 2, streams 7)
- Lint: `npm run lint` (oxlint; 0 errors, 16 warnings as of 2026-09-07 — all pre-existing class)
- Build: `npm run build` (vite + PWA precache 24 entries, passing as of 2026-09-07;
  Recharts panels + StressLabView code-split — lazy chunks, main ~1.28 MB)
