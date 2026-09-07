# TN Pension & SIP Wealth Engine

A high-performance, progressive web application (PWA) built with **React 19**, **Vite**, and **Tailwind-inspired dark aesthetic CSS** for comprehensive retirement wealth modeling, pension calculation, Monte Carlo simulation, robustness analysis, stress testing, college stream planning, and family protection gap analysis.

---

## 🌟 Key Features

### 1. **Core Wealth & Pension Engine**
- **Career Growth Modeling**: Computes annual salary increments, basic pay, DACP grade pay bumps, and emoluments over active service years.
- **CPS (Contributory Pension Scheme) & TAPS Integration**: Accurate monthly compounding of employee + government matching contributions, corpus accumulation, TAPS assured pension (50% of last pay), and voluntary annuity options.
- **Dedicated Goal Corpus & SIP Allocation**: Allocate corpus or dedicated SIPs for key life milestone events (Higher Secondary, College, Marriage for multiple children).

### 2. **Monte Carlo Simulation & Multithreading**
- **1,000–5,000 Path Simulations**: Offloaded to a dedicated **Web Worker** (`src/workers/mcWorker.js`) for non-blocking UI interactivity.
- **Confidence Bands & Median Path**: Displays P10, P50, and P90 percentile wealth trajectories with animated Recharts band visualizations.
- **Seeded Pseudo-Random Number Generator**: Deterministic PRNG (`mulberry32`) ensures repeatable Monte Carlo runs for any given seed.

### 3. **Stress Lab View & What-If Crash Simulator**
- **Dual Plan & Stress Lab Views**: Clean navigation between baseline planning and deep stress laboratory testing.
- **Interactive Crash Simulator**: Test market shocks in any calendar year with adjustable depth (10%–50%) and real-time terminal fall readouts. Presets include 2008 Financial Crash (−37%), COVID Panic (−23%), and Dot-Com Bubble (−20%).
- **Retirement Boundary Crash**: Evaluates sequence-of-returns risk exactly at retirement when corpus growth drops and recovery runway is short.

### 4. **College Stream Planner**
- **Curated Streams Dataset**: Real 2026 Tamil Nadu fee structures for Arts & Science, Engineering (Anna Univ / Tier-1), Medical (MBBS Govt/Private), and Management (MBA).
- **Exact Per-Year Cost Projections**: Inflation-adjusted milestone costs with required monthly SIP calculations.
- **Live Plan Impact & 1-Click Apply**: Test trade-offs live against Monte Carlo plan survival before applying updates.

### 5. **Family Protection Stack & Term-Cover Gap Planner**
- **Statutory & Voluntary Legs**: FBF (Family Benefit Fund ₹1.5L), Family Security Fund (₹5L), Doctors Corpus Fund (DCF ₹1Cr), and user Term Cover.
- **Term Gap Target**: Recommends a 12× annual emoluments target cover (prefilled, editable multiple).
- **Pool Itemization**: Itemizes liquid pool (Gratuity + CPS + SIP + FBF + Security + DCF), explicitly excluding term insurance to prevent double-counting.
- **Premium & Surplus Feasibility Check**: 2026 age-band indicative premium estimator (30–34, 35–39, 40–44, 45–49, 50+) with monthly surplus (`mSurplus`) affordability validation.

### 6. **What-If Stress Test (Tornado Chart)**
- **Layman-Friendly Scenarios**: Clear scenario descriptions (*"Live 5 years longer"*, *"Healthcare costs surge"*, *"Everything costs more"*).
- **Opaque Non-Clipped Tooltips**: Fully opaque tooltips with z-index elevation and caret arrows.
- **Smart Action Plan**: Contextual suggestions below the chart mapping damaging shocks to concrete risk-mitigation steps.

### 7. **Gamified TN Wealth Score (0–100)**
- **Composite Financial Health Score**: Evaluates survival probability (40%), shortfall frequency (25%), early-year cushion (20%), and tax efficiency (15%).
- **Actionable Recommendations**: 1-click recommendations to immediately optimize the score.

