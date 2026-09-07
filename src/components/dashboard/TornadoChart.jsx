import React from 'react';
import { fmtCr } from '../../utils/format';
import { InfoButton } from '../shared';
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
          <div className={styles.titleGroup}>
            <span className={styles.title}>What-If Stress Test</span>
            <span className={styles.subtitle}>How unexpected life & market events impact your financial plan</span>
          </div>
        </div>
        <div className={styles.callout}>
          Monte Carlo simulation is disabled. Turn on Monte Carlo in settings to view what-if stress tests.
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
          <div className={styles.titleGroup}>
            <span className={styles.title}>What-If Stress Test</span>
            <span className={styles.subtitle}>How unexpected life & market events impact your financial plan</span>
          </div>
        </div>
        <div className={styles.callout}>Running stress test scenarios…</div>
      </div>
    );
  }

  const { baseHolds, shocks } = sensitivityResults;

  // Symmetric diverging scale (min 5 pp so tiny deltas stay visible)
  const maxAbsDelta = Math.max(5, ...shocks.map((s) => Math.abs(s.delta)));

  // Filter damaging shocks (delta < -1%) for suggestions
  const damagingShocks = shocks
    .filter((s) => s.delta < -1)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  return (
    <div className={styles.panel} data-pdf="sensitivity">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>What-If Stress Test</span>
          <InfoButton id="tornado" />
          <span className={styles.subtitle}>How unexpected life & market events impact your plan</span>
        </div>
        <span className={styles.badge}>
          Baseline: {baseHolds.toFixed(0)}% Plan Success
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

          const displayLabel = shock.friendlyLabel || shock.label;
          const displayDesc = shock.friendlyDesc || shock.desc;

          return (
            <div key={shock.id} className={styles.row}>
              <div className={styles.factorMeta}>
                <span className={styles.rankChip} title={`Risk ranking #${rank + 1}`}>
                  #{rank + 1}
                </span>
                <span className={styles.factorText}>
                  <span className={styles.factorLabel}>{displayLabel}</span>
                  <span className={styles.factorDesc}>{displayDesc}</span>
                </span>
              </div>

              <div className={styles.divergeTrack}>
                <div className={styles.centerLine} title={`Baseline plan success: ${baseHolds.toFixed(1)}%`} />
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
                <span className={styles.axisEnd} style={{ left: 6 }}>← Hurts plan</span>
                <span className={styles.axisEnd} style={{ right: 6 }}>Helps plan →</span>

                <div className={styles.impactCard} role="tooltip">
                  <div className={styles.impactTitle}>{displayLabel}</div>
                  <div className={styles.impactRow}>
                    <span>Plan success rate</span>
                    <b>{baseHolds.toFixed(1)}% → {shock.shockedHolds.toFixed(1)}%</b>
                  </div>
                  <div className={styles.impactRow}>
                    <span>Impact on success</span>
                    <b className={isNegative ? styles.neg : isPositive ? styles.pos : styles.zero}>
                      {isNegative ? '−' : isPositive ? '+' : ''}{absDelta.toFixed(1)}%
                    </b>
                  </div>
                  <div className={styles.impactRow}>
                    <span>Estimated leftover wealth</span>
                    <b>{fmtCr(baseBq)} → {fmtCr(shockBq)}</b>
                  </div>
                  <div className={styles.impactRow}>
                    <span>Wealth change</span>
                    <b className={bqDelta < -0.005 ? styles.neg : bqDelta > 0.005 ? styles.pos : styles.zero}>
                      {fmtSignedCr(bqDelta)}
                    </b>
                  </div>
                </div>
              </div>

              <div className={styles.deltaPill}>
                <span className={`${styles.deltaVal} ${isNegative ? styles.neg : isPositive ? styles.pos : styles.zero}`}>
                  {isNegative ? '−' : isPositive ? '+' : ''}{absDelta.toFixed(1)}%
                </span>
                <span className={styles.holdsVal}>
                  Success: {shock.shockedHolds.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footnote}>
        💡 <strong>How to read this chart:</strong> Center vertical line represents your current plan baseline ({baseHolds.toFixed(0)}% success). 🔴 <strong>Red bars (left)</strong> show how much a scenario reduces your plan's success rate. 🟢 <strong>Green bars (right)</strong> show potential upside. Hover over any bar to see detailed impact on your wealth.
      </div>

      {/* Smart Suggestions Section */}
      <div className={styles.suggestionsSection}>
        <div className={styles.suggestionsHeader}>
          💡 Smart Action Plan — Protect Against Your Top Risks
        </div>
        <div className={styles.suggestionsGrid}>
          {damagingShocks.length > 0 ? (
            damagingShocks.map((shock) => {
              const isSevere = shock.delta < -10;
              const sug = shock.suggestion || {
                icon: '⚠️',
                headline: `Address risk: ${shock.friendlyLabel || shock.label}`,
                body: 'Review your financial buffers and SIP allocations for this scenario.',
              };

              return (
                <div
                  key={shock.id}
                  className={`${styles.suggestionCard} ${isSevere ? styles.severe : ''}`}
                >
                  <div className={styles.suggestionIcon}>{sug.icon}</div>
                  <div className={styles.suggestionContent}>
                    <div className={styles.suggestionHeadline}>{sug.headline}</div>
                    <div className={styles.suggestionBody}>{sug.body}</div>
                    <div className={`${styles.suggestionTag} ${isSevere ? styles.severe : ''}`}>
                      Drops plan success by {Math.abs(shock.delta).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`${styles.suggestionCard} ${styles.resilient}`}>
              <div className={styles.suggestionIcon}>🛡️</div>
              <div className={styles.suggestionContent}>
                <div className={styles.suggestionHeadline}>Your plan is highly resilient!</div>
                <div className={styles.suggestionBody}>
                  None of the stress test scenarios caused a major drop in plan success. Your current savings rate and asset allocation provide robust protection.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TornadoChart;

