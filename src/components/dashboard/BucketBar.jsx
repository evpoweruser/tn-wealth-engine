import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { fmtCr } from '../../utils/format';
import styles from './BucketBar.module.css';

/**
 * BucketBar — retirement corpus allocation across time-horizon buckets.
 *
 * Rule (documented, heuristic):
 *   Cash    = up to 2 years of net annual spend (immediate buffer)
 *   Bridge  = next 3 years of net annual spend (near-term stability)
 *   Stability = 40% of the remainder (bond-like reserve)
 *   Growth  = 60% of the remainder (long-horizon equity)
 */
const BucketBar = ({ results, isLoading }) => {
  const { state } = useEngine();

  if (isLoading || !results?.mid) return null;

  const liquid = results.mid.liquidStart || 0; // ₹ (engine units)
  const annualSpend = Math.max(0, (Number(state.retSpend) || 0) * 12);
  if (liquid <= 0 || annualSpend <= 0) return null;

  const cash = Math.min(liquid, annualSpend * 2);
  const bridge = Math.min(liquid - cash, annualSpend * 3);
  const rest = Math.max(0, liquid - cash - bridge);
  const stability = rest * 0.4;
  const growth = rest * 0.6;

  const buckets = [
    { id: 'cash', label: 'Cash', value: cash, color: 'var(--accent-green)', hint: '≈2 yrs spend' },
    { id: 'bridge', label: 'Bridge', value: bridge, color: 'var(--accent-blue)', hint: 'next 3 yrs' },
    { id: 'stability', label: 'Stability', value: stability, color: 'var(--accent-amber, #f59e0b)', hint: '40% of rest' },
    { id: 'growth', label: 'Growth', value: growth, color: 'var(--accent-purple)', hint: '60% of rest' },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>Retirement Bucket Allocation</h3>
          <p className={styles.subtitle}>How the liquid corpus maps to time horizons · {fmtCr(liquid)}</p>
        </div>
      </div>
      <div className={styles.bar} role="img" aria-label="Bucket allocation">
        {buckets.map((b) => (
          <div
            key={b.id}
            className={styles.segment}
            style={{ width: `${(b.value / liquid) * 100}%`, background: b.color }}
            title={`${b.label}: ${fmtCr(b.value)} (${b.hint})`}
          />
        ))}
      </div>
      <div className={styles.legend}>
        {buckets.map((b) => (
          <span key={b.id} className={styles.legendItem} title={b.hint}>
            <span className={styles.dot} style={{ background: b.color }}></span>
            {b.label} · {fmtCr(b.value)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BucketBar;
