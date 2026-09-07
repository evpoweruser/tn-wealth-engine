# Future Feature & Correctness Plan

> **Sequencing guard:** do not start P1 until the Family-tab tree is green and pushed.
> Re-verify with `npm test`, `npm run lint`, `npm run build`, `git status` clean.
> Last reviewed: 2026-09-07. Owner: single-maintainer project — one item at a time.

Each item states *why now*, *scope*, and *done-when*. Items migrated from
`docs/FUTURE_SUGGESTIONS.md` are marked; that file's shipped entries (§1 Smart Goal
Optimizer, §3 LTC, §5 Wealth Score) are retired by this document — do not plan them twice.

---

## P0 — Correctness sweep (first)

### 1. Reverse Solver feasibility messaging + fewer paths
- **Why:** infeasible targets currently return the current value with +0 delta — a
  non-answer disguised as a recommendation (reported by user, spec agreed in TASK_LOG).
- **Scope:** `solveTargetSurvival` feasibility gate (evaluate `maxVal` first; return
  `{ feasible:false, maxAchievablePct }`, skip bisection + verification); amber panel
  state with max-achievable + lever-switch buttons; defaults `mcRuns` 250→100, final
  verification 1000→500.
- **Done-when:** infeasible-target unit test green; feasible paths unchanged; user confirms honest messaging live.

### 2. mcWorker: wire up or delete
- **Why:** `src/workers/mcWorker.js` is unreferenced dead code silently diverging from
  main-thread math (only parity-forwarded, never executed).
- **Scope:** decision record + either delete (remove file, barrel/docs mentions) or wire
  headline MC through it with parity tests. Deletion is the default recommendation.
- **Done-when:** zero unreferenced engine entry points (`grep` clean) or worker-backed MC with passing parity suite.

### 3. Stale-doc refresh
- **Why:** `FUTURE_SUGGESTIONS.md` still lists shipped items as future;
  `ROBUSTNESS_AND_STRESS_PANEL.md` lists 4 regimes + pre-drawdown formulas;
  `WALKTHROUGH.md` counts (36 tests) are fossilized; ADR numbering is out of order
  (008 filed after 010).
- **Scope:** mark/retire shipped entries (link here), update regime tables + formulas,
  refresh counts, add ordering note to DECISIONS.md. No code.
- **Done-when:** a fresh reader can trust every doc's numbers.

---

## P1 — Features (ranked)

### 4. Private-sector EPF/NPS mode
- **Why:** biggest open todo; unlocks non-government users. Full spec already in
  `docs/PROGRESS.md` (scheme toggle, EPF compounding, NPS 60/40 annuity split,
  engine branch, headline + PDF).
- **Done-when:** spec checkboxes complete + live check.

### 5. Family Dual-PAN tax engine
- **Why:** households split withdrawals across PANs to double exemptions and lower
  slab tiers; single-PAN modeling overstates their tax (spec: `FUTURE_SUGGESTIONS.md` §2).
- **Scope:** spouse income split, optimized asset titling hints, dual exemption limits.
- **Done-when:** dual-PAN tests green; single-PAN path bit-identical (ADR-003/008 guard).

### 6. Combined-shock regimes
- **Why:** the tornado's own explainer admits single-factor shocks understate real
  crises. All building blocks exist (`anchorIdx`, `postRet` bleed, what-if engine).
- **Scope:** 1–2 combined regimes (e.g. crash + stagflation tail) on the overlay contract.
- **Done-when:** regime tests + panel rows + PDF row, same pattern as `retire_crash`.

### 7. Term-premium-as-drag modeling
- **Why:** deferred from the informational-only premium decision; a real premium is a
  real accumulation expense.
- **Scope:** annual premium deducted yearly during accumulation (new engine spend leg),
  toggleable; re-baseline solver expectations.
- **Done-when:** drag tests + toggle + docs; default off (ADR-006 pattern).

### 8. Stream dataset 2027 refresh process
- **Why:** fee figures age yearly; a 1pp trend error over 15 years moves Medical totals
  by lakhs. Currently a one-line wish, not a process.
- **Scope:** dated refresh checklist (sources, override audit, test updates), recorded in TASK_LOG each cycle.
- **Done-when:** 2027 figures in `streams.js` with updated `sourceYear` + passing tests.

---

## P2 — Experience & reach

### 9. Multi-currency NRI mode
- **Why:** returning expats / NRI civil servants (spec: `FUTURE_SUGGESTIONS.md` §4).
- **Scope:** display-layer currency toggle (USD/AED/SGD/EUR) with fixed deflators; engine untouched.

### 10. Tamil-language toggle
- **Why:** the audience is TN government staff; `panelInfo.js` + modal copy are already
  isolated strings — highest reach-per-effort on this list.
- **Scope:** string table + toggle, Tamil for panel explainers and headers first.

### 11. Onboarding tour reusing panelInfo copy
- **Why:** the explainer content already exists and is tested for shape; surfacing it
  on first run converts documentation into guidance.

### 12. First component tests
- **Why:** the repo has zero; the string/number tradeoff bug class is the standing exhibit.
- **Scope:** render tests for 2–3 critical panels (tradeoff matching, overlay merge) with jsdom + testing-library (new devDeps).

### 13. Manual PDF pixel-verification checklist
- **Why:** TASK_LOG repeatedly notes "can't verify headless" — convert to a repeatable
  human checklist (both views, both themes, overlays on/off) stored in this repo.

---

## Explicitly deferred (with reasons)

- **Mortality-weighted survivor view** ("expect" vs "if") — rejected in Family-tab assumptions; would need mortality tables we won't vouch for.
- **PWA screenshots** — low value, asset weight.
- **Annuity-spouse-option modeling** — needs insurer product rules we don't have.
- **EPF yearly-rate auto-review** — listed under item 4 instead; not standalone.
