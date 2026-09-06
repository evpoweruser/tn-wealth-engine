import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection, ModeToggle, RangeInput } from '../shared';
import { CareerBuilder } from './CareerBuilder';
import { formatIndianRupeeWords } from '../../utils/format';
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
          value={state.retireMode || 'taps'} 
          onChange={handleModeChange} 
          options={[
            { value: 'taps', label: 'TAPS — Assured Pension', sub: '50% of last Basic + DA. CPS corpus funds pension.' },
            { value: 'cps', label: 'Pure CPS — Lump-sum', sub: 'Full corpus paid out. Annuity optional.' },
            { value: 'compare', label: 'Compare both', sub: 'Side-by-side TAPS pension vs CPS lump-sum.' }
          ]} 
        />
        
        <div className={styles.infoNote}>
          <b>TAPS:</b> Assured monthly pension ≈ 50% of last Basic + DA.<br />
          <b>Pure CPS:</b> Defined-contribution lump-sum. No forced annuity.
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>CPS Balance (₹)</label>
            <input type="number" value={state.cpsBal || 0} onChange={handleFieldChange('cpsBal')} />
            {state.cpsBal > 0 && <span className="rupeeHint">{formatIndianRupeeWords(state.cpsBal)}</span>}
          </div>
          <div className={styles.formGroup}>
            <label>CPS Annual (₹)</label>
            <input type="number" value={state.cpsAnn || 0} onChange={handleFieldChange('cpsAnn')} />
            {state.cpsAnn > 0 && <span className="rupeeHint">{formatIndianRupeeWords(state.cpsAnn)}</span>}
          </div>
        </div>

        <div className={styles.sliders}>
          <RangeInput 
            label="TN Increment %" 
            value={state.cpsInc || 3.0} 
            onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'cpsInc', value: v })}
            min={0} max={15} step={0.1} suffix="%" 
          />
          <RangeInput 
            label="CPS Rate %" 
            value={state.cpsRate || 7.1} 
            onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'cpsRate', value: v })}
            min={5} max={15} step={0.1} suffix="%" 
          />
        </div>

        {state.retireMode === 'cps' && (
          <div className={styles.voluntaryBlock}>
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Voluntary Annuity %</label>
                <input type="number" value={state.annPct || 0} onChange={handleFieldChange('annPct')} min={0} max={100} />
              </div>
              <div className={styles.formGroup}>
                <label>Annuity Yield %</label>
                <input type="number" value={state.annYield || 6.5} onChange={handleFieldChange('annYield')} step={0.1} />
              </div>
            </div>
          </div>
        )}

        <div className={styles.payCommissions}>
          <label className={styles.pcLabel}>Pay Commissions (+25%):</label>
          <div className={styles.pcGrid}>
            {[2027, 2037, 2047].map(year => (
              <label key={year} className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={state.payCommissions?.[year] ?? true} 
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
