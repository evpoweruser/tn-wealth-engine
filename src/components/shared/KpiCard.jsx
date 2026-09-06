import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import styles from './KpiCard.module.css';

const KpiCard = ({ label, title, value, subtitle, color, valueColor, trend, loading = false, countTo = null, countFormat = null }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const animated = useCountUp(countTo);
  const displayValue = countTo != null && countFormat && animated != null
    ? countFormat(animated)
    : value;

  const cardLabel = label || title;
  const cardColor = color || valueColor || 'var(--text-primary)';

  if (loading) {
    return (
      <div className={styles.card} aria-busy="true">
        <div className={styles.label}>{cardLabel}</div>
        <div className="skeleton" style={{ height: 28, width: '70%' }} />
        <div className="skeleton" style={{ height: 12, width: '90%', marginTop: 8 }} />
      </div>
    );
  }

  return (
    <div
      className={styles.card}
      style={{ '--kpi-color': cardColor }}
    >
      <div className={styles.label}>{cardLabel}</div>
      <div className={styles.valueWrapper}>
        <div
          className={`${styles.value} ${mounted ? styles.animateValue : ''}`}
          style={{ color: cardColor }}
          title={typeof displayValue === 'string' ? displayValue : undefined}
        >
          {displayValue}
        </div>
        {trend && (
          <div className={`${styles.trend} ${styles[trend]}`} aria-hidden="true">
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          </div>
        )}
      </div>
      {subtitle && <div className={styles.subtitle} title={subtitle}>{subtitle}</div>}
    </div>
  );
};

export default KpiCard;
