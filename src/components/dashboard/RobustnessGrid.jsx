import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { KpiCard } from '../shared';
import { fmtCr, fmtPct0 } from '../../utils/format';
import styles from './RobustnessGrid.module.css';

/**
 * RobustnessGrid — second KPI row showing probabilistic health metrics.
 *
 * Cards:
 *  1. Never-short %   — share of MC runs with zero shortfall years
 *  2. Exhausts %      — share of runs that deplete corpus (inverse of survivePct)
 *  3. Real bequest    — terminal corpus in today's ₹ (median, P10 subtitle)
 *  4. Lifetime tax    — Σ pension/annuity tax (real ₹, goals LTCG excl.)
 */
const RobustnessGrid = ({ results, isLoading }) => {
  const { state } = useEngine();

  const loading = isLoading || !results;

  if (loading) {
    return (
      <div className={styles.grid}>
        <KpiCard title="Never-short" value="—" subtitle="Calculating" loading />
        <KpiCard title="Exhausts" value="—" subtitle="Calculating" loading />
        <KpiCard title="Real Bequest" value="—" subtitle="Calculating" loading />
        <KpiCard title="Lifetime Tax" value="—" subtitle="Calculating" loading />
      </div>
    );
  }

  const {
    neverShortPct,
    exhaustPct,
    bequestP50,
    bequestP10,
    taxP50,
    shortYrsP50,
    deplYearMed,
  } = results;

  const mcOn = state.mcOn ?? true;

  // ── 1. Never-short ──────────────────────────────────────────────────────
  const nsp = neverShortPct ?? 0;
  const neverShortVal = mcOn ? fmtPct0(nsp) : (shortYrsP50 === 0 ? 'OK' : `Short ${shortYrsP50} yr`);
  const neverShortSub = mcOn
    ? (shortYrsP50 > 0 ? `Median ${Math.round(shortYrsP50)} short yr(s)` : 'No shortfall yrs (median)')
    : 'Deterministic';
  const neverShortColor =
    nsp >= 80 ? 'var(--accent-green)' :
    nsp >= 50 ? 'var(--accent-amber, #f59e0b)' :
    'var(--accent-red)';

  // ── 2. Exhausts % ───────────────────────────────────────────────────────
  const exPct = exhaustPct ?? 0;
  const exhaustsVal = mcOn ? fmtPct0(exPct) : (exPct > 0 ? 'Depletes' : 'Sustains');
  const exhaustsSub = deplYearMed
    ? `Median depletion: ${deplYearMed}`
    : (mcOn ? 'None exhaust (median)' : 'Full plan age');
  const exhaustsColor =
    exPct > 20 ? 'var(--accent-red)' :
    exPct > 5  ? 'var(--accent-amber, #f59e0b)' :
    'var(--accent-green)';

  // ── 3. Real Bequest ─────────────────────────────────────────────────────
  const bq50 = bequestP50 ?? 0;
  const bqVal = fmtCr(bq50);
  const bqSub = mcOn && bequestP10 != null
    ? `P10: ${fmtCr(bequestP10)} (today's ₹)`
    : "Today's ₹ at terminal age";

  // ── 4. Lifetime Tax ──────────────────────────────────────────────────────
  const tax = taxP50 ?? 0;
  const taxVal = fmtCr(tax);
  const taxSub = mcOn
    ? 'Pension tax + goals LTCG, real ₹ (median) · FY26-27 new regime · informational'
    : 'Pension tax + goals LTCG, real ₹ · FY26-27 new regime · informational';

  return (
    <div className={styles.grid}>
      <KpiCard
        title="Never-short"
        value={neverShortVal}
        subtitle={neverShortSub}
        valueColor={neverShortColor}
      />
      <KpiCard
        title="Exhausts"
        value={exhaustsVal}
        subtitle={exhaustsSub}
        valueColor={exhaustsColor}
      />
      <KpiCard
        title="Real Bequest"
        value={bqVal}
        subtitle={bqSub}
        valueColor="var(--accent-purple)"
      />
      <KpiCard
        title="Lifetime Tax"
        value={taxVal}
        subtitle={taxSub}
      />
    </div>
  );
};

export default RobustnessGrid;
