import React, { useState } from 'react';
import { useEngine } from '../../context/EngineContext';
import { RangeInput, InfoButton } from '../shared';
import { WHATIF_PRESETS } from '../../engine';
import { fmtCr } from '../../utils/format';
import styles from './WhatIfCrashControls.module.css';

/**
 * WhatIfCrashControls — interactive crash simulator.
 * Pick a crash year + depth (or a historical preset) → a dashed amber
 * trajectory is plotted over the wealth chart via the overlay path.
 * Works in calendar years; App converts to the engine's absolute year index.
 */
const WhatIfCrashControls = ({ whatIf, impact, onChange, onClear }) => {
  const { derivedState } = useEngine();
  const [open, setOpen] = useState(false);

  if (!derivedState) return null;
  const { baseYear, retireYear, endYear, currentAge } = derivedState;

  if (!open && !whatIf) {
    return (
      <div className={styles.card}>
        <button type="button" className={styles.toggleBtn} onClick={() => setOpen(true)}>
          📉 Simulate a market crash
        </button>
        <span className={styles.hint}>Pick any year + depth — see the dashed trajectory on the chart</span>
      </div>
    );
  }

  const crashYear = whatIf?.crashYear ?? retireYear;
  const depthPct = Math.round((whatIf?.depth ?? 0.30) * 100);
  const ageAtCrash = currentAge + (crashYear - baseYear);

  const update = (patch) => {
    if (onChange) onChange({ crashYear, depth: depthPct / 100, ...patch });
  };

  return (
    <div className={styles.card} data-pdf="whatif-controls">
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>What-if crash <InfoButton id="what-if" /></h3>
          <p className={styles.subtitle}>
            Deterministic single-path shock · amber dashed line · coexists with regime overlay
          </p>
        </div>
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => { setOpen(false); if (onClear) onClear(); }}
        >
          Clear
        </button>
      </div>

      <div className={styles.grid}>
        <RangeInput
          label={`Crash year (age ${ageAtCrash})`}
          value={crashYear}
          min={baseYear}
          max={endYear}
          step={1}
          suffix=""
          id="whatif-year"
          onChange={(v) => update({ crashYear: v })}
        />
        <RangeInput
          label="First-year depth"
          value={depthPct}
          min={10}
          max={50}
          step={1}
          suffix="%"
          id="whatif-depth"
          onChange={(v) => update({ depth: v / 100 })}
        />
      </div>

      <div className={styles.presets}>
        {WHATIF_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.presetBtn} ${depthPct === Math.round(p.depth * 100) ? styles.activePreset : ''}`}
            onClick={() => update({ depth: p.depth })}
            title={`First-year drop −${Math.round(p.depth * 100)}%`}
          >
            {p.label} −{Math.round(p.depth * 100)}%
          </button>
        ))}
      </div>

      {impact?.fallPct != null && impact?.shockTerm != null && (
        <div className={styles.impactLine} title="Terminal corpus under the shocked path vs the median plan">
          Final corpus <b>{fmtCr(impact.shockTerm * 1e7)}</b>
          <span className={styles.fallPct}>
            &nbsp;({impact.fallPct <= 0 ? '' : '+'}{impact.fallPct.toFixed(1)}% vs plan)
          </span>
        </div>
      )}
    </div>
  );
};

export default WhatIfCrashControls;
