import { useState, useCallback } from 'react';
import { useEngine } from './context/EngineContext';
import { useSimulation } from './hooks/useSimulation';
import { PdfOverlay } from './components/shared';
import Sidebar from './components/config/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import styles from './App.module.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function App() {
  const { state, dispatch, derivedState } = useEngine();
  const { results, isLoading } = useSimulation(state, derivedState);
  const [pdfLoading, setPdfLoading] = useState(false);

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
    setPdfLoading(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pw = 297, ph = 210, margin = 10, cw = pw - 2 * margin;
      let yPos = margin;

      // Title page
      doc.setFontSize(18);
      doc.text('TN Pension & SIP Wealth Engine', pw / 2, 30, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Retirement Planning Report', pw / 2, 40, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Generated: ' + new Date().toLocaleString(), pw / 2, 50, { align: 'center' });
      doc.text('Scheme: ' + state.retireMode.toUpperCase(), pw / 2, 58, { align: 'center' });
      doc.addPage();
      yPos = margin;

      // Capture the main dashboard
      const dashboard = document.querySelector('[data-pdf="dashboard"]');
      if (dashboard) {
        const canvas = await html2canvas(dashboard, { scale: 2, backgroundColor: '#0f172a' });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = Math.min((canvas.height / canvas.width) * cw, ph - 2 * margin);
        doc.addImage(imgData, 'PNG', margin, yPos, cw, imgHeight);
      }

      doc.save('TN_Wealth_Report.pdf');
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed. Check console for details.');
    } finally {
      setPdfLoading(false);
    }
  }, [state.retireMode]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('tn_engine_v5');
      dispatch({ type: 'RESET' });
    }
  }, [dispatch]);

  return (
    <>
      <PdfOverlay visible={pdfLoading} />
      {isLoading && <div className={styles.loading}>⟳ Simulating…</div>}

      <div className={styles.app}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>₹</div>
            <div>
              <div className={styles.logoText}>TN Pension & SIP Wealth Engine</div>
              <div className={styles.logoSub}>Retirement Planning Calculator</div>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleCSV} title="Export CSV">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              CSV
            </button>
            <button className={styles.actionBtn} onClick={handlePDF} title="Export PDF">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF
            </button>
            <button className={`${styles.actionBtn} ${styles.resetBtn}`} onClick={handleReset} title="Reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Reset
            </button>
          </div>
        </header>

        {/* Sidebar - Configuration */}
        <div className={styles.sidebar}>
          <Sidebar />
        </div>

        {/* Main - Dashboard */}
        <div className={styles.main} data-pdf="dashboard">
          <Dashboard results={results} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}

export default App;
