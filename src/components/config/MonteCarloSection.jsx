import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection } from '../shared';
import styles from './MonteCarloSection.module.css';

export const MonteCarloSection = () => {
  const { state, dispatch } = useEngine();

  const handleToggle = (e) => {
    dispatch({ type: 'SET_FIELD', field: 'mcEnabled', value: e.target.checked });
  };

  const handleMode = (mode) => () => {
    dispatch({ type: 'SET_FIELD', field: 'mcMode', value: mode });
  };

  const handleRuns = (e) => {
    dispatch({ type: 'SET_FIELD', field: 'mcRuns', value: Number(e.target.value) });
  };

  return (
    <CollapsibleSection title="Monte Carlo" number={5} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <label className={styles.toggleLabel}>
          <input 
            type="checkbox" 
            checked={state.mcEnabled} 
            onChange={handleToggle}
            className={styles.checkbox}
          />
          Enable Monte Carlo Simulation
        </label>

        {state.mcEnabled && (
          <div className={styles.mcSettings}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input type="radio" checked={state.mcMode === 'A'} onChange={handleMode('A')} />
                Mode A (SIP Only)
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" checked={state.mcMode === 'B'} onChange={handleMode('B')} />
                Mode B (SIP + Inflation)
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" checked={state.mcMode === 'C'} onChange={handleMode('C')} />
                Mode C (SIP + Inf + CPS)
              </label>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Runs</label>
                <input type="number" value={state.mcRuns} onChange={handleRuns} min={100} max={5000} />
              </div>
              <div className={styles.formGroup}>
                <label>Band</label>
                <input type="text" value="10th - 90th" disabled className={styles.disabledInput} />
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};
