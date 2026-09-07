import React, { Suspense, lazy } from 'react';
import KpiGrid from './KpiGrid';
import NarrativeCard from './NarrativeCard';
import MilestoneTimeline from './MilestoneTimeline';
import GoalsTable from './GoalsTable';
import ComparePanel from './ComparePanel';
import HealthScoreCard from './HealthScoreCard';
import SpendingChart from './SpendingChart';
import BucketBar from './BucketBar';
import PanelErrorBoundary from '../shared/PanelErrorBoundary';
import styles from './Dashboard.module.css';

// Recharts-heavy panels are code-split so the main bundle stays lean.
const FeasibilityChart = lazy(() => import('./FeasibilityChart'));

const ChartFallback = () => (
  <div className={styles.chartFallback} aria-busy="true">Loading chart…</div>
);

/**
 * PlanView — headline plan dashboard (default view).
 * Risk tooling (robustness, optimizer, wealth chart + overlays, stress
 * regimes, sensitivity) lives in StressLabView.
 */
const PlanView = ({ results, isLoading, SummaryStrip, stressResults, stressOn, sensitivityResults, sensitivityOn }) => {
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
      <PanelErrorBoundary panelName="Wealth score">
        <HealthScoreCard results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Milestones">
        <MilestoneTimeline />
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

export default PlanView;
