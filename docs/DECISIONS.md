# Architectural Decision Records (ADRs)

## ADR-001: Longevity display gated on `exhaustPct > 50`
- **Context**: `runMonteCarlo` returns `mid.depletedYear` as the median depletion year
  *among exhausted runs*. For healthy plans (e.g. 3–5% exhaust), this is a non-null year
  from minority failure paths.
- **Decision**: `KpiGrid.jsx:47` and `pdfReport.js` show "Depletes YYYY" only when
  `exhaustPct > 50`; otherwise "Age {lifeAge}+" / sustain copy.
- **Rationale**: A 95%-success plan must not display a red depletion year derived from
  outlier runs next to a green Plan-Success card.
- **Do not**: revert to displaying raw `mid.depletedYear` without a majority gate.

## ADR-002: Common Random Numbers (CRN) in sensitivity analysis
- **Context**: Per-shock seeds (`rngSeed + idx*100`) let Monte Carlo sampling noise swamp
  small parameter-shock signals (Δpp) in the tornado chart.
- **Decision**: `sensitivity.js` enforces an identical `rngSeed` across baseline and all
  shock runs, isolating the parameter change into a pure deterministic delta.
- **Rationale**: Standard variance-reduction practice; makes small bars trustworthy.
- **Do not**: reintroduce per-shock seeds without also raising reduced-path counts to
  compensate for the added noise.

## ADR-003: Lifetime-tax scope (FY26-27 new regime, single PAN, informational)
- **Context**: The engine had only per-goal LTCG gross-ups; no income-tax module.
- **Decision**: `tax.js` implements FY26-27 new-regime slabs + ₹75,000 standard deduction +
  4% cess for pension/annuity income (single PAN), plus deflated Σ goals-LTCG added as
  display-only (goal tax is already embedded in `grossFV` withdrawals — never deduct twice).
- **Rationale**: Planning-grade estimate without dual-PAN complexity. Constants in one
  file (`TAX_YEAR`, `SLABS`) so Finance Bill changes touch one place.
- **Do not**: treat the goals-LTCG addend as a second deduction from corpus.

## ADR-004: Stress overlays are accumulation-only (known limitation)
- **Context**: The `yearlyOverlay(rates, yearIdx)` callback in `runPath` is invoked only in
  the accumulation loop (`simulation.js:93-104`); the drawdown loop uses base scalars.
- **Decision (status quo, 2026-09-06)**: accepted temporarily; tracked as the top item in
  `docs/PROGRESS.md` ("Drawdown-loop overlay invocation").
- **Rationale for fixing (not keeping)**: Stagflation/Lost-Decade inflation halves never
  raise retirement spending, and the Medical-Shock regime (+2pp `infM`) is effectively
  inert. Time-limited windows self-disable past their window by existing
  `applyRegimeOverlay` semantics, so extending invocation to drawdown years is safe.
- **Do not**: assume any stress result reflects drawdown-phase inflation until this is fixed.

## ADR-005: Engine takes engine-unit params via `buildSimParams`, never raw context state
- **Context**: Production crashed on load for users with saved children —
  `TypeError: Cannot read properties of undefined (reading 'tot')` from
  `runMonteCarlo` (`simulation.js:356`, `x.records[riIdx].tot` with `riIdx = -1`).
  Root cause: `GoalOptimizerPanel` passed raw context `state` (no `bYr`/`rYr`/`endYr`,
  percent-unit rates) into `evaluateGoalTradeoff` → `runMonteCarlo`, so
  `Math.max(0, NaN)` loop bounds produced zero records. Unit tests missed it because
  mocks spread engine-unit params. The solver also called `computeGoals` with a wrong
  5-arg signature (doj/dor strings as the inflation object → NaN goals) and passed
  `withdrawals: {}`.
- **Decision**: `src/engine/params.js` `buildSimParams(state, derivedState)` is the single
  params builder (used by `useSimulation`, `GoalOptimizerPanel`); solver functions take
  engine-unit `simParams` + canonical `computeGoals`/`computeWithdrawals` calls with real
  withdrawals; `runMonteCarlo` throws a descriptive error on zero records; engine call
  sites in render-path `useMemo`s are try/catch-guarded to null.
- **Do not**: pass context `state` directly to any `src/engine` function; always go
  through `buildSimParams`. Mocks in engine tests must use engine-unit params.

## ADR-006: LTC modeling is opt-in and off by default
- **Context**: Age-tiered medical inflation (+3pp from 65) and the age-75
  critical-illness shock change drawdown math materially. Enabling silently would
  shift every existing user's survival/bequest numbers and break solver baselines.
- **Decision**: `runPath` gates all LTC behavior on `params.ltcOn === true`
  (engine defaults: step age 65, +3pp, shock age 75, ₹5L); `buildSimParams` maps
  `state.ltcOn === true`; UI toggle lives in `MonteCarloSection`. Off → records
  (plus new spend fields) are numerically identical to pre-LTC runs.
- **Do not**: flip the default on without also re-baselining solver/test expectations
  and announcing the change to users.

## ADR-007: Dashboard panels fail independently
- **Context**: The production `.tot` crash showed one panel error blanking the app
  through a single top-level boundary.
- **Decision**: Every dashboard panel is wrapped in `PanelErrorBoundary` (compact
  inline fallback + console error). Shared shell (header/sidebar) stays outside so
  the app remains usable when one panel fails.
- **Do not**: add unguarded engine calls in render-path `useMemo`s; return null or
  catch to the boundary.
