import React from 'react';
import styles from './TornadoChart.module.css';

export function TornadoChart({ sensitivityResults, mcOn, sensitivityOn }) {
  if (!mcOn) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>Sensitivity Tornado — What Breaks It</span>
        </div>
        <div className={styles.callout}>
          Monte Carlo simulation is disabled. Turn on Monte Carlo in settings to view sensitivity tornado.
        </div>
      </div>
    );
  }

  if (!sensitivityOn) {
    return null;
  }

  if (!sensitivityResults?.shocks) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>Sensitivity Tornado — What Breaks It</span>
        </div>
        <div className={styles.callout}>Calculating 1-factor sensitivity sweep…</div>
      </div>
    );
  }

  const { baseHolds, paths, shocks } = sensitivityResults;

  // Scale bars relative to max absolute delta (min scale of 20 pp for baseline visibility)
  const maxAbsDelta = Math.max(20, ...shocks.map((s) => Math.abs(s.delta)));

  return (
    <div className={styles.panel} data-pdf="sensitivity">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Sensitivity Tornado — What Breaks It</span>
        </div>
        <span className={styles.badge}>
          Baseline Holds: {baseHolds.toFixed(1)}% · {paths} reduced paths
        </span>
      </div>

      <div className={styles.chartContainer}>
        {shocks.map((shock) => {
          const isNegative = shock.delta < -0.01;
          const isPositive = shock.delta > 0.01;
          const absDelta = Math.abs(shock.delta);
          const fillWidthPct = Math.min(100, (absDelta / maxAbsDelta) * 100);

          let valClass = styles.zero;
          let prefix = '';
          if (isNegative) {
            valClass = styles.neg;
            prefix = '−';
          } else if (isPositive) {
            valClass = styles.pos;
            prefix = '+';
          }

          return (
            <div key={shock.id} className={styles.row}>
              <div className={styles.factorMeta}>
                <span className={styles.factorLabel}>{shock.label}</span>
                <span className={styles.factorDesc}>{shock.desc}</span>
              </div>

              <div className={styles.barTrack} title={`Baseline: ${baseHolds.toFixed(1)}% → Shocked: ${shock.shockedHolds.toFixed(1)}%`}>
                <div
                  className={`${styles.barFill} ${isNegative ? styles.barNegative : styles.barPositive}`}
                  style={{ width: `${Math.max(4, fillWidthPct)}%` }}
                />
              </div>

              <div className={styles.deltaPill}>
                <span className={`${styles.deltaVal} ${valClass}`}>
                  {prefix}{absDelta.toFixed(1)} pp
                </span>
                <span className={styles.holdsVal}>
                  Holds: {shock.shockedHolds.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footnote}>
        💡 <strong>Interpretation:</strong> Re-runs Monte Carlo at {paths} paths while shocking one factor at a time. Bars show the drop in Plan-holds probability (Δ pp). Longer red bars pinpoint your plan's primary stress vulnerabilities.
      </div>
    </div>
  );
}

export default TornadoChart;
