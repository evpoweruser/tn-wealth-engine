import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection } from '../shared';
import styles from './MonteCarloSection.module.css';

export const MonteCarloSection = () => {
  const { state, dispatch } = useEngine();

  const handleToggle = (e) => {
    dispatch({ type: 'SET_FIELD', field: 'mcOn', value: e.target.checked });
  };

  const handleStressToggle = (e) => {
    dispatch({ type: 'SET_FIELD', field: 'stressOn', value: e.target.checked });
  };

  const handleSensitivityToggle = (e) => {
    dispatch({ type: 'SET_FIELD', field: 'sensitivityOn', value: e.target.checked });
  };

  const handleMode = (mode) => () => {
    dispatch({ type: 'SET_FIELD', field: 'mcMode', value: mode });
  };

  const handleRuns = (e) => {
    dispatch({ type: 'SET_FIELD', field: 'mcRuns', value: Number(e.target.value) });
  };

  const mcOn          = state.mcOn ?? true;
  const mcMode        = state.mcMode || 'A';
  const mcRuns        = state.mcRuns || 1000;
  const stressOn      = state.stressOn ?? true;
  const sensitivityOn = state.sensitivityOn ?? true;

  return (
    <CollapsibleSection title="Monte Carlo" number={5} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <label className={styles.toggleLabel}>
          <input 
            type="checkbox" 
            checked={mcOn} 
            onChange={handleToggle}
            className={styles.checkbox}
          />
          Enable Monte Carlo Simulation
        </label>

        {mcOn && (
          <div className={styles.mcSettings}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input type="radio" name="mcMode" checked={mcMode === 'A'} onChange={handleMode('A')} />
                A — SIP only
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="mcMode" checked={mcMode === 'B'} onChange={handleMode('B')} />
                B — SIP + inflation
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="mcMode" checked={mcMode === 'C'} onChange={handleMode('C')} />
                C — SIP + inflation + CPS rate
              </label>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Runs</label>
                <input type="number" value={mcRuns} onChange={handleRuns} min={100} max={5000} step={100} />
              </div>
              <div className={styles.formGroup}>
                <label>Band</label>
                <input type="text" value="10th – 90th" disabled className={styles.disabledInput} />
              </div>
            </div>

            <label className={styles.toggleLabel} style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                checked={stressOn}
                onChange={handleStressToggle}
                className={styles.checkbox}
              />
              Show stress regimes
            </label>

            <label className={styles.toggleLabel} style={{ marginTop: 6 }}>
              <input
                type="checkbox"
                checked={sensitivityOn}
                onChange={handleSensitivityToggle}
                className={styles.checkbox}
              />
              Show sensitivity tornado
            </label>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};
