import React, { useMemo } from 'react';
import { useEngine } from '../../context/EngineContext';
import { computeHealthScore, recommendScoreActions } from '../../engine';
import styles from './HealthScoreCard.module.css';

const PART_META = [
  { id: 'survive', label: 'Survival', weight: '40%' },
  { id: 'neverShort', label: 'Never-short', weight: '25%' },
  { id: 'srr', label: 'Early-yr cushion', weight: '20%' },
  { id: 'taxEff', label: 'Tax efficiency', weight: '15%' },
];

/** Circular arc gauge: 240° sweep, needle by score. */
const Gauge = ({ score }) => {
  const r = 52;
  const cx = 64;
  const cy = 62;
  const sweep = 240;
  const startAngle = 150; // degrees, 0 = east, clockwise positive in SVG y-down
  const polar = (angleDeg) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const arc = (fromDeg, toDeg) => {
    const [x1, y1] = polar(fromDeg);
    const [x2, y2] = polar(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const endAngle = startAngle + sweep;
  const needleAngle = startAngle + (sweep * Math.max(0, Math.min(100, score))) / 100;
  const [nx, ny] = polar(needleAngle);
  const color = score >= 80 ? 'var(--accent-green)' : score >= 55 ? 'var(--accent-amber, #f59e0b)' : 'var(--accent-red)';

  return (
    <svg viewBox="0 0 128 104" className={styles.gauge} role="img" aria-label={`Wealth score ${score}`}>
      <path d={arc(startAngle, endAngle)} fill="none" stroke="var(--bg-hover, rgba(148,163,184,0.25))" strokeWidth="10" strokeLinecap="round" />
      <path d={arc(startAngle, needleAngle)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <text x={cx} y={cy + 22} textAnchor="middle" className={styles.scoreText} fill={color}>{score}</text>
    </svg>
  );
};

const HealthScoreCard = ({ results, isLoading }) => {
  const { state, dispatch } = useEngine();

  const { score, parts } = useMemo(() => {
    if (isLoading || !results?.mid) return { score: null, parts: null };
    try {
      return computeHealthScore(results);
    } catch (err) {
      console.error('Health score error:', err);
      return { score: null, parts: null };
    }
  }, [results, isLoading]);

  const recommendations = useMemo(() => {
    if (!parts) return [];
    return recommendScoreActions(state, parts);
  }, [state, parts]);

  if (isLoading || score == null || !parts) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>TN Wealth Score</h3>
        <div className={styles.loading}>Scoring plan health…</div>
      </div>
    );
  }

  return (
    <div className={styles.card} data-pdf="wealth-score">
      <div className={styles.layout}>
        <div className={styles.gaugeBlock}>
          <Gauge score={score} />
          <h3 className={styles.title}>TN Wealth Score</h3>
          <p className={styles.subtitle}>0–100 plan health index</p>
        </div>
        <div className={styles.parts}>
          {PART_META.map((p) => (
            <div key={p.id} className={styles.partRow} title={`Weight ${p.weight}`}>
              <span className={styles.partLabel}>{p.label}</span>
              <div className={styles.partBar}>
                <div
                  className={styles.partFill}
                  style={{ width: `${Math.round(parts[p.id])}%` }}
                />
              </div>
              <span className={styles.partVal}>{Math.round(parts[p.id])}</span>
            </div>
          ))}
        </div>
      </div>
      {recommendations.length > 0 && (
        <div className={styles.recs}>
          {recommendations.map((r) => (
            <div key={r.id} className={styles.rec}>
              <div>
                <div className={styles.recLabel}>{r.label}</div>
                <div className={styles.recDetail}>{r.detail}</div>
              </div>
              {r.action && (
                <button
                  type="button"
                  className={styles.applyBtn}
                  onClick={() => dispatch(r.action)}
                >
                  Apply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthScoreCard;
