import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { KpiCard } from '../shared';
import { fmtCr, fmt } from '../../utils/format';
import styles from './KpiGrid.module.css';

const KpiGrid = ({ results, isLoading }) => {
  const { state } = useEngine();

  if (isLoading || !results || !results.mid) {
    return (
      <div className={styles.grid}>
        <KpiCard title="Wealth at Retire" value="..." subtitle="Calculating" />
        <KpiCard title="Monthly Pension" value="..." subtitle="Calculating" />
        <KpiCard title="Liquid Base" value="..." subtitle="Calculating" />
        <KpiCard title="Longevity" value="..." subtitle="Calculating" />
        <KpiCard title="Plan Success" value="..." subtitle="Calculating" />
      </div>
    );
  }

  const { mid, survivePct, retP10, retP90 } = results;
  const mode = state.retireMode || 'taps';
  const retireRecord = mid.records.find(r => r.phase === 'draw') || mid.records[mid.records.length - 1];
  
  const wealthAtRetire = fmtCr(mode === 'taps' ? mid.liquidStart : (retireRecord.tot * 1e7));
  const retireSubtitle = state.mcOn && retP10 && retP90 
    ? `P10–P90: ${fmtCr(retP10)} – ${fmtCr(retP90)}`
    : 'Deterministic';
  
  const monthlyPension = `${fmt(mid.monthlyPension || 0)} /mo`;
  const pensionSubtitle = mode === 'taps' ? 'TAPS (50% Last Pay)' : (mid.annuityCorpus > 0 ? 'Voluntary Annuity' : 'Lump-sum CPS');
  
  const liquidBase = fmtCr(mid.liquidStart || 0);
  const liquidSubtitle = mode === 'taps' ? 'SIP + Gratuity' : 'CPS residual + SIP + Gratuity';
  
  const longevity = mid.depletedYear ? `Depletes ${mid.depletedYear}` : `Age ${state.lifeAge}+`;
  const longevitySubtitle = mid.depletedYear ? 'Corpus Depleted' : (state.mcOn ? 'Median Sustains' : 'Sustains');
  const longevityColor = mid.depletedYear ? 'var(--accent-red)' : 'var(--accent-purple)';
  
  const surviveText = state.mcOn ? `${survivePct.toFixed(0)}%` : (mid.depletedYear ? 'Risk' : 'OK');
  const surviveSubtitle = state.mcOn ? 'Runs sustain to plan age' : (mode === 'taps' ? 'TAPS + Liquid' : 'CPS Lump-sum');

  return (
    <div className={styles.grid}>
      <KpiCard title="Wealth at Retire" value={wealthAtRetire} subtitle={retireSubtitle} />
      <KpiCard title="Monthly Pension" value={monthlyPension} subtitle={pensionSubtitle} valueColor="var(--accent-blue)" />
      <KpiCard title="Liquid Base" value={liquidBase} subtitle={liquidSubtitle} valueColor="var(--accent-green)" />
      <KpiCard title="Longevity" value={longevity} subtitle={longevitySubtitle} valueColor={longevityColor} />
      <KpiCard title="Plan Success" value={surviveText} subtitle={surviveSubtitle} />
    </div>
  );
};

export default KpiGrid;
