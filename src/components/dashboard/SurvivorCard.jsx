import React, { useState, useMemo } from 'react';
import { useEngine } from '../../context/EngineContext';
import { projectEmolumentsAtYear, survivorBenefit } from '../../engine';
import { RangeInput, InfoButton } from '../shared';
import { fmt, fmtCr } from '../../utils/format';
import styles from './SurvivorCard.module.css';

/**
 * SurvivorCard — "if I die in service" calculator (Family tab).
 * Death-year slider across service years → spouse two-phase pension, DCRG
 * gratuity slab, protection-leg lump stack, children-inherit pool.
 * No mortality weighting: scenarios, not expectations.
 */
const SurvivorCard = ({ results, isLoading }) => {
  const { state, derivedState } = useEngine();
  const baseYear = derivedState?.baseYear || new Date().getFullYear();
  const retireYear = derivedState?.retireYear || 2052;
  const [deathYear, setDeathYear] = useState(baseYear);

  const calc = useMemo(() => {
    if (!derivedState || !results?.mid?.records?.length) return null;
    try {
      const payConfig = {
        doj: state.doj || '2019-11-01',
        dor: state.dor || '2052-11-30',
        startBasic: state.startBasic || 56100,
        daPct: state.daPct ?? 60,
        mdYear: state.mdYear || 2026,
        mdIncr: state.mdIncr ?? 2,
        dacp: { 8: state.dacp8 ?? 8, 15: state.dacp15 ?? 10, 17: state.dacp17 ?? 8, 20: state.dacp20 ?? 15 },
        payCommissions: (() => {
          const bumps = {};
          if (state.payCommissions) {
            Object.entries(state.payCommissions).forEach(([yr, en]) => {
              if (en) bumps[Number(yr)] = 0.25;
            });
          }
          return bumps;
        })(),
      };
      const atDeath = projectEmolumentsAtYear(payConfig, deathYear);
      const rec = results.mid.records.find((r) => r.yr === deathYear && r.phase === 'acc');
      const sipBalance = Math.round((rec?.sip || 0) * 1e7);
      const cpsBalance = Math.round((rec?.cps || 0) * 1e7);
      const out = survivorBenefit({
        emolumentsAtDeath: atDeath.emoluments,
        serviceYears: atDeath.serviceYears,
        sipBalance,
        cpsBalance,
        fbfOn: state.fbfOn !== false,
        securityOn: state.securityOn !== false,
        dcfOn: state.dcfOn !== false,
        termAmt: Number(state.termAmt) || 0,
      });
      return { ...out, serviceYears: atDeath.serviceYears, emoluments: atDeath.emoluments, sipBalance, cpsBalance };
    } catch (err) {
      console.error('Survivor calc error:', err);
      return null;
    }
  }, [derivedState, results, deathYear, state]);

  if (isLoading || !calc) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>If I die in service <InfoButton id="survivor" /></h3>
        <div className={styles.loading}>Preparing survivor estimates…</div>
      </div>
    );
  }

  const stackRows = [
    { label: 'Death gratuity (DCRG slab)', value: calc.gratuity },
    { label: 'SIP corpus at death year', value: calc.sipBalance },
    { label: 'CPS corpus at death year', value: calc.cpsBalance },
    ...calc.legs.filter((l) => l.active).map((l) => ({ label: l.label, value: l.currentAmount })),
  ];
  const stackTotal = stackRows.reduce((s, r) => s + r.value, 0);

  return (
    <div className={styles.card} data-pdf="survivor">
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>If I die in service <InfoButton id="survivor" /></h3>
          <p className={styles.subtitle}>
            Scenario for death in {deathYear} ({calc.serviceYears} yrs service) — "if", not "when"
          </p>
        </div>
      </div>

      <RangeInput
        label="Death year"
        value={deathYear}
        min={baseYear}
        max={retireYear}
        step={1}
        suffix=""
        id="survivor-year"
        onChange={setDeathYear}
      />

      <div className={styles.grid}>
        <div className={styles.block}>
          <div className={styles.blockTitle}>Spouse gets monthly</div>
          <div className={styles.bigNumber}>{fmt(calc.phase1Mo)} <span>/mo × 7 yrs</span></div>
          <div className={styles.subNote}>then {fmt(calc.phase2Mo)}/mo (60% of notional pension, DA-indexed)</div>
        </div>
        <div className={styles.block}>
          <div className={styles.blockTitle}>Children inherit (lump pool)</div>
          <div className={styles.bigNumber}>{fmtCr(calc.childrenInherit)}</div>
          <div className={styles.subNote}>gratuity + balances + protection legs at {deathYear}</div>
        </div>
      </div>

      <div className={styles.bar}>
        {stackRows.map((r) => (
          <div
            key={r.label}
            className={styles.segment}
            style={{ width: `${stackTotal > 0 ? (r.value / stackTotal) * 100 : 0}%` }}
            title={`${r.label}: ${fmtCr(r.value)}`}
          />
        ))}
      </div>
      <div className={styles.legend}>
        {stackRows.map((r) => (
          <span key={r.label} className={styles.legendItem} title={`${r.label}: ${fmtCr(r.value)}`}>
            {r.label} · <b>{fmtCr(r.value)}</b>
          </span>
        ))}
      </div>

      <p className={styles.footnote}>
        Enhanced 50% × 7 yrs then 60%-of-notional (G.O.Ms.No.07); DCRG slabs capped ₹25L;
        DCF assumes contributing member + duty death. Verify current rules with Treasury.
      </p>
    </div>
  );
};

export default SurvivorCard;
