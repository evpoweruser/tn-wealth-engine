import React from 'react';
import styles from './ModeToggle.module.css';

const ModeToggle = ({ value, onChange }) => {
  const options = [
    {
      id: 'taps',
      title: 'TAPS — Assured Pension',
      description: '50% of last Basic + DA. CPS corpus funds the pension.',
    },
    {
      id: 'cps',
      title: 'Pure CPS — Lump-sum',
      description: 'Full corpus paid out. Annuity optional.',
    },
    {
      id: 'compare',
      title: 'Compare both',
      description: 'Side-by-side TAPS pension vs CPS lump-sum.',
    }
  ];

  return (
    <div className={styles.container}>
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            className={`${styles.button} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <div className={styles.content}>
              <div className={styles.titleWrapper}>
                <div className={styles.radio}>
                  {isActive && <div className={styles.radioInner} />}
                </div>
                <span className={styles.title}>{option.title}</span>
              </div>
              <p className={styles.description}>{option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ModeToggle;
