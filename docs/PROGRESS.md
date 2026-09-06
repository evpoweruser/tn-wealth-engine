# Project Progress & Roadmap

Last Updated: 2026-09-06
Current Status: Active development — Phase 2 complete (commit `877bb36`).

This file is the single source of truth for project state. Deep technical specs live in
`docs/WALKTHROUGH.md` and `docs/ROBUSTNESS_AND_STRESS_PANEL.md` — linked, not duplicated.
Rule: `.agents/rules/tracking.md`. Chronological log: `docs/TASK_LOG.md`. Why-archive: `docs/DECISIONS.md`.

## Immediate Next Tasks (from 2026-09-06 code review — highest priority first)

- [ ] **Drawdown-loop overlay invocation** (`src/engine/simulation.js`): the `yearlyOverlay`
  callback fires only in the accumulation loop. Drawdown spend/pension/deflators use base
  scalars, so Stagflation/Lost-Decade inflation halves never bite in retirement and the
  Medical-Shock regime (+2pp `infM`, all years) is effectively inert. Fix: invoke
  `overlayFn(base, accYears + j)` per drawdown year. No signature changes needed.
  See `docs/DECISIONS.md` ADR-004 for why accumulation-only is the status quo.
- [ ] **Cumulative inflation indices for `real` deflators** (`src/engine/simulation.js:141,152,183,186-187`):
  closed-form `Math.pow(1+rate, elapsed)` is exact only for constant rates; under stress
  overlays it misstates real values (overstates bequest P10/P50 in crash paths). Fix:
  running `cumC/cumL/cumM` products; pension ratio `tapsP * cumC[now]/cumC[retire]`.
- [ ] **runPath-level overlay wiring tests** (`src/engine/__tests__/`): identity
  (`null` ≡ identity overlay), constant-rate equivalence, window reconvergence / probe
  call-order. Existing `stress.test.js` covers only the pure `applyRegimeOverlay`, not
  the wiring — the exact bug class fixed in `590fc59` is untested.
- [ ] **PDF robustness/stress sections** (`src/utils/pdfReport.js`): `data-pdf="stress-panel"` /
  `"sensitivity"` hooks exist in the UI but the PDF builder ignores them. Either wire
  sections in or remove the hooks.

## Completed Features

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

## Verification Commands

- Unit tests: `npm test` (vitest; 40/40 passing as of 2026-09-06)
- Build: `npm run build`
