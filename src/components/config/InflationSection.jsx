import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection } from '../shared';
import styles from './InflationSection.module.css';

export const InflationSection = () => {
  const { state, dispatch } = useEngine();

  const handleRate = (key) => (e) => {
    dispatch({ type: 'SET_INFLATION_RATE', key, value: Number(e.target.value) });
  };

  const handleWeight = (key) => (e) => {
    dispatch({ type: 'SET_INFLATION_WEIGHT', key, value: Number(e.target.value) });
  };

  const totalWeight = Object.values(state.inflationWeights).reduce((a, b) => a + b, 0);
  const isValid = totalWeight === 100;

  const categories = [
    { key: 'consumer', label: 'Consumer (General)' },
    { key: 'food', label: 'Food & Groceries' },
    { key: 'medical', label: 'Medical & Healthcare' },
    { key: 'education', label: 'Education & Fees' },
  ];

  return (
    <CollapsibleSection title="Split Inflation (India)" number={4} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <div className={styles.table}>
          <div className={styles.header}>
            <div>Category</div>
            <div>Rate %</div>
            <div>Wt %</div>
          </div>
          
          {categories.map(({ key, label }) => (
            <div key={key} className={styles.row}>
              <div className={styles.catLabel}>{label}</div>
              <input 
                type="number" 
                value={state.inflationRates[key]} 
                onChange={handleRate(key)} 
                step={0.1}
                className={styles.numInput}
              />
              <input 
                type="number" 
                value={state.inflationWeights[key]} 
                onChange={handleWeight(key)} 
                className={styles.numInput}
              />
            </div>
          ))}
        </div>

        <div className={`${styles.totalWeight} ${!isValid ? styles.invalid : ''}`}>
          Total Weight: {totalWeight}% {!isValid && '(Must equal 100%)'}
        </div>

        <div className={styles.note}>
          Inflation is weighted differently during work life vs retirement. E.g. Education weight drops to 0% after children graduate.
        </div>
      </div>
    </CollapsibleSection>
  );
};
