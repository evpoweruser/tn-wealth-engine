import React, { Suspense, lazy } from 'react';
import { useEngine } from '../../context/EngineContext';
import RobustnessGrid from './RobustnessGrid';
import StressPanel from './StressPanel';
import { GoalOptimizerPanel } from './GoalOptimizerPanel';
import WhatIfCrashControls from './WhatIfCrashControls';
import PanelErrorBoundary from '../shared/PanelErrorBoundary';
import styles from './Dashboard.module.css';

// Recharts-heavy panels are code-split so the main bundle stays lean.
const WealthChart = lazy(() => import('./WealthChart'));
const TornadoChart = lazy(() => import('./TornadoChart'));

const ChartFallback = () => (
  <div className={styles.chartFallback} aria-busy="true">Loading chart…</div>
);

/**
 * StressLabView — risk workbench. Everything that breaks the plan lives here:
 * robustness odds, goal optimizer, wealth chart with regime + what-if crash
 * overlays, stress regimes, and the sensitivity tornado.
 */
const StressLabView = ({
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
  const { state } = useEngine();
  const mcOn = state.mcOn ?? true;
  return (
    <div className={styles.container}>
      <div className={styles.labHeader}>
        <div>
          <h2 className={styles.labTitle}>Stress Lab — break the plan here</h2>
          <p className={styles.labSubtitle}>
            Crash-test the corpus against historical regimes and your own what-if shocks.
            TAPS pension is pay-based, so crashes hit the corpus legs, not the pension.
          </p>
        </div>
      </div>
      <PanelErrorBoundary panelName="Robustness">
        <RobustnessGrid results={results} isLoading={isLoading} />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Goal optimizer">
        <GoalOptimizerPanel />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Wealth chart">
        <Suspense fallback={<ChartFallback />}>
          <WealthChart
            results={results}
            isLoading={isLoading}
            stressOverlay={stressOverlay}
            whatIfOverlay={whatIfOverlay}
          />
        </Suspense>
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="What-if crash">
        <WhatIfCrashControls
          whatIf={whatIf}
          impact={whatIfOverlay}
          onChange={onWhatIfChange}
          onClear={onClearWhatIf}
        />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Stress regimes">
        <StressPanel
          stressResults={stressResults}
          mcOn={mcOn}
          stressOn={stressOn}
          selectedId={stressOverlayId}
          onToggleOverlay={onToggleStressOverlay}
          spouseCover={results?.mid?.familyPension || 0}
          mode={state.retireMode || 'taps'}
        />
      </PanelErrorBoundary>
      <PanelErrorBoundary panelName="Sensitivity">
        <Suspense fallback={<ChartFallback />}>
          <TornadoChart sensitivityResults={sensitivityResults} mcOn={mcOn} sensitivityOn={sensitivityOn} />
        </Suspense>
      </PanelErrorBoundary>
    </div>
  );
};

export default StressLabView;
