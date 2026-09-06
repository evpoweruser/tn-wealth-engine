# TN Pension & SIP Wealth Engine

A high-performance, progressive web application (PWA) built with **React 19**, **Vite**, and **Tailwind-inspired dark aesthetic CSS** for comprehensive retirement wealth modeling, pension calculation, Monte Carlo simulation, robustness analysis, and stress testing.

---

## 🌟 Key Features

### 1. **Core Wealth & Pension Engine**
- **Career Growth Modeling**: Computes annual salary increments, basic pay, grade pay, and emoluments over active service years.
- **CPS (Contributory Pension Scheme) & TAPS Integration**: Accurate monthly compounding of employee + government matching contributions, corpus accumulation, and pension annuity options.
- **Dedicated Goal Corpus & SIP Allocation**: Allocate corpus or dedicated SIPs for key life events (Higher Secondary, College, Marriage for multiple children).

### 2. **Monte Carlo Simulation & Multithreading**
- **1,000–5,000 Path Simulations**: Offloaded to a dedicated **Web Worker** (`src/workers/mcWorker.js`) for non-blocking UI interactivity.
- **Confidence Bands & Median Path**: Displays P10, P50, and P90 percentile wealth trajectories with animated Recharts band visualizations.
- **Seeded Pseudo-Random Number Generator**: Deterministic PRNG (`mulberry32`) ensures repeatable Monte Carlo runs for any given seed.

### 3. **Robustness Stats Grid**
Displays 4 key financial stability metrics alongside core KPIs:
1. **Never-Short Probability**: Percentage of paths where liquid funds never drop below 0.
2. **Medical Buffer Survival**: Resilience of emergency liquid reserves against compounding healthcare inflation.
3. **Sequence-of-Returns Risk (SRR)**: Vulnerability to market down-cycles during early retirement years.
4. **Lifetime Real Tax Burden**: Comprehensive Indian Income Tax slab (New Regime FY 2026-27 + cess & standard deduction) + goal LTCG tax accumulated per-year in real terms.

### 4. **Stress Testing & Sensitivity Analysis**
- **Windowed Stress Regimes**: Evaluates plan resilience against specific historical/theoretical stress regimes (Early Crash, Stagflation, Lost Decade, Healthcare Shock).
- **Common Random Numbers (CRN) Sensitivity Tornado**: 1-factor sensitivity shock analysis ($\Delta\text{pp}$ survival rate) using CRN variance reduction to isolate pure parameter impacts without random sampling noise.

### 5. **Export & Offline PWA Capabilities**
- **PDF Report Generation**: Instant executive summary export formatted via `jsPDF` and `jspdf-autotable`.
- **Installable PWA**: Works fully offline with service worker precaching via `vite-plugin-pwa`.

---

## 📐 Project Architecture

```
tn-wealth-engine/
├── public/                     # Static assets, favicons, PWA manifest
├── src/
│   ├── components/
│   │   ├── config/             # Config sidebar (Career, Scheme, SIP, Inflation, MC, Children)
│   │   ├── dashboard/          # Dashboard panels (KpiGrid, WealthChart, RobustnessGrid, StressPanel, TornadoChart)
│   │   └── shared/             # Reusable components (RangeInput, CollapsibleSection, KpiCard, ModeToggle)
│   ├── context/
│   │   └── EngineContext.jsx   # Global application state & localStorage synchronization
│   ├── engine/                 # Pure JavaScript wealth & financial calculation engine
│   │   ├── career.js           # Career salary & CPS contribution calculations
│   │   ├── goals.js            # Milestones and withdrawal schedule generation
│   │   ├── sensitivity.js      # CRN sensitivity tornado analysis
│   │   ├── simulation.js       # Core runPath & runMonteCarlo calculation loops
│   │   ├── stress.js           # Stress regime overlays & execution engine
│   │   └── tax.js              # FY26-27 tax slabs & LTCG calculation
│   ├── hooks/                  # React custom hooks (useSimulation, useStressPanel, useSensitivity)
│   ├── utils/                  # Utility functions & pdfReport.js generator
│   ├── workers/                # Web Worker for background Monte Carlo calculations (mcWorker.js)
│   ├── App.jsx                 # Primary application layout & header
│   └── main.jsx                # Application root entry point
├── docs/                       # Comprehensive documentation & technical review logs
│   ├── WALKTHROUGH.md          # Full implementation walkthrough & fix log
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
# Run Vitest test suite (Tax, Stress, Sensitivity)
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

- [Full Walkthrough & Fix Log](docs/WALKTHROUGH.md)
- [Robustness & Stress Panel Engine Specs](docs/ROBUSTNESS_AND_STRESS_PANEL.md)

---

## 🛡️ License
MIT License
