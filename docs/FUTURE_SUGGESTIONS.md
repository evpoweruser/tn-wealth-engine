# Future Feature & UI/UX Visionary Roadmap

This document outlines next-generation feature proposals and advanced UI/UX concepts for future development cycles of the **TN Pension & SIP Wealth Engine**.

---

## 🎯 1. Smart Goal Optimizer & Reverse Solver

### Concept
Currently, users manually adjust SIP amounts or equity yields to see if plan survival improves. The **Smart Goal Optimizer** acts as an automated reverse financial solver:

- **Target Survival Solver**: "Calculate the minimum monthly SIP step-up required to reach 95%+ Monte Carlo plan survival."
- **Interactive Goal Tradeoff Matrix**: A visual drag-and-drop matrix allowing users to test tradeoffs (e.g. *"What if I defer College by 1 year or reduce Marriage budget by ₹5 Lakhs?"*).

---

## 🏛️ 2. Family Dual-PAN Tax Engine

### Concept
Extend the FY26-27 New Tax Regime module (`tax.js`) from single-PAN calculation to dual-PAN household modeling:

- **Spouse Income Tax Split**: Distribute withdrawal liquidations between Husband and Wife PANs to maximize basic exemption limits (₹4,000,000 dual exemption) and lower slab tiers.
- **Optimized Asset Titling**: Recommend which spouse should hold dedicated SIPs for child milestones.

---

## 🏥 3. Accelerating Healthcare Inflation & Long-Term Care (LTC)

### Concept
Healthcare expenses rarely inflate linearly over 30 years; they accelerate in late retirement (ages 70+):

- **Age-Tiered Medical Inflation**: Dynamic $i_{\text{med}}$ scaling (e.g. 7% from age 30–65 $\to$ 10% from age 65–85).
- **Critical Illness & LTC Buffer**: Dedicated simulation path accounting for out-of-pocket medical shocks at age 75.

---

## 🌐 4. Multi-Currency & NRI Mode

### Concept
Support non-resident Indian civil servants or returning expats:

- **Multi-Currency Toggle**: Instantly view wealth projections in **USD ($)**, **AED (د.إ)**, **SGD ($)**, or **EUR (€)** using real-time or fixed exchange rate deflators.

---

## 🏆 5. Gamified Financial Health Index ("TN Wealth Score")

### Concept
Synthesize the entire simulation into a single **Financial Health Index (0–100)**:

$$\text{Health Score} = 0.40(\text{SurvivePct}) + 0.25(\text{NeverShortPct}) + 0.20(\text{SRR Resilience}) + 0.15(\text{Tax Efficiency})$$

- Renders a circular arc speedometer gauge on the Dashboard.
- Provides actionable 1-click recommendations to boost the score.
