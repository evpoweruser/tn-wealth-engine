# Implementation Walkthrough & Bug Fix Log

This document provides a comprehensive technical walkthrough of the **TN Pension & SIP Wealth Engine**, detailing the migration from legacy single-file HTML to React + Vite, architecture design, and the full audit and resolution log of the Robustness & Stress Testing modules.

---

## 🏗️ Architecture & Component Overview

The application follows a clean separation between pure domain logic (`src/engine`), async worker execution (`src/workers`), custom state hooks (`src/hooks`), and UI presentation (`src/components`).

### Engine Modules (`src/engine/`)
- `simulation.js`: Core deterministic (`runPath`) and Monte Carlo stochastic (`runMonteCarlo`) wealth accumulation and retirement drawdown simulation loops. Supports custom per-year overlays via `yearlyOverlay`.
- `stress.js`: Pre-defined historical and theoretical market stress regimes (Early Crash, Stagflation, Lost Decade, Healthcare Shock) executed at reduced path counts (300–500) for real-time interactivity.
- `sensitivity.js`: One-factor parameter sensitivity analysis using **Common Random Numbers (CRN)** variance reduction to compute baseline vs. shocked plan hold probabilities.
- `tax.js`: Comprehensive Indian Income Tax calculation (FY 2026-27 New Tax Regime slabs, 4% Health & Education Cess, ₹75,000 standard deduction, and LTCG rates).
- `career.js`: Service salary trajectory, Pay Matrix step increases, and CPS/TAPS pension contribution compounding.
- `goals.js`: Inflation-adjusted life event milestones (Higher Secondary, College, Marriage) and liquid corpus withdrawal schedules.

---

## 🛠️ Complete Bug-Fix Audit Log

Below is the verified audit and resolution record for the 6 critical code review findings:

| # | Component | Severity | Root Cause Identified | Resolution Implemented | Verified File Links |
|---|-----------|----------|-----------------------|------------------------|---------------------|
| **1** | `stress.js` & `simulation.js` | **P0** | Hardcoded `yearIdx = 0` in `applyRegimeOverlay` applied time-limited shocks (e.g. Early Crash yrs 0–1) across all ~30 accumulation years. | Threaded a `yearlyOverlay(rates, yearIdx)` callback into `runPath` accumulation loop so windowed regimes shock only labeled years. | [simulation.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/engine/simulation.js#L56) · [stress.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/engine/stress.js#L137) |
| **2** | `KpiGrid.jsx` & `pdfReport.js` | **P0** | `mid.depletedYear` was displayed directly without gating, causing healthy plans (97% survival) to show red "Depletes YYYY" due to rare outlier failure runs. | Gated longevity display on `exhaustPct > 50` so "Depletes YYYY" only shows when the majority of paths fail. | [KpiGrid.jsx](file:///home/abinanthan/Projects/tn-wealth-engine/src/components/dashboard/KpiGrid.jsx#L44) · [pdfReport.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/utils/pdfReport.js#L173) |
| **3** | `useStressPanel.js` & `useSensitivity.js` | **P1** | Hooks passed empty `{}` withdrawals into stress & sensitivity runs, omitting ~₹50L+ in corpus-funded child milestone withdrawals. | Added `computeWithdrawals(debouncedDerived.goals)` call in both hooks to pass active withdrawal schedules into simulations. | [useStressPanel.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/hooks/useStressPanel.js) · [useSensitivity.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/hooks/useSensitivity.js) |
| **4** | `sensitivity.js` | **P1** | Each shock run used a different PRNG seed (`rngSeed + idx*100`), causing MC sampling noise to swamp small parameter delta signals in the Tornado Chart. | Enforced identical `rngSeed` across baseline and all shock runs (Common Random Numbers variance reduction). | [sensitivity.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/engine/sensitivity.js#L98) |
| **5** | `RobustnessGrid.jsx` & `simulation.js` | **P2** | Lifetime tax card omitted nominal goal LTCG tax and discounted drawdown tax using a single midpoint deflator. | Added `goalsLtcgNominal` to tax accumulator and refactored drawdown tax deflation to accumulate real tax per-year inside the loop. | [simulation.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/engine/simulation.js#L175) · [RobustnessGrid.jsx](file:///home/abinanthan/Projects/tn-wealth-engine/src/components/dashboard/RobustnessGrid.jsx#L73) |
| **6** | `mcWorker.js` | **P2** | Web Worker returned stale `depletedYear: null` and omitted robustness stat fields. | Synchronized `mcWorker.js` aggregations (`deplYearMed`, `exhaustPct`, `neverShortPct`, tax) with main thread simulation output. | [mcWorker.js](file:///home/abinanthan/Projects/tn-wealth-engine/src/workers/mcWorker.js#L63) |

---

## 🧪 Verification & Automated Testing

### Vitest Unit Test Suite
The unit testing suite validates tax logic, stress regimes, and sensitivity calculations:
```bash
npm run test
```
**Test Results:**
- `src/engine/__tests__/tax.test.js`: 9 passed
- `src/engine/__tests__/stress.test.js`: 19 passed
- `src/engine/__tests__/sensitivity.test.js`: 8 passed
- **Total**: 36 / 36 tests passing cleanly.

### Production Build & PWA
- `npm run build`: Successfully compiled bundles with zero errors.
- `vite-plugin-pwa`: Built service worker (`dist/sw.js`) and web manifest.
