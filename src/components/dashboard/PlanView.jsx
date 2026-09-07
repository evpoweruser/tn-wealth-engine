import React from 'react';
import KpiGrid from './KpiGrid';
import NarrativeCard from './NarrativeCard';
import ComparePanel from './ComparePanel';
import HealthScoreCard from './HealthScoreCard';
import SpendingChart from './SpendingChart';
import BucketBar from './BucketBar';
import PanelErrorBoundary from '../shared/PanelErrorBoundary';
import styles from './Dashboard.module.css';

/**
 * PlanView — headline plan dashboard (default view).
 * Children + survivor planning lives in FamilyView; risk tooling
 * (robustness, optimizer, wealth chart + overlays, stress regimes,
 * sensitivity) lives in StressLabView.
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
      <PanelErrorBoundary panelName="Spending & buckets">
        <SpendingChart results={results} isLoading={isLoading} />
        <BucketBar results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
    </div>
  );
};

export default PlanView;
