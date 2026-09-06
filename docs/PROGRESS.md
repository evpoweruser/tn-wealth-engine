# Project Progress & Roadmap

Last Updated: 2026-09-06
Current Status: Active development — Phase 2 complete (commit `877bb36`); whole-project
review baseline recorded 2026-09-06 (see TASK_LOG); HEAD `246b5cd`.

This file is the single source of truth for project state. Deep technical specs live in
`docs/WALKTHROUGH.md` and `docs/ROBUSTNESS_AND_STRESS_PANEL.md` — linked, not duplicated.
Rule: `.agents/rules/tracking.md`. Chronological log: `docs/TASK_LOG.md`. Why-archive: `docs/DECISIONS.md`.

## Immediate Next Tasks (from 2026-09-06 code review — highest priority first)

- (All engine and core features completed!)

## 🎨 Future Visual Appeal & UI/UX Enhancement Roadmap

### 1. Card & Dashboard Micro-Aesthetics
- [x] **Glassmorphism & Multi-Stop Border Glows** — Added floating CSS backdrop-blurs (`backdrop-filter: blur(12px-16px)`) with gradient hover borders to KPI cards and Narrative Card (`KpiCard.module.css`, `NarrativeCard.module.css`).
- [x] **Pulsing Status Badges** — Added CSS pulse glow keyframe animations (`@keyframes pulseGlowSuccess/Warning/Info`) to narrative status badges.
- [ ] **Animated KPI Number Transitions**: Add smooth count-up transitions for primary KPI values (Wealth at Retirement, Monthly Pension, Liquid Base) when slider inputs change.

### 2. Chart Polish & Interactivity
- [x] **Gradient Fills for Monte Carlo Bands** — Added multi-stop SVG linearGradients (`#mcBandGradient`, `#liquidAreaGradient`) for soft area fills in `WealthChart.jsx`.
- [x] **Glowing Tornado Chart Bars** — Added red/green gradient bar fills with cyan/amber highlights and glowing box-shadows in `TornadoChart.module.css`.
- [ ] **Dynamic Stress Overlay Line**: Clicking a stress regime in `StressPanel.jsx` dynamically plots a dashed stress trajectory line over `WealthChart.jsx` for direct visual comparison.

### 3. Config Sidebar & Goal Timeline Visuals
- [x] **Milestone Goal Visual Timeline** — Created interactive horizontal SVG node timeline chart (`MilestoneTimeline.jsx`) showing target ages, future costs, and funding badges (`Corpus` vs `SIP`).
- [x] **Gradient Range Slider Fill** — Updated `RangeInput.module.css` with multi-stop cyan-to-indigo gradient track fill and glowing thumb control.
- [x] **Sidebar Glassmorphism & Header Accent** — Added glass backdrop-blur and cyan pill count badge to `Sidebar.module.css`.

### 4. Solvency India Inspired Visualizations (New Roadmap)
- [ ] **Dual-Axis Spending Breakdown Chart**: Area chart breaking down living expenses into core, discretionary, and healthcare/OOP costs over time.
- [x] **Live Rupee Shorthand Helper**: Live green label converting raw input numbers into Indian words (`₹2.5 Crore` / `₹75 Lakhs` / `₹25k`) across all sidebar inputs and RangeInput components.
- [ ] **Retirement Bucket Allocation Bar**: Horizontal color-coded allocation bar showing cash, bridge, stability, and growth equity split.

## Completed Features

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

- Unit tests: `npm test` (vitest; 48/48 passing as of 2026-09-06 — 40 existing + 8 wiring)
- Lint: `npm run lint` (oxlint; 0 errors, 14 warnings as of 2026-09-06)
- Build: `npm run build` (vite + PWA precache 9 entries, passing as of 2026-09-06)
