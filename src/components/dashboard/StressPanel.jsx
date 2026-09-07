import React from 'react';
import { fmtCr, fmtPct0, fmt } from '../../utils/format';
import { InfoButton } from '../shared';
import styles from './StressPanel.module.css';

/**
 * StressPanel — shows 4-regime stress-test results as a compact table.
 *
 * Rendered below WealthChart, above the feasibility row.
 * Hidden when MC is off or stressOn is false.
 * Clicking a row toggles a deterministic stressed trajectory overlay on WealthChart.
 */
const StressPanel = ({ stressResults, mcOn, stressOn, selectedId, onToggleOverlay, spouseCover, mode }) => {
  if (!mcOn) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>Stress Regimes</span>
        </div>
        <div className={styles.callout}>
          Enable Monte Carlo to view stress-test results.
        </div>
      </div>
    );
  }

  if (!stressOn) return null;

  if (!stressResults) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>Stress Regimes</span>
          <span className={styles.badge}>5 regimes · reduced paths</span>
        </div>
        <div className={styles.callout}>Running stress analysis…</div>
      </div>
    );
  }

  return (
    <div className={styles.panel} data-pdf="stress-panel">
      <div className={styles.header}>
        <span className={styles.title}>Stress Regimes</span>
        <InfoButton id="stress-regimes" />
        <span className={styles.badge}>5 regimes · reduced paths (≈⌈N/3⌉)</span>
      </div>

      {mode === 'taps' && spouseCover > 0 ? (
        <div className={styles.callout} style={{ fontStyle: 'normal' }}>
          👪 Spouse cover: ≈{fmt(spouseCover)}/mo family pension (60% of pension per
          G.O.Ms.No.07, DA-indexed) — pay-based, unaffected by these market shocks.
        </div>
      ) : (
        <div className={styles.callout} style={{ fontStyle: 'normal' }}>
          No family pension under lump-sum CPS in this model (a voluntary annuity could
          carry a spouse option — unmodeled).
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
            <thead>
              <tr>
                <th>Regime</th>
                <th title="% of paths that sustain to plan age (non-depleted)">Holds</th>
                <th title="Median number of shortfall years across all paths">Short yrs P50</th>
                <th title="Median inheritable corpus in today's ₹ (liquid only — annuity excluded)">Bequest P50</th>
                <th title="Bequest at 10th-percentile path in today's ₹ — reads ₹0 whenever ≥10% of paths deplete">Bequest P10</th>
                <th title="% of paths where corpus depletes before plan age">Exhausts</th>
              </tr>
            </thead>
            <tbody>
            {stressResults.map(({ regime, holdsPct, shortYrsP50, bequestP10, bequestP50, exhaustPct }) => {
              const holdsColor =
                holdsPct >= 80 ? 'var(--accent-green)' :
                holdsPct >= 50 ? 'var(--accent-amber, #f59e0b)' :
                'var(--accent-red)';
              const exhaustColor =
                exhaustPct > 20 ? 'var(--accent-red)' :
                exhaustPct > 5  ? 'var(--accent-amber, #f59e0b)' :
                'var(--accent-green)';

              return (
                <tr
                  key={regime.id}
                  onClick={onToggleOverlay ? () => onToggleOverlay(regime.id) : undefined}
                  style={onToggleOverlay ? {
                    cursor: 'pointer',
                    background: selectedId === regime.id ? 'var(--bg-hover, rgba(56,189,248,0.08))' : undefined,
                  } : undefined}
                  title={onToggleOverlay ? 'Click to overlay this regime on the wealth chart' : undefined}
                >
                  <td>
                    <div className={styles.regimeLabel}>{regime.label}</div>
                    <div className={styles.regimeBlurb}>{regime.blurb}</div>
                  </td>
                  <td style={{ color: holdsColor, fontWeight: 600 }}>
                    {fmtPct0(holdsPct)}
                  </td>
                  <td>{Math.round(shortYrsP50)}</td>
                  <td title="Median inheritable legacy (today's ₹)">{fmtCr(bequestP50 ?? 0)}</td>
                  <td title={exhaustPct >= 10 ? 'Bottom 10% of paths deplete before plan age — see Exhausts' : 'Bequest at 10th-percentile path in today\'s ₹'}>{fmtCr(bequestP10 ?? 0)}</td>
                  <td style={{ color: exhaustColor, fontWeight: 600 }}>
                    {fmtPct0(exhaustPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.footnote}>
        Stress overlaid on selected MC mode · Reduced paths per regime ·
        Holds = non-depleted share (funded-ratio deferred) · FY26-27 tax basis ·
        TAPS pension is pay-based, so crashes hit the corpus legs, not the pension ·
        Click a row to overlay its path on the wealth chart{selectedId ? ' (click again to clear)' : ''}.
      </div>
    </div>
  );
};

export default StressPanel;
