import React, { useState } from 'react';
import { useEngine } from '../../context/EngineContext';
import { buildDetailedCPS } from '../../engine';
import styles from './CareerBuilder.module.css';

export const CareerBuilder = () => {
  const { state, dispatch } = useEngine();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPayResults, setLastPayResults] = useState(null);

  const handleFieldChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: Number(e.target.value) });
  };

  const handleBuild = () => {
    const { balance, currentAnnual, finalBasic, finalDA } = buildDetailedCPS(state);
    
    dispatch({ type: 'SET_FIELD', field: 'cpsBalance', value: Math.round(balance) });
    dispatch({ type: 'SET_FIELD', field: 'cpsAnnual', value: Math.round(currentAnnual) });
    
    setLastPayResults({
      finalBasic: Math.round(finalBasic),
      finalDA: Math.round(finalDA),
      totalLastPay: Math.round(finalBasic + finalDA)
    });
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
              <label>Starting Basic</label>
              <input type="number" value={state.startBasic} onChange={handleFieldChange('startBasic')} />
            </div>
            <div className={styles.formGroup}>
              <label>MD Year</label>
              <input type="number" value={state.mdYear} onChange={handleFieldChange('mdYear')} />
            </div>
            <div className={styles.formGroup}>
              <label>MD Extra Incr</label>
              <input type="number" value={state.mdIncr} onChange={handleFieldChange('mdIncr')} />
            </div>
          </div>

          <div className={styles.dacpLabel}>DACP Years:</div>
          <div className={styles.grid4}>
            <div className={styles.formGroup}>
              <label>@8%</label>
              <input type="number" value={state.dacp8} onChange={handleFieldChange('dacp8')} />
            </div>
            <div className={styles.formGroup}>
              <label>@15%</label>
              <input type="number" value={state.dacp15} onChange={handleFieldChange('dacp15')} />
            </div>
            <div className={styles.formGroup}>
              <label>@17%</label>
              <input type="number" value={state.dacp17} onChange={handleFieldChange('dacp17')} />
            </div>
            <div className={styles.formGroup}>
              <label>@20%</label>
              <input type="number" value={state.dacp20} onChange={handleFieldChange('dacp20')} />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Current DA %</label>
              <input type="number" value={state.currentDA} onChange={handleFieldChange('currentDA')} />
            </div>
          </div>

          <button className={styles.buildBtn} onClick={handleBuild} type="button">
            Build CPS → Fill Balance & Annual
          </button>

          {lastPayResults && (
            <div className={styles.resultsBox}>
              <div className={styles.resultRow}>
                <span>Estimated Last Basic:</span>
                <span>₹{lastPayResults.finalBasic.toLocaleString('en-IN')}</span>
              </div>
              <div className={styles.resultRow}>
                <span>Estimated Last DA:</span>
                <span>₹{lastPayResults.finalDA.toLocaleString('en-IN')}</span>
              </div>
              <div className={styles.resultRowTotal}>
                <span>Estimated Last Pay:</span>
                <span>₹{lastPayResults.totalLastPay.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
