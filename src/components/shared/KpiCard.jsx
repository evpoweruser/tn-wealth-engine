import React, { useEffect, useState } from 'react';
import styles from './KpiCard.module.css';

const KpiCard = ({ label, value, subtitle, color, trend }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div 
      className={styles.card} 
      style={{ '--kpi-color': color }}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.valueWrapper}>
        <div 
          className={`${styles.value} ${mounted ? styles.animateValue : ''}`}
          style={{ color }}
        >
          {value}
        </div>
        {trend && (
          <div className={`${styles.trend} ${styles[trend]}`}>
            {trend === 'up' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M19 12l-7 7-7-7"/>
              </svg>
            )}
          </div>
        )}
      </div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  );
};

export default KpiCard;
