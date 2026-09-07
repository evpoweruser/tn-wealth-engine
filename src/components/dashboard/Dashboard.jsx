import React, { Suspense, lazy } from 'react';
import { useEngine } from '../../context/EngineContext';
import PlanView from './PlanView';
import PanelErrorBoundary from '../shared/PanelErrorBoundary';
import styles from './Dashboard.module.css';
import { fmtCr, fmt } from '../../utils/format';

// The Stress Lab (risk workbench) loads on demand — keeps the initial bundle lean.
const StressLabView = lazy(() => import('./StressLabView'));

const LabFallback = () => (
  <div className={styles.chartFallback} aria-busy="true">Loading Stress Lab…</div>
);

const schemeLabel = (mode) => {
  if (mode === 'taps') return 'TAPS · Assured Pension';
  if (mode === 'cps') return 'Pure CPS · Lump-sum';
  return 'Compare · TAPS vs CPS';
};

const SummaryStrip = ({ results, isLoading }) => {
  const { state, derivedState } = useEngine();
  if (isLoading || !results?.mid || !derivedState) {
    return (
      <div className={styles.summary} aria-busy="true">
        <div className={`${styles.summaryItem} skeleton`} style={{ height: 44 }} />
        <div className={`${styles.summaryItem} skeleton`} style={{ height: 44 }} />
        <div className={`${styles.summaryItem} skeleton`} style={{ height: 44 }} />
        <div className={`${styles.summaryItem} skeleton`} style={{ height: 44 }} />
      </div>
    );
  }
  const items = [
    { label: 'Scheme', value: schemeLabel(state.retireMode) },
    { label: `Retire ${derivedState.retireYear}`, value: fmtCr(results.mid.totalWealthAtRetire || results.mid.liquidStart || 0) },
    { label: 'Monthly SIP', value: `${fmt(state.sipMo)} /mo` },
    { label: 'Pension', value: results.mid.monthlyPension > 0 ? `${fmt(results.mid.monthlyPension)} /mo` : 'Lump-sum' },
  ];
  return (
    <div className={styles.summary} data-pdf="summary">
      {items.map((it) => (
        <div key={it.label} className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{it.label}</span>
          <span className={styles.summaryValue} title={it.value}>{it.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard — thin view switch. PlanView is the default headline dashboard;
 * StressLabView is the risk workbench (lazy-loaded).
 */
const Dashboard = ({
  view,
  results,
  isLoading,
  stressResults,
  stressOn,
  sensitivityResults,
  sensitivityOn,
  stressOverlay,
  stressOverlayId,
  onToggleStressOverlay,
  whatIf,
  whatIfOverlay,
  onWhatIfChange,
  onClearWhatIf,
}) => {
  if (view === 'lab') {
    return (
      <PanelErrorBoundary panelName="Stress Lab">
        <Suspense fallback={<LabFallback />}>
          <StressLabView
            results={results}
            isLoading={isLoading}
            stressResults={stressResults}
            stressOn={stressOn}
            sensitivityResults={sensitivityResults}
            sensitivityOn={sensitivityOn}
            stressOverlay={stressOverlay}
            stressOverlayId={stressOverlayId}
            onToggleStressOverlay={onToggleStressOverlay}
            whatIf={whatIf}
            whatIfOverlay={whatIfOverlay}
            onWhatIfChange={onWhatIfChange}
            onClearWhatIf={onClearWhatIf}
          />
        </Suspense>
      </PanelErrorBoundary>
    );
  }

  return (
    <PlanView
      results={results}
      isLoading={isLoading}
      SummaryStrip={SummaryStrip}
      stressResults={stressResults}
      stressOn={stressOn}
      sensitivityResults={sensitivityResults}
      sensitivityOn={sensitivityOn}
    />
  );
};

export default Dashboard;
