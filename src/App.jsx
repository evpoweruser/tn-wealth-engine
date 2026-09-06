import { useState, useCallback, useMemo } from 'react';
import { useEngine } from './context/EngineContext';
import { useTheme } from './context/ThemeContext';
import { useSimulation } from './hooks/useSimulation';
import { useStressPanel } from './hooks/useStressPanel';
import { useSensitivity } from './hooks/useSensitivity';
import { buildSimParams, computeWithdrawals, runPath, applyRegimeOverlay } from './engine/index.js';
import { PdfOverlay, AboutModal } from './components/shared';
import Sidebar from './components/config/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import styles from './App.module.css';
import { generateWealthReport } from './utils/pdfReport';
import { Info, FileSpreadsheet, FileDown, RotateCcw, Sun, Moon, Landmark } from 'lucide-react';

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
      const res = runPath(
        simParamsForStress,
        mode,
        simParamsForStress.cpsRate,
        simParamsForStress.sipXirr,
        inflationData.infLiving,
        inflationData.infMed,
        inflationData.infEdu,
        inflationData.infComposite,
        computeWithdrawals(goals || []),
        (rates, yearIdx) => applyRegimeOverlay({ ...rates }, yearIdx, stressOverlayId)
      );
      return {
        id: stressOverlayId,
        series: res.records.map((r) => ({ yr: r.yr, stressTot: r.tot })),
      };
    } catch (err) {
      console.error('Stress overlay error:', err);
      return null;
    }
  }, [stressOverlayId, simParamsForStress, derivedState, state.retireMode]);

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
            results={results}
            isLoading={isLoading}
            stressResults={stressResults}
            stressOn={stressOn}
            sensitivityResults={sensitivityResults}
            sensitivityOn={sensitivityOn}
            stressOverlay={stressOverlay}
            stressOverlayId={stressOverlayId}
            onToggleStressOverlay={(id) => setStressOverlayId((prev) => (prev === id ? null : id))}
          />
        </div>
      </div>
    </>
  );
}

export default App;
