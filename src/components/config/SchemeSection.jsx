import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection, ModeToggle, RangeInput } from '../shared';
import { CareerBuilder } from './CareerBuilder';
import styles from './SchemeSection.module.css';

export const SchemeSection = () => {
  const { state, dispatch } = useEngine();

  const handleModeChange = (mode) => {
    dispatch({ type: 'SET_RETIRE_MODE', mode });
  };

  const handleFieldChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: Number(e.target.value) });
  };

  const handlePayCommission = (year) => (e) => {
    dispatch({ type: 'SET_PAY_COMMISSION', year, enabled: e.target.checked });
  };

  return (
    <CollapsibleSection title="Retirement Scheme — CPS vs TAPS" number={2} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <ModeToggle 
          value={state.retireMode} 
          onChange={handleModeChange} 
          options={[
            { value: 'cps', label: 'CPS' },
            { value: 'taps', label: 'TAPS' },
            { value: 'compare', label: 'Compare' }
          ]} 
        />
        
        <div className={styles.infoNote}>
          TAPS implies pension based on 50% of last drawn pay. CPS depends on corpus accumulation.
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>CPS Balance (₹)</label>
            <input type="number" value={state.cpsBalance} onChange={handleFieldChange('cpsBalance')} />
          </div>
          <div className={styles.formGroup}>
            <label>CPS Annual (₹)</label>
            <input type="number" value={state.cpsAnnual} onChange={handleFieldChange('cpsAnnual')} />
          </div>
        </div>

        <div className={styles.sliders}>
          <RangeInput 
            label="TN Increment %" 
            value={state.tnIncrement} 
            onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'tnIncrement', value: v })}
            min={0} max={15} step={0.1} suffix="%" 
          />
          <RangeInput 
            label="CPS Rate %" 
            value={state.cpsRate} 
            onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'cpsRate', value: v })}
            min={5} max={15} step={0.1} suffix="%" 
          />
        </div>

        {state.retireMode === 'cps' && (
          <div className={styles.voluntaryBlock}>
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Voluntary Annuity %</label>
                <input type="number" value={state.voluntaryAnnuity} onChange={handleFieldChange('voluntaryAnnuity')} min={0} max={100} />
              </div>
              <div className={styles.formGroup}>
                <label>Annuity Yield %</label>
                <input type="number" value={state.annuityYield} onChange={handleFieldChange('annuityYield')} step={0.1} />
              </div>
            </div>
          </div>
        )}

        <div className={styles.payCommissions}>
          <label className={styles.pcLabel}>Pay Commissions Expected</label>
          <div className={styles.pcGrid}>
            {[2027, 2037, 2047].map(year => (
              <label key={year} className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={state.payCommissions?.[year] || false} 
                  onChange={handlePayCommission(year)} 
                />
                {year}
              </label>
            ))}
          </div>
        </div>

        <CareerBuilder />
      </div>
    </CollapsibleSection>
  );
};