### 8. **Export & Offline PWA Capabilities**
- **PDF Report Generation**: Instant multi-page executive summary export formatted via `jsPDF` and `jspdf-autotable`.
- **Installable PWA**: Works fully offline with service worker precaching via `vite-plugin-pwa`.

---

## 📐 Project Architecture

```
tn-wealth-engine/
├── public/                     # Static assets, favicons, PWA manifest
├── src/
│   ├── components/
│   │   ├── config/             # Config sidebar (Career, Scheme, SIP, Inflation, MC, Protection, Children)
│   │   ├── dashboard/          # Dashboard panels (KpiGrid, WealthChart, RobustnessGrid, StressPanel, TornadoChart, GoalOptimizerPanel)
│   │   └── shared/             # Reusable components (RangeInput, CollapsibleSection, KpiCard, ModeToggle, InfoButton)
│   ├── content/                # Explainer content (panelInfo.js map)
│   ├── context/
│   │   └── EngineContext.jsx   # Global application state & localStorage synchronization
│   ├── engine/                 # Pure JavaScript wealth & financial calculation engine
│   │   ├── allocation.js       # Blended return calculations
│   │   ├── career.js           # Career salary & CPS contribution calculations
│   │   ├── goals.js            # Milestones, dedicated SIP, and withdrawal schedule generation
│   │   ├── protection.js       # Family protection stack & term cover gap planner
│   │   ├── params.js           # Central engine simParams builder
│   │   ├── score.js            # TN Wealth Score (0-100) engine
│   │   ├── sensitivity.js      # CRN sensitivity tornado analysis
│   │   ├── simulation.js       # Core runPath & runMonteCarlo calculation loops
│   │   ├── solver.js           # Reverse solver & tradeoff engine
│   │   ├── streams.js          # College streams dataset & projection engine
│   │   ├── stress.js           # Stress regime overlays & what-if crash simulator
│   │   └── tax.js              # FY26-27 tax slabs & LTCG calculation
│   ├── hooks/                  # React custom hooks (useSimulation, useStressPanel, useSensitivity)
│   ├── utils/                  # Utility functions & pdfReport.js generator
│   ├── workers/                # Web Worker for background Monte Carlo calculations (mcWorker.js)
│   ├── App.jsx                 # Primary application layout & header
│   └── main.jsx                # Application root entry point
├── docs/                       # Comprehensive documentation & architectural decision records
│   ├── DECISIONS.md            # Architectural Decision Records (ADR-001 to ADR-011)
│   ├── PROGRESS.md             # Project roadmap & progress tracking
│   ├── TASK_LOG.md             # Chronological task execution log
│   ├── WALKTHROUGH.md          # Implementation walkthrough & fix log
│   └── ROBUSTNESS_AND_STRESS_PANEL.md # Mathematical & technical specifications
├── vite.config.js              # Vite & PWA build configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/evpoweruser/tn-wealth-engine.git
cd tn-wealth-engine

# Install dependencies
npm install
```

### Local Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to start the app.

---

## 🧪 Testing & Building

### Run Unit Tests
```bash
# Run Vitest test suite (109 tests across 12 test files)
npm run test
```

### Production Build
```bash
# Compile client bundle and service worker
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 Documentation & References

- [Architectural Decision Records (DECISIONS.md)](docs/DECISIONS.md)
- [Project Progress & Roadmap (PROGRESS.md)](docs/PROGRESS.md)
- [Future Feature & Correctness Plan (FUTURE_PLAN.md)](docs/FUTURE_PLAN.md)
- [Task Execution Log (TASK_LOG.md)](docs/TASK_LOG.md)
- [Full Walkthrough & Fix Log (WALKTHROUGH.md)](docs/WALKTHROUGH.md)
- [Robustness & Stress Panel Engine Specs (ROBUSTNESS_AND_STRESS_PANEL.md)](docs/ROBUSTNESS_AND_STRESS_PANEL.md)

---

## 🛡️ License
MIT License
