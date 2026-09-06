import React, { useState } from 'react';
import { useEngine } from '../../context/EngineContext';
import { buildDetailedCPS } from '../../engine';
import { fmt, formatIndianRupeeWords } from '../../utils/format';
import styles from './CareerBuilder.module.css';

export const CareerBuilder = () => {
  const { state, dispatch } = useEngine();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPayResults, setLastPayResults] = useState(null);

  const handleFieldChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: Number(e.target.value) });
  };

  const handleBuild = () => {
    const pcBumps = {};
    if (state.payCommissions) {
      Object.entries(state.payCommissions).forEach(([yr, enabled]) => {
        if (enabled) pcBumps[Number(yr)] = 0.25;
      });
    }

    const { corpus, annualContribution, lastPay } = buildDetailedCPS({
      doj: state.doj,
      dor: state.dor,
      startBasic: state.startBasic,
      daPct: state.daPct,
      cpsRate: state.cpsRate,
      mdYear: state.mdYear,
      mdIncr: state.mdIncr,
      dacp: { 8: state.dacp8, 15: state.dacp15, 17: state.dacp17, 20: state.dacp20 },
      payCommissions: pcBumps
    });
    
    dispatch({ type: 'SET_FIELD', field: 'cpsBal', value: corpus });
    dispatch({ type: 'SET_FIELD', field: 'cpsAnn', value: annualContribution });
    
    setLastPayResults(lastPay);
  };

  return (
    <div className={styles.builderContainer}>
      <button 
        className={styles.toggleBtn} 
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className={styles.toggleIcon}>{isOpen ? '▼' : '▶'}</span>
        Career Builder (DACP + MD) — estimates last pay for TAPS
      </button>

      {isOpen && (
        <div className={styles.builderContent}>
          <div className={styles.grid3}>
            <div className={styles.formGroup}>
              <label>Starting Basic (₹)</label>
              <input type="number" value={state.startBasic || 56100} onChange={handleFieldChange('startBasic')} />
              {state.startBasic > 0 && <span className="rupeeHint">{formatIndianRupeeWords(state.startBasic)}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>MD Year</label>
              <input type="number" value={state.mdYear || 2026} onChange={handleFieldChange('mdYear')} />
            </div>
            <div className={styles.formGroup}>
              <label>MD Extra Incr</label>
              <input type="number" value={state.mdIncr || 2} onChange={handleFieldChange('mdIncr')} />
            </div>
          </div>

          <div className={styles.dacpLabel}>DACP Progression %:</div>
          <div className={styles.grid4}>
            <div className={styles.formGroup}>
              <label>@8 yrs %</label>
              <input type="number" value={state.dacp8 || 8} onChange={handleFieldChange('dacp8')} />
            </div>
            <div className={styles.formGroup}>
              <label>@15 yrs %</label>
              <input type="number" value={state.dacp15 || 10} onChange={handleFieldChange('dacp15')} />
            </div>
            <div className={styles.formGroup}>
              <label>@17 yrs %</label>
              <input type="number" value={state.dacp17 || 8} onChange={handleFieldChange('dacp17')} />
            </div>
            <div className={styles.formGroup}>
              <label>@20 yrs %</label>
              <input type="number" value={state.dacp20 || 15} onChange={handleFieldChange('dacp20')} />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Current DA %</label>
              <input type="number" value={state.daPct || 60} onChange={handleFieldChange('daPct')} />
            </div>
          </div>

          <button className={styles.buildBtn} onClick={handleBuild} type="button">
            Build CPS → Fill Balance & Annual
          </button>

          {lastPayResults && (
            <div className={styles.resultsBox}>
              <div className={styles.resultRow}>
                <span>Last Basic:</span>
                <span><b>{fmt(lastPayResults.basic)}</b></span>
              </div>
              <div className={styles.resultRow}>
                <span>DA %:</span>
                <span><b>{(lastPayResults.da * 100).toFixed(0)}%</b></span>
              </div>
              <div className={styles.resultRowTotal}>
                <span>TAPS Pension (50%):</span>
                <span><b>{fmt(lastPayResults.tapsPension)}/mo</b></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
