import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { useSimulation } from '../../hooks';
import { KpiCard } from '../shared';
import { fmtCr, fmt, fmtPct } from '../../utils/format';
import styles from './KpiGrid.module.css';

const KpiGrid = () => {
  const { state } = useEngine();
  const { results, isLoading } = useSimulation();

  if (isLoading || !results) return <div className={styles.loading}>Loading KPIs...</div>;

  const { mid, survivePct, mode } = results;
  const retireRecord = mid.records.find(r => r.phase === 'post-retire') || mid.records[mid.records.length - 1];
  
  const wealthAtRetire = fmtCr(mode === 'taps' ? mid.liquidStart : retireRecord.tot * 1e7);
  const retireSubtitle = state.mcEnabled ? 'P10-P90 range' : 'Deterministic';
  
  const monthlyPension = `${fmt(mid.monthlyPension)}/mo`;
  const pensionSubtitle = mode === 'taps' ? 'Guaranteed Minimum' : 'Annuity Estimate';
  
  const liquidBase = fmtCr(mid.liquidStart);
  const liquidSubtitle = 'At Retirement';
  
  const longevity = mid.depletedYear ? `Depletes ${mid.depletedYear}` : 'Age 85+';
  const longevitySubtitle = mid.depletedYear ? `Depletion Age` : 'Sustains';
  const longevityColor = mid.depletedYear ? 'var(--accent-red)' : 'var(--accent-purple)';
  
  const surviveText = state.mcEnabled ? `${fmtPct(survivePct)}` : (mid.depletedYear ? 'Risk' : 'OK');
  const surviveSubtitle = state.mcEnabled ? 'Monte Carlo Success' : 'Deterministic Check';

  return (
    <div className={styles.grid}>
      <KpiCard title="Wealth at Retire" value={wealthAtRetire} subtitle={retireSubtitle} />
      <KpiCard title="Monthly Pension" value={monthlyPension} subtitle={pensionSubtitle} />
      <KpiCard title="Liquid Base" value={liquidBase} subtitle={liquidSubtitle} valueColor="var(--accent-green)" />
      <KpiCard title="Longevity" value={longevity} subtitle={longevitySubtitle} valueColor={longevityColor} />
      <KpiCard title="Plan Success" value={surviveText} subtitle={surviveSubtitle} />
    </div>
  );
};

export default KpiGrid;
