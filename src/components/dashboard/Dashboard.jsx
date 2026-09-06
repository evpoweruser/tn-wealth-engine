import React from 'react';
import { useEngine } from '../../context/EngineContext';
import KpiGrid from './KpiGrid';
import RobustnessGrid from './RobustnessGrid';
import WealthChart from './WealthChart';
import StressPanel from './StressPanel';
import TornadoChart from './TornadoChart';
import FeasibilityChart from './FeasibilityChart';
import GoalsTable from './GoalsTable';
import ComparePanel from './ComparePanel';
import styles from './Dashboard.module.css';
import { fmtCr, fmt } from '../../utils/format';

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

const Dashboard = ({ results, isLoading, stressResults, stressOn, sensitivityResults, sensitivityOn }) => {
  const { state } = useEngine();
  const mcOn = state.mcOn ?? true;
  return (
    <div className={styles.container}>
      <SummaryStrip results={results} isLoading={isLoading} />
      <ComparePanel results={results} isLoading={isLoading} />
      <KpiGrid results={results} isLoading={isLoading} />
      <RobustnessGrid results={results} isLoading={isLoading} />
      <WealthChart results={results} isLoading={isLoading} />
      <StressPanel stressResults={stressResults} mcOn={mcOn} stressOn={stressOn} />
      <TornadoChart sensitivityResults={sensitivityResults} mcOn={mcOn} sensitivityOn={sensitivityOn} />
      <div className={styles.row}>
        <FeasibilityChart results={results} isLoading={isLoading} />
        <GoalsTable />
      </div>
    </div>
  );
};

export default Dashboard;
