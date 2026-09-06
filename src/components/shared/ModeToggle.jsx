import React from 'react';
import styles from './ModeToggle.module.css';

const defaultOptions = [
  {
    value: 'taps',
    label: 'TAPS — Assured Pension',
    sub: '50% of last Basic + DA. CPS corpus funds pension.',
  },
  {
    value: 'cps',
    label: 'Pure CPS — Lump-sum',
    sub: 'Full corpus paid out. Annuity optional.',
  },
  {
    value: 'compare',
    label: 'Compare both',
    sub: 'Side-by-side TAPS pension vs CPS lump-sum.',
  }
];

const ModeToggle = ({ value, onChange, options = defaultOptions }) => {
  return (
    <div className={styles.container}>
      {options.map((option) => {
        const optionVal = option.value || option.id;
        const isActive = value === optionVal;
        return (
          <button
            key={optionVal}
            className={`${styles.button} ${isActive ? styles.active : ''}`}
            onClick={() => onChange && onChange(optionVal)}
            type="button"
          >
            <div className={styles.content}>
              <div className={styles.titleWrapper}>
                <div className={styles.radio}>
                  {isActive && <div className={styles.radioInner} />}
                </div>
                <span className={styles.title}>{option.label || option.title}</span>
              </div>
              <p className={styles.description}>{option.sub || option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ModeToggle;
