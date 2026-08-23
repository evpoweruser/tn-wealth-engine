import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection, RangeInput } from '../shared';
import { computeBlendedReturn, ASSET_RETURNS } from '../../engine';
import styles from './SipSection.module.css';

export const SipSection = () => {
  const { state, dispatch } = useEngine();

  const handleFieldChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: Number(e.target.value) });
  };

  const handleAllocation = (key) => (val) => {
    dispatch({ type: 'SET_ALLOCATION', key, value: val });
  };

  const totalAlloc = Object.values(state.allocations).reduce((a, b) => a + b, 0);
  const isAllocValid = totalAlloc === 100;
  
  // Note: the original used to show this inside a note, but now we'll show it directly
  const computedReturn = computeBlendedReturn(state.allocations).toFixed(1);

  return (
    <CollapsibleSection title="Equity SIP & Allocation" number={3} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Monthly SIP (₹)</label>
            <input type="number" value={state.sipMo} onChange={handleFieldChange('sipMo')} />
          </div>
          <div className={styles.rangeWrapper}>
            <RangeInput 
              label="Step-Up %" 
              value={state.stepUp} 
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'stepUp', value: v })}
              min={0} max={20} step={1} suffix="%" 
            />
          </div>
        </div>

        <div className={styles.rangeWrapper}>
          <RangeInput 
            label="Blended XIRR %" 
            value={state.blendedXirr} 
            onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'blendedXirr', value: v })}
            min={5} max={20} step={0.1} suffix="%" 
          />
        </div>

        <div className={styles.allocBox}>
          <div className={styles.allocHeader}>
            <span className={styles.allocTitle}>Asset Allocation</span>
            <span className={styles.allocExpected}>
              Expected: <span className={styles.highlight}>{computedReturn}%</span>
            </span>
          </div>
          
          <div className={styles.allocSliders}>
            <RangeInput label={`Indian Eq (${ASSET_RETURNS.indianEq}%)`} value={state.allocations.indianEq} onChange={handleAllocation('indianEq')} min={0} max={100} step={5} suffix="%" />
            <RangeInput label={`US Eq (${ASSET_RETURNS.usEq}%)`} value={state.allocations.usEq} onChange={handleAllocation('usEq')} min={0} max={100} step={5} suffix="%" />
            <RangeInput label={`Debt (${ASSET_RETURNS.debt}%)`} value={state.allocations.debt} onChange={handleAllocation('debt')} min={0} max={100} step={5} suffix="%" />
            <RangeInput label={`Gold (${ASSET_RETURNS.gold}%)`} value={state.allocations.gold} onChange={handleAllocation('gold')} min={0} max={100} step={5} suffix="%" />
          </div>
          
          <div className={`${styles.totalAlloc} ${!isAllocValid ? styles.invalid : ''}`}>
            Total: {totalAlloc}% {!isAllocValid && '(Must equal 100%)'}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
