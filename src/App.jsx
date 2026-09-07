import { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { useEngine } from './context/EngineContext';
import { useTheme } from './context/ThemeContext';
import { useSimulation } from './hooks/useSimulation';
import { useStressPanel } from './hooks/useStressPanel';
import { useSensitivity } from './hooks/useSensitivity';
import { buildSimParams, computeWithdrawals, computeWithdrawalTaxes, runPath, applyRegimeOverlay, applyWhatIfCrash } from './engine/index.js';
import { PdfOverlay, AboutModal } from './components/shared';
import Sidebar from './components/config/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import styles from './App.module.css';
import { generateWealthReport } from './utils/pdfReport';
import { Info, FileSpreadsheet, FileDown, RotateCcw, Sun, Moon, Landmark, LayoutDashboard, FlaskConical } from 'lucide-react';

// Print-only chart instances for PDF export (lazy — shares the module cache
// with the dashboard code-split chunks, so no extra main-bundle weight).
const PrintWealthChart = lazy(() => import('./components/dashboard/WealthChart'));
const PrintFeasibilityChart = lazy(() => import('./components/dashboard/FeasibilityChart'));

/**
 * Run one deterministic path with a per-year overlay and return a
 * year-keyed trajectory series for chart overlays. Shared by the regime
 * overlay and the what-if crash overlay (same overlay path, no MC sampling).
 */
function computeOverlaySeries(simParams, mode, inflationData, goals, overlayFn, key) {
  const res = runPath(
    simParams,
    mode,
    simParams.cpsRate,
    simParams.sipXirr,
    inflationData.infLiving,
    inflationData.infMed,
    inflationData.infEdu,
    inflationData.infComposite,
    computeWithdrawals(goals || []),
    overlayFn,
    computeWithdrawalTaxes(goals || [])
  );
  return res.records.map((r) => ({ yr: r.yr, [key]: r.tot }));
}

function App() {
  const { state, dispatch, derivedState } = useEngine();
  const { theme, toggleTheme } = useTheme();
  const { results, isLoading } = useSimulation(state, derivedState);

  // Engine-unit sim params, memoized (single builder — see buildSimParams).
  const simParamsForStress = useMemo(
    () => buildSimParams(state, derivedState),
    [state, derivedState]
  );

  const stressOn = state.stressOn ?? true;
  const stressResults = useStressPanel(state, derivedState, simParamsForStress, stressOn);

  const sensitivityOn = state.sensitivityOn ?? true;
  const sensitivityResults = useSensitivity(state, derivedState, simParamsForStress, sensitivityOn);

  // Dynamic stress overlay: clicking a regime plots its deterministic stressed
  // trajectory (base rates + regime overlay, no MC sampling) over WealthChart.
  const [stressOverlayId, setStressOverlayId] = useState(null);
  const stressOverlay = useMemo(() => {
    if (!stressOverlayId || !simParamsForStress || !derivedState) return null;
    try {
      const { inflationData, goals } = derivedState;
      const mode = state.retireMode || 'taps';
      const series = computeOverlaySeries(
        simParamsForStress, mode, inflationData, goals,
        (rates, yearIdx) => applyRegimeOverlay({ ...rates }, yearIdx, stressOverlayId),
        'stressTot'
      );
      return { id: stressOverlayId, series };
    } catch (err) {
      console.error('Stress overlay error:', err);
      return null;
    }
  }, [stressOverlayId, simParamsForStress, derivedState, state.retireMode]);

  // Interactive what-if crash: user-picked calendar year + depth → amber dashed
  // trajectory. Coexists with the regime overlay (distinct color + legend).
  const [whatIf, setWhatIf] = useState(null); // { crashYear, depth } | null
  const whatIfOverlay = useMemo(() => {
    if (!whatIf || !simParamsForStress || !derivedState) return null;
    try {
      const { inflationData, goals, baseYear } = derivedState;
      const mode = state.retireMode || 'taps';
      const crashIdx = whatIf.crashYear - baseYear;
      const series = computeOverlaySeries(
        simParamsForStress, mode, inflationData, goals,
        (rates, yearIdx) => applyWhatIfCrash(rates, yearIdx, { crashIdx, depth: whatIf.depth }),
        'whatIfTot'
      );
      return {
        label: `−${Math.round(whatIf.depth * 100)}% @ ${whatIf.crashYear}`,
        series,
      };
    } catch (err) {
      console.error('What-if overlay error:', err);
      return null;
    }
  }, [whatIf, simParamsForStress, derivedState, state.retireMode]);

  // Plan | Stress Lab view (persisted).
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem('tn_view') || 'plan';
    } catch {
      return 'plan';
    }
  });
  const handleView = useCallback((v) => {
    setView(v);
    try {
      window.localStorage.setItem('tn_view', v);
    } catch { /* private-mode storage: view preference stays session-only */ }
    // Start at the top of the newly shown view.
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  }, []);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStage, setPdfStage] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleCSV = useCallback(() => {
    if (!results?.mid?.records) return;
    let csv = 'Year,Age,Phase,CPS (Cr),Liquid (Cr),Total (Cr),Pension\n';
    results.mid.records.forEach(r => {
      csv += `${r.yr},${r.age},${r.phase},${r.cps?.toFixed(4)},${r.liquid?.toFixed(4)},${r.tot?.toFixed(4)},${r.pension || 0}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'TN_Pension.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [results]);

  const handlePDF = useCallback(async () => {
    if (!results?.mid?.records?.length) {
      alert('Simulation is still preparing. Try again in a moment.');
      return;
    }
    setPdfLoading(true);
    setPdfStage('Preparing report...');
    try {
      // The hidden print root (rendered below while pdfLoading) mounts both
      // charts simultaneously, so no view switching is needed for capture.
      await generateWealthReport({
        state,
        derivedState,
        results,
        onStage: (msg) => setPdfStage(msg),
      });
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed. Check console for details.');
    } finally {
      setPdfLoading(false);
      setPdfStage('');
    }
  }, [state, derivedState, results]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('tn_engine_v5');
      dispatch({ type: 'RESET' });
    }
  }, [dispatch]);

  return (
    <>
      <PdfOverlay visible={pdfLoading} message={pdfStage} />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      {isLoading && <div className={styles.loading}>⟳ Simulating…</div>}
      {/* Hidden print root: mounts both export charts simultaneously
          (off-screen, fixed width) so html2canvas captures them regardless
          of the active view. Rendered only during PDF export. */}
      {pdfLoading && (
        <div aria-hidden="true" className={styles.printRoot}>
          <Suspense fallback={null}>
            <div data-pdf-print="wealth-chart">
              <PrintWealthChart
                results={results}
                isLoading={false}
                stressOverlay={stressOverlay}
                whatIfOverlay={whatIfOverlay}
              />
            </div>
            <div data-pdf-print="feasibility-chart">
              <PrintFeasibilityChart results={results} isLoading={false} />
            </div>
          </Suspense>
        </div>
      )}

      <div className={styles.app}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon} aria-hidden="true"><Landmark size={18} strokeWidth={2.2} /></div>
            <div>
              <div className={styles.logoText}>TN Pension & SIP Wealth Engine</div>
              <div className={styles.logoSub}>Retirement Planning Calculator · TAPS / CPS / SIP</div>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={`${styles.actionBtn} ${view === 'plan' ? styles.activeViewBtn : ''}`}
              onClick={() => handleView('plan')}
              title="Headline plan dashboard"
              aria-label="Plan view"
              aria-pressed={view === 'plan'}
            >
              <LayoutDashboard size={14} />
              <span className={styles.btnLabel}>Plan</span>
            </button>
            <button
              className={`${styles.actionBtn} ${view === 'lab' ? styles.activeViewBtn : ''}`}
              onClick={() => handleView('lab')}
              title="Stress Lab — crash-test the plan"
              aria-label="Stress Lab view"
              aria-pressed={view === 'lab'}
            >
              <FlaskConical size={14} />
              <span className={styles.btnLabel}>Stress Lab</span>
            </button>
            <button className={styles.actionBtn} onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span className={styles.btnLabel}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button className={styles.actionBtn} onClick={() => setAboutOpen(true)} title="About & User Guide">
              <Info size={14} />
              <span className={styles.btnLabel}>About & Guide</span>
            </button>
            <button className={styles.actionBtn} onClick={handleCSV} title="Export CSV">
              <FileSpreadsheet size={14} />
              <span className={styles.btnLabel}>CSV</span>
            </button>
            <button className={styles.actionBtn} onClick={handlePDF} title="Export PDF">
              <FileDown size={14} />
              <span className={styles.btnLabel}>PDF</span>
            </button>
            <button className={`${styles.actionBtn} ${styles.resetBtn}`} onClick={handleReset} title="Reset">
              <RotateCcw size={14} />
              <span className={styles.btnLabel}>Reset</span>
            </button>
          </div>
        </header>

        {/* Sidebar - Configuration */}
        <div className={styles.sidebar}>
          <Sidebar />
        </div>

        {/* Main - Dashboard */}
        <div className={styles.main} data-pdf="dashboard">
          <Dashboard
            view={view}
            results={results}
            isLoading={isLoading}
            stressResults={stressResults}
            stressOn={stressOn}
            sensitivityResults={sensitivityResults}
            sensitivityOn={sensitivityOn}
            stressOverlay={stressOverlay}
            stressOverlayId={stressOverlayId}
            onToggleStressOverlay={(id) => setStressOverlayId((prev) => (prev === id ? null : id))}
            whatIf={whatIf}
            whatIfOverlay={whatIfOverlay}
            onWhatIfChange={setWhatIf}
            onClearWhatIf={() => setWhatIf(null)}
          />
        </div>
      </div>
    </>
  );
}

export default App;
