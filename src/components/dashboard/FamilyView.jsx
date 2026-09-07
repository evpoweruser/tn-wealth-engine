import React, { Suspense, lazy } from 'react';
import { ChildrenSection } from '../config';
import MilestoneTimeline from './MilestoneTimeline';
import GoalsTable from './GoalsTable';
import SurvivorCard from './SurvivorCard';
import PanelErrorBoundary from '../shared/PanelErrorBoundary';
import styles from './Dashboard.module.css';

// Recharts-heavy panels are code-split so the main bundle stays lean.
// (FamilyView itself is lazy-loaded by Dashboard — these split further.)
const StreamPlanner = lazy(() => import('./StreamPlanner'));
const FeasibilityChart = lazy(() => import('./FeasibilityChart'));

const ChartFallback = () => (
  <div className={styles.chartFallback} aria-busy="true">Loading…</div>
);

/**
 * FamilyView — everything children + survivor cover in one place:
 * child inputs, milestone timeline, goals table, stream planner,
 * feasibility, and the if-I-die-in-service calculator.
 */
const FamilyView = ({ results, isLoading }) => {
  return (
    <div className={styles.container}>
      <div className={styles.labHeader}>
        <div>
          <h2 className={styles.labTitle}>Family — every rupee the kids need, in one place</h2>
          <p className={styles.labSubtitle}>
            Goals, college costs and survivor cover. Protection toggles live in the sidebar.
          </p>
        </div>
      </div>
      <PanelErrorBoundary panelName="Children">
        <ChildrenSection />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Milestones">
        <MilestoneTimeline />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Stream planner">
        <Suspense fallback={<ChartFallback />}>
          <StreamPlanner />
        </Suspense>
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Feasibility">
        <Suspense fallback={<ChartFallback />}>
          <FeasibilityChart results={results} isLoading={isLoading} />
        </Suspense>
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Goals">
        <GoalsTable />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Survivor cover">
        <SurvivorCard results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
    </div>
  );
};

export default FamilyView;
