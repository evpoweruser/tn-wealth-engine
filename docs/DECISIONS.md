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

## ADR-009: Anchor-relative regimes + postRet in the overlay contract
- **Context**: All stress windows were anchored to accumulation year 0, leaving the
  retirement boundary (peak corpus, no recovery runway) untestable. Additionally,
  overlay `sXirr` is inert in drawdown years (growth uses `postRetRate`), so a crash
  spanning retirement would silently stop biting exactly when it hurts most.
- **Decision**: `applyRegimeOverlay` takes optional `anchorIdx` (retirement = accYears;
  existing regimes ignore it); the overlay return may carry `postRet` (number or
  'halve'/'quarter' directive) which `runPath` resolves against `params.postRetRate`
  in the drawdown monthly loop. Absent/invalid → base rate (bit-identical legacy).
  `retire_crash` uses both: window anchor−1…anchor+1 + fading anchor+2, SIP −30%/−12%,
  halved/quartered growth, +2pp inflation.
- **Do not**: read `postRet` anywhere except the drawdown growth line; do not anchor
  new regimes to year 0 when the risk is boundary-relative.

## ADR-010: Inheritance is liquid-only; spouse cover is 60% of pension
- **Context**: The stress table's P10 bequest read ₹0 everywhere (correct math — every
  regime depletes ≥10% of paths), prompting the inheritance question. Audit found the
  bequest figure *included* the annuity corpus in CPS+annuity mode — money that dies
  with the annuitant. Separately, TAPS family pension (G.O.Ms.No.07, 09-01-2026) pays
  the eligible spouse **60% of the pension last drawn** with DA at par (sources:
  News18 G.O. FAQ, GKToday, govtschemes.in, usthadian; pre-2003 TN rules: enhanced
  50% of emoluments for 7 yrs/till 65 per tn.gov.in Treasuries).
- **Decision**: `bequestNominal/bequestReal` = terminal liquid only
  (`liquid / cumInfC`, exact; TAPS bit-identical, CPS+annuity drops to the truthful
  value). `runPath` returns `familyPension` = 0.60 × tapsPension in TAPS (DA-indexed
  in reality, labeled as such), 0 in CPS; pay-based so identical across regimes —
  shown as a single spouse-cover line, not a column. Stress table shows BEQUEST P50
  (median, nonzero) beside P10 (₹0 + depleted hint when exhaust ≥ 10%).
- **Do not**: count annuity corpus as inheritable without annuitant-survivor modeling;
  do not simulate family pension as a stochastic leg (no mortality distribution —
  estimator only); DCRG ₹25L ceiling intentionally unmodeled.

## ADR-008: Withdrawal-year taxation is deducted from the corpus (supersedes ADR-003 display-only)
- **Context**: Lifetime tax mixed three bills with different timing: annual pension
  income tax (correct as annual), goal-withdrawal LTCG (grossed into withdrawals +
  midpoint-discounted into display), and terminal liquidation (untaxed). ADR-003's
  display-only rule hid real liabilities from survival math.
- **Decision**: (1) Goal withdrawals are booked NET (`computeWithdrawals`) with a paired
  year-keyed LTCG map (`computeWithdrawalTaxes`); both deducted in the withdrawal year
  with exact-year deflation — totals identical to the old gross treatment, timing now
  exact. (2) One-time LTCG on SIP corpus liquidation at retirement (60% gains fraction
  shared via `LTCG_*` constants; CPS/gratuity untouched). (3) Pension tax acts as a
  monthly drag (`netDrawdown += tax/12`). All three accumulate nominal + exact-real.
  Shared `estimateWithdrawalLtcg` + constants in `goals.js` prevent fraction drift.
- **Do not**: reintroduce midpoint/lump discounting for goal taxes; do not apply the
  terminal tax to CPS balances or gratuity without a new ADR (exempt treatment assumed).
