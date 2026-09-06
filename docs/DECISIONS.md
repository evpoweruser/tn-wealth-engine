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
