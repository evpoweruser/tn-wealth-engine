import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection } from '../shared';
import styles from './CareerSection.module.css';

export const CareerSection = () => {
  const { state, dispatch, derivedState } = useEngine();

  const handleChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  };

  const { currentAge, baseYear, retireYears } = derivedState || {};

  return (
    <CollapsibleSection title="Career & Drawdown Horizon" number={1} defaultOpen={true}>
      <div className={styles.sectionContent}>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>DOB (date)</label>
            <input type="date" value={state.dob} onChange={handleChange('dob')} />
          </div>
          <div className={styles.formGroup}>
            <label>DOJ (date)</label>
            <input type="date" value={state.doj} onChange={handleChange('doj')} />
          </div>
          <div className={styles.formGroup}>
            <label>DOR (date)</label>
            <input type="date" value={state.dor} onChange={handleChange('dor')} />
          </div>
          <div className={styles.formGroup}>
            <label>Life Age</label>
            <input type="number" value={state.lifeAge} onChange={handleChange('lifeAge')} min={50} max={100} />
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Current Age</span>
            <span className={styles.statValue}>{currentAge || '-'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Base Year</span>
            <span className={styles.statValue}>{baseYear || '-'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Years to Retire</span>
            <span className={styles.statValue}>{retireYears || '-'}</span>
          </div>
        </div>

        {retireYears < 0 && <div className={styles.warning}>DOR is in the past!</div>}
        {state.lifeAge <= currentAge && <div className={styles.warning}>Life age must be greater than current age!</div>}

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Monthly Surplus (₹)</label>
            <input type="number" value={state.monthlySurplus} onChange={handleChange('monthlySurplus')} />
          </div>
          <div className={styles.formGroup}>
            <label>Retire Expense (₹)</label>
            <input type="number" value={state.retireExpense} onChange={handleChange('retireExpense')} />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Medical share %</label>
            <input type="number" value={state.medicalShare} onChange={handleChange('medicalShare')} />
          </div>
          <div className={styles.formGroup}>
            <label>Gratuity (₹)</label>
            <input type="number" value={state.gratuity} onChange={handleChange('gratuity')} />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Post-Retire Return %</label>
            <input type="number" value={state.postRetireReturn} onChange={handleChange('postRetireReturn')} step={0.1} />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
