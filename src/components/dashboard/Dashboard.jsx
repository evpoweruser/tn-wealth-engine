import React, { Suspense, lazy } from 'react';
import { useEngine } from '../../context/EngineContext';
import KpiGrid from './KpiGrid';
import RobustnessGrid from './RobustnessGrid';
import NarrativeCard from './NarrativeCard';
import StressPanel from './StressPanel';
import MilestoneTimeline from './MilestoneTimeline';
import { GoalOptimizerPanel } from './GoalOptimizerPanel';
import GoalsTable from './GoalsTable';
import ComparePanel from './ComparePanel';
import HealthScoreCard from './HealthScoreCard';
import SpendingChart from './SpendingChart';
import BucketBar from './BucketBar';
import PanelErrorBoundary from '../shared/PanelErrorBoundary';
import styles from './Dashboard.module.css';
import { fmtCr, fmt } from '../../utils/format';

// Recharts-heavy panels are code-split so the main bundle stays lean.
const WealthChart = lazy(() => import('./WealthChart'));
const TornadoChart = lazy(() => import('./TornadoChart'));
const FeasibilityChart = lazy(() => import('./FeasibilityChart'));

const ChartFallback = () => (
  <div className={styles.chartFallback} aria-busy="true">Loading chart…</div>
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

const Dashboard = ({ results, isLoading, stressResults, stressOn, sensitivityResults, sensitivityOn, stressOverlay, stressOverlayId, onToggleStressOverlay }) => {
  const { state } = useEngine();
  const mcOn = state.mcOn ?? true;
  return (
    <div className={styles.container}>
      <SummaryStrip results={results} isLoading={isLoading} />
      <PanelErrorBoundary panelName="Comparison">
        <ComparePanel isLoading={isLoading} />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Key indicators">
        <KpiGrid results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Reading the result">
        <NarrativeCard
          results={results}
          isLoading={isLoading}
          stressResults={stressOn ? stressResults : null}
          sensitivityResults={sensitivityOn ? sensitivityResults : null}
        />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Robustness">
        <RobustnessGrid results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Wealth score">
        <HealthScoreCard results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Goal optimizer">
        <GoalOptimizerPanel />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Wealth chart">
        <Suspense fallback={<ChartFallback />}>
          <WealthChart results={results} isLoading={isLoading} stressOverlay={stressOverlay} />
        </Suspense>
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Milestones">
        <MilestoneTimeline />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Stress regimes">
        <StressPanel
          stressResults={stressResults}
          mcOn={mcOn}
          stressOn={stressOn}
          selectedId={stressOverlayId}
          onToggleOverlay={onToggleStressOverlay}
        />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Sensitivity">
        <Suspense fallback={<ChartFallback />}>
          <TornadoChart sensitivityResults={sensitivityResults} mcOn={mcOn} sensitivityOn={sensitivityOn} />
        </Suspense>
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Spending & buckets">
        <SpendingChart results={results} isLoading={isLoading} />
        <BucketBar results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
      <div className={styles.row}>
        <PanelErrorBoundary panelName="Feasibility">
          <Suspense fallback={<ChartFallback />}>
            <FeasibilityChart results={results} isLoading={isLoading} />
          </Suspense>
        </PanelErrorBoundary>
        <PanelErrorBoundary panelName="Goals">
          <GoalsTable />
        </PanelErrorBoundary>
      </div>
    </div>
  );
};

export default Dashboard;
