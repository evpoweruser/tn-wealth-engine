import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection, RangeInput } from '../shared';
import { computeBlendedReturn, ASSET_RETURNS } from '../../engine';
import styles from './SipSection.module.css';

export const SipSection = () => {
  const { state, dispatch, derivedState } = useEngine();

  const handleFieldChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: Number(e.target.value) });
  };

  const handleAllocation = (key) => (val) => {
    dispatch({ type: 'SET_ALLOCATION', key, value: val });
  };

  const allocation = state.allocation || { indianEq: 35, usEq: 15, debt: 40, gold: 10 };
  const totalAlloc = (allocation.indianEq || 0) + (allocation.usEq || 0) + (allocation.debt || 0) + (allocation.gold || 0);
  const isAllocValid = totalAlloc === 100;
  
  const computedReturn = (computeBlendedReturn(allocation).blendedReturn * 100).toFixed(1);

  return (
    <CollapsibleSection title="Equity SIP & Allocation" number={3} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Monthly SIP (₹)</label>
            <input type="number" value={state.sipMo || 0} onChange={handleFieldChange('sipMo')} step={500} />
          </div>
          <div className={styles.rangeWrapper}>
            <RangeInput 
              label="Step-Up %" 
              value={state.sipStep || 3.0} 
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'sipStep', value: v })}
              min={0} max={20} step={0.5} suffix="%" 
            />
          </div>
        </div>

        <div className={styles.rangeWrapper}>
          <RangeInput 
            label="Blended XIRR %" 
            value={state.sipXirr || 10.8} 
            onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'sipXirr', value: v })}
            min={5} max={25} step={0.1} suffix="%" 
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
            <RangeInput label="Indian Eq" value={allocation.indianEq || 0} onChange={handleAllocation('indianEq')} min={0} max={100} step={5} suffix="%" />
            <RangeInput label="US Eq" value={allocation.usEq || 0} onChange={handleAllocation('usEq')} min={0} max={100} step={5} suffix="%" />
            <RangeInput label="Debt" value={allocation.debt || 0} onChange={handleAllocation('debt')} min={0} max={100} step={5} suffix="%" />
            <RangeInput label="Gold" value={allocation.gold || 0} onChange={handleAllocation('gold')} min={0} max={100} step={5} suffix="%" />
          </div>
          
          <div className={`${styles.totalAlloc} ${!isAllocValid ? styles.invalid : ''}`}>
            Total: {totalAlloc}% {!isAllocValid && '(Must equal 100%)'}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
