import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { useSimulation } from '../../hooks';
import { fmt, fmtCr } from '../../utils/format';
import styles from './ComparePanel.module.css';

const ComparePanel = () => {
  const { state } = useEngine();
  const { results, isLoading } = useSimulation();

  if (state.mode !== 'compare') return null;
  if (isLoading || !results) return <div className={styles.loading}>Simulating...</div>;

  const tapsData = results.taps || results.mid; 
  const cpsData = results.cps || results.mid;

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h3 className={styles.title}>TAPS — Assured Pension</h3>
        <div className={styles.bigNumber} style={{ color: 'var(--accent-green)' }}>
          {fmt(tapsData.monthlyPension)}/mo
        </div>
        <div className={styles.details}>
          <p><span>Last Emoluments:</span> <span>{fmt(tapsData.lastEmol)}</span></p>
          <p><span>CPS Corpus:</span> <span>{fmtCr(tapsData.annuityCorpus)}</span></p>
          <p><span>Liquid (SIP + Grat):</span> <span>{fmtCr(tapsData.liquidStart)}</span></p>
        </div>
      </div>
      <div className={styles.card}>
        <h3 className={styles.title}>Pure CPS — Lump-sum</h3>
        <div className={styles.bigNumber} style={{ color: 'var(--accent-blue)' }}>
          {fmtCr(cpsData.annuityCorpus)}
        </div>
        <div className={styles.details}>
          <p><span>Optional Annuity:</span> <span>{fmt(cpsData.monthlyPension)}/mo</span></p>
          <p><span>Liquid at Retire:</span> <span>{fmtCr(cpsData.liquidStart)}</span></p>
        </div>
      </div>
    </div>
  );
};

export default ComparePanel;
