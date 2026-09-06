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
        <KpiCard title="Wealth at Retire" value="—" subtitle="Calculating" loading />
        <KpiCard title="Monthly Pension" value="—" subtitle="Calculating" loading />
        <KpiCard title="Liquid Base" value="—" subtitle="Calculating" loading />
        <KpiCard title="Longevity" value="—" subtitle="Calculating" loading />
        <KpiCard title="Plan Success" value="—" subtitle="Calculating" loading />
      </div>
    );
  }

  const { mid, survivePct, exhaustPct, retP10, retP90 } = results;
  const mode = state.retireMode || 'taps';

  const wealthAtRetire = fmtCr(mid.totalWealthAtRetire || mid.liquidStart || 0);
  const realWealth = mid.realWealthAtRetire || 0;
  const retireSubtitle = state.mcOn && retP10 && retP90 
    ? `Today's value: ${fmtCr(realWealth)} · P10–P90: ${fmtCr(retP10)} – ${fmtCr(retP90)}`
    : `Worth ${fmtCr(realWealth)} in today's money`;

  const monthlyPension = mid.monthlyPension > 0 
    ? `${fmt(mid.monthlyPension)} /mo` 
    : (mode === 'taps' ? 'Calculating...' : '₹0 /mo (Lump-sum)');
    
  const pensionSubtitle = mode === 'taps' 
    ? 'TAPS Assured Pension' 
    : (mid.annuityCorpus > 0 ? 'Voluntary Annuity' : 'Pure CPS (100% Lump-sum)');

  const liquidBase = fmtCr(mid.liquidStart || 0);
  const liquidSubtitle = mode === 'taps' 
    ? 'SIP + Gratuity (Corpus Funds TAPS)' 
    : (mid.annuityCorpus > 0 ? 'Residual CPS + SIP + Grat' : 'Full CPS + SIP + Grat');

  // Only show depletion year when majority of paths fail (exhaustPct > 50).
  // With e.g. 5% exhaust, deplYearMed is a minority event — showing it next to
  // a 95% Plan-Success card is contradictory and alarming for healthy plans.
  const planDepletes = mid.depletedYear && (exhaustPct ?? 0) > 50;
  const longevity = planDepletes ? `Depletes ${mid.depletedYear}` : `Age ${state.lifeAge}+`;
  const longevitySubtitle = planDepletes ? 'Corpus Depleted' : (state.mcOn ? 'Median Sustains' : 'Sustains');
  const longevityColor = planDepletes ? 'var(--accent-red)' : 'var(--accent-purple)';

  const surviveText = state.mcOn ? `${survivePct.toFixed(0)}%` : (mid.depletedYear ? 'Risk' : 'OK');
  const surviveSubtitle = state.mcOn ? 'Runs sustain to plan age' : (mode === 'taps' ? 'TAPS + Liquid' : 'CPS Lump-sum');

  return (
    <div className={styles.grid}>
      <KpiCard
        title="Wealth at Retire"
        value={wealthAtRetire}
        subtitle={retireSubtitle}
        countTo={mid.totalWealthAtRetire || mid.liquidStart || 0}
        countFormat={(v) => fmtCr(v)}
      />
      <KpiCard
        title="Monthly Pension"
        value={monthlyPension}
        subtitle={pensionSubtitle}
        valueColor="var(--accent-blue)"
        countTo={mid.monthlyPension > 0 ? mid.monthlyPension : null}
        countFormat={(v) => `${fmt(v)} /mo`}
      />
      <KpiCard
        title="Liquid Base"
        value={liquidBase}
        subtitle={liquidSubtitle}
        valueColor="var(--accent-green)"
        countTo={mid.liquidStart || 0}
        countFormat={(v) => fmtCr(v)}
      />
      <KpiCard title="Longevity" value={longevity} subtitle={longevitySubtitle} valueColor={longevityColor} />
      <KpiCard
        title="Plan Success"
        value={surviveText}
        subtitle={surviveSubtitle}
        countTo={state.mcOn ? (survivePct ?? 0) : null}
        countFormat={(v) => `${Math.round(v)}%`}
      />
    </div>
  );
};

export default KpiGrid;
