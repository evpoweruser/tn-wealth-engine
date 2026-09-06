import React from 'react';
import styles from './RangeInput.module.css';

const RangeInput = ({ label, value = 0, onChange, min = 0, max = 100, step = 1, suffix = '%', id }) => {
  const numValue = Number(value) || 0;
  const percentage = Math.max(0, Math.min(100, ((numValue - min) / (max - min || 1)) * 100));
  
  const handleChange = (e) => {
    if (onChange) {
      onChange(Number(e.target.value));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        <div className={styles.valueDisplay}>
          {numValue}{suffix}
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
          value={numValue}
          onChange={handleChange}
          style={{
            '--value-percent': `${percentage}%`
          }}
        />
      </div>
    </div>
  );
};

export default RangeInput;
