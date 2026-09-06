# Robustness Stats & Stress Testing Specifications

This document outlines the mathematical models, formulas, and architectural specifications for the **Robustness Stats Grid**, **Stress Regimes Engine**, and **Sensitivity Analysis Tornado Chart**.

---

## 📊 1. Robustness Stats Grid

The Robustness Grid presents 4 key secondary indicators beneath the primary KPI summary:

### 1.1 Never-Short Probability
$$\text{NeverShortPct} = \frac{\sum_{r=1}^{N} \mathbb{I}(\min_{t} L_{r,t} \ge 0)}{N} \times 100$$
- Measures the exact fraction of Monte Carlo paths where liquid funds ($L_{r,t}$) never drop below zero at any point during retirement drawdown.

### 1.2 Medical Buffer Survival
- Evaluates the real purchasing power of the emergency medical liquid buffer against compounding medical inflation ($i_{\text{med}}$):
$$B_{\text{real}}(t) = \frac{B_{\text{nominal}}(t)}{(1 + i_{\text{med}})^t}$$
- Indicates whether healthcare reserves sustain through age 85+.

### 1.3 Sequence-of-Returns Risk (SRR)
- Measures plan vulnerability to early retirement market downturns (years 1–5 post-retirement).
- Compares median wealth trajectory in standard paths vs. paths experiencing a $-15\%$ return shock in years 1–2 of drawdown.

### 1.4 Lifetime Real Tax Burden
- Calculates cumulative Indian Income Tax paid during retirement drawdown under the **New Tax Regime (FY 2026-27)**:
$$\text{Tax}_{\text{real}} = \sum_{t=R}^{\text{Life}} \frac{\text{Tax}_{\text{nominal}}(t)}{(1 + i_{\text{general}})^t} + \text{Tax}_{\text{LTCG, goals}}$$
- Includes:
  - Applicable tax slabs (0%, 5%, 10%, 15%, 20%, 30%)
  - Standard deduction (₹75,000)
  - 4% Health & Education Cess
  - LTCG tax on equity goal liquidations

---

## ⚡ 2. Stress Testing Panel

The Stress Testing Engine subjects the user's financial plan to pre-defined historical and stress regimes:

| Regime ID | Name | Duration | Market Shock ($\Delta \text{XIRR}$) | Inflation Shock ($\Delta i$) | Description |
|-----------|------|----------|-------------------------------------|------------------------------|-------------|
| `earlyCrash` | Early Crash | Years 0–1 | $-30\%$ | $+2.0\%$ | Heavy equity market crash during early accumulation. |
| `stagflation` | Stagflation | Years 0–2 | $-5\%$ | $+3.0\%$ | Prolonged high inflation paired with sluggish investment returns. |
| `lostDecade` | Lost Decade | Years 0–9 | $-3\%$ | $+1.0\%$ | Decade-long market stagnation. |
| `healthShock` | Medical Shock | Whole Horizon | $0\%$ | $+4.0\%$ | Accelerating healthcare expense inflation. |

### Windowed Overlay Application
Rates are modified per accumulation year $t$ via the `yearlyOverlay` callback:
$$r(t) = \begin{cases} r_{\text{base}} + \Delta r_{\text{regime}}, & \text{if } t_{\text{start}} \le t \le t_{\text{end}} \\ r_{\text{base}}, & \text{otherwise} \end{cases}$$

---

## 🌪️ 3. Sensitivity Analysis & Common Random Numbers (CRN)

The Tornado Chart evaluates plan hold sensitivity to 5 individual parameter shocks:

1. **Life Expectancy**: $+5$ years
2. **Medical Inflation**: $+2.0\%$
3. **Equity XIRR**: $-2.0\%$
4. **General Inflation**: $+1.0\%$
5. **Medical Cover**: Halved ($-50\%$)

### Variance Reduction via Common Random Numbers (CRN)
To ensure the sensitivity delta $\Delta\text{pp} = \text{SurvivePct}_{\text{shocked}} - \text{SurvivePct}_{\text{base}}$ reflects pure parameter impact rather than Monte Carlo sampling noise, both baseline and shock simulations are executed using the **exact same PRNG seed**:
$$\text{Seed}_{\text{baseline}} = \text{Seed}_{\text{shock}_k} = S_0$$
This guarantees identical stochastic return series across runs, isolating the exact marginal effect of each input parameter.
