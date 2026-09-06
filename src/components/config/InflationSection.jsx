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

  const rates = state.inflation?.rates || { consumer: 4.5, food: 5.5, medical: 7.0, education: 8.0 };
  const weights = state.inflation?.weights || { consumer: 55, food: 15, medical: 20, education: 10 };

  const totalWeight = (weights.consumer || 0) + (weights.food || 0) + (weights.medical || 0) + (weights.education || 0);
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
                value={rates[key] ?? 0} 
                onChange={handleRate(key)} 
                step={0.1}
                className={styles.numInput}
              />
              <input 
                type="number" 
                value={weights[key] ?? 0} 
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
          Medical & Healthcare inflates medical share of retirement spend. Education inflates child education goals.
        </div>
      </div>
    </CollapsibleSection>
  );
};
