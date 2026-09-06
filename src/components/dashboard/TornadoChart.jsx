import React from 'react';
import { fmtCr } from '../../utils/format';
import styles from './TornadoChart.module.css';

const fmtSignedCr = (v) => {
  const a = Math.abs(v);
  if (v > 0.005) return `+${fmtCr(a)}`;
  if (v < -0.005) return `−${fmtCr(a)}`;
  return '±₹0.00 Cr';
};

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

  // Symmetric diverging scale (min 5 pp so tiny deltas stay visible)
  const maxAbsDelta = Math.max(5, ...shocks.map((s) => Math.abs(s.delta)));

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
        {shocks.map((shock, rank) => {
          const isNegative = shock.delta < -0.01;
          const isPositive = shock.delta > 0.01;
          const absDelta = Math.abs(shock.delta);
          // Half-width: 0–50% of the track on either side of the center axis
          const halfPct = Math.min(50, (absDelta / maxAbsDelta) * 50);

          const baseBq = shock.baseBequestP50 ?? sensitivityResults.baseBequestP50 ?? 0;
          const shockBq = shock.bequestP50 ?? 0;
          const bqDelta = shockBq - baseBq;

          return (
            <div key={shock.id} className={styles.row}>
              <div className={styles.factorMeta}>
                <span className={styles.rankChip} title={`Vulnerability rank #${rank + 1}`}>
                  #{rank + 1}
                </span>
                <span className={styles.factorText}>
                  <span className={styles.factorLabel}>{shock.label}</span>
                  <span className={styles.factorDesc}>{shock.desc}</span>
                </span>
              </div>

              <div className={styles.divergeTrack}>
                <div className={styles.centerLine} title={`Baseline holds ${baseHolds.toFixed(1)}%`} />
                {isNegative && (
                  <div
                    className={`${styles.barHalf} ${styles.barNegative}`}
                    style={{ width: `${Math.max(2, halfPct)}%` }}
                  />
                )}
                {isPositive && (
                  <div
                    className={`${styles.barHalf} ${styles.barPositive}`}
                    style={{ width: `${Math.max(2, halfPct)}%` }}
                  />
                )}
                {!isNegative && !isPositive && <div className={styles.zeroTick} />}
                <span className={styles.axisEnd} style={{ left: 2 }}>−{maxAbsDelta.toFixed(0)}</span>
                <span className={styles.axisEnd} style={{ right: 2 }}>+{maxAbsDelta.toFixed(0)}</span>

                <div className={styles.impactCard} role="tooltip">
                  <div className={styles.impactTitle}>{shock.label}</div>
                  <div className={styles.impactRow}>
                    <span>Plan holds</span>
                    <b>{baseHolds.toFixed(1)}% → {shock.shockedHolds.toFixed(1)}%</b>
                  </div>
                  <div className={styles.impactRow}>
                    <span>Hold reduction</span>
                    <b className={isNegative ? styles.neg : isPositive ? styles.pos : styles.zero}>
                      {isNegative ? '−' : isPositive ? '+' : ''}{absDelta.toFixed(1)} pp
                    </b>
                  </div>
                  <div className={styles.impactRow}>
                    <span>Median bequest</span>
                    <b>{fmtCr(baseBq)} → {fmtCr(shockBq)}</b>
                  </div>
                  <div className={styles.impactRow}>
                    <span>Bequest impact</span>
                    <b className={bqDelta < -0.005 ? styles.neg : bqDelta > 0.005 ? styles.pos : styles.zero}>
                      {fmtSignedCr(bqDelta)}
                    </b>
                  </div>
                  <div className={styles.impactNote}>{paths} paths · CRN seed-matched</div>
                </div>
              </div>

              <div className={styles.deltaPill}>
                <span className={`${styles.deltaVal} ${isNegative ? styles.neg : isPositive ? styles.pos : styles.zero}`}>
                  {isNegative ? '−' : isPositive ? '+' : ''}{absDelta.toFixed(1)} pp
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
        💡 <strong>Interpretation:</strong> Re-runs Monte Carlo at {paths} paths while shocking one factor at a time. Bars diverge from the center baseline — left (red) hurts plan holds, right (green) helps. Hover any bar for exact holds + bequest impact. Longer bars pinpoint primary vulnerabilities.
      </div>
    </div>
  );
}

export default TornadoChart;
