import React, { useMemo } from 'react';
import { useEngine } from '../../context/EngineContext';
import { runPath } from '../../engine';
import { fmt, fmtCr } from '../../utils/format';
import { InfoButton } from '../shared';
import styles from './ComparePanel.module.css';

const ComparePanel = ({ isLoading }) => {
  const { state, derivedState } = useEngine();

  const comparison = useMemo(() => {
    if (state.retireMode !== 'compare' || !derivedState) return null;

    const { baseYear, retireYear, endYear, currentAge, lastPay, inflationData } = derivedState;
    const simParams = {
      bYr: baseYear,
      rYr: retireYear,
      endYr: endYear,
      currentAge,
      pcs: Object.fromEntries(
        Object.entries(state.payCommissions || {}).filter(([_, v]) => v).map(([k, _]) => [Number(k), 0.25])
      ),
      cpsBal: state.cpsBal,
      cpsAnn: state.cpsAnn,
      cpsInc: state.cpsInc / 100,
      cpsRate: state.cpsRate / 100,
      annPct: state.annPct,
      annYield: state.annYield / 100,
      gratuity: state.gratuity,
      postRetRate: state.postRetRate / 100,
      retSpend: state.retSpend,
      medShare: state.medShare / 100,
      sipMo: state.sipMo,
      sipXirr: state.sipXirr / 100,
      sipStep: state.sipStep / 100,
      mSurplus: state.mSurplus,
      lastPay
    };

    const tapsRes = runPath(
      simParams, 'taps', simParams.cpsRate, simParams.sipXirr,
      inflationData.infLiving, inflationData.infMed, inflationData.infEdu, inflationData.infComposite, {}
    );

    const cpsRes = runPath(
      simParams, 'cps', simParams.cpsRate, simParams.sipXirr,
      inflationData.infLiving, inflationData.infMed, inflationData.infEdu, inflationData.infComposite, {}
    );

    return { tapsRes, cpsRes };
  }, [state, derivedState]);

  if (state.retireMode !== 'compare') return null;
  if (isLoading || !comparison) return <div className={styles.loading}>Calculating comparison...</div>;

  const { tapsRes, cpsRes } = comparison;

  return (
    <>
      <div className={styles.sectionHead}>
        <span>TAPS vs CPS</span>
        <InfoButton id="compare" />
      </div>
      <div className={styles.grid}>
      <div className={styles.card}>
        <h3 className={styles.title}>TAPS — Assured Pension</h3>
        <div className={styles.subtitle}>50% of last Basic + DA</div>
        <div className={styles.bigNumber} style={{ color: 'var(--accent-green)' }}>
          {fmt(tapsRes.monthlyPension || tapsRes.tapsPension)} /mo
        </div>
        <div className={styles.details}>
          <p><span>Last Emoluments:</span> <b>{fmt(tapsRes.lastEmol)}</b></p>
          <p><span>CPS Corpus (funds pension):</span> <b>{fmtCr(tapsRes.finCPS)}</b></p>
          <p><span>Liquid (SIP + Gratuity):</span> <b>{fmtCr(tapsRes.liquidStart)}</b></p>
        </div>
        <div className={styles.note}>Corpus is not paid as lump-sum under TAPS.</div>
      </div>
      
      <div className={styles.card}>
        <h3 className={styles.title}>Pure CPS — Lump-sum</h3>
        <div className={styles.subtitle}>Full accumulation paid out</div>
        <div className={styles.bigNumber} style={{ color: 'var(--accent-blue)' }}>
          {fmtCr(cpsRes.finCPS)}
        </div>
        <div className={styles.details}>
          <p><span>Optional Annuity:</span> <b>{fmt(cpsRes.monthlyPension)} /mo</b></p>
          <p><span>Liquid at Retire:</span> <b>{fmtCr(cpsRes.liquidStart)}</b></p>
          <p><span>Composition:</span> <b>CPS residual + SIP + Gratuity</b></p>
        </div>
        <div className={styles.note}>No mandatory annuity rule.</div>
      </div>
      </div>
    </>
  );
};

export default ComparePanel;
