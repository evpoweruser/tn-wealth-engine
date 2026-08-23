import React from 'react';
import styles from './RangeInput.module.css';

const RangeInput = ({ label, value, onChange, min, max, step = 1, suffix = '%', id }) => {
  // Calculate percentage for background gradient
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        <div className={styles.valueDisplay}>
          {value}{suffix}
        </div>
      </div>
      <div className={styles.inputWrapper}>
        <input
          type="range"
          id={id}
          className={styles.range}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          style={{
            '--value-percent': `${percentage}%`
          }}
        />
      </div>
    </div>
  );
};

export default RangeInput;
