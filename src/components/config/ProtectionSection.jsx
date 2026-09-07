import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection, RangeInput } from '../shared';
import {
  protectionLump,
  suggestTermTarget,
  protectionGap,
  estimateTermPremium,
  premiumFeasible,
} from '../../engine';
import { fmtCr, formatIndianRupeeWords } from '../../utils/format';
import { ShieldCheck, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import styles from './ProtectionSection.module.css';

export const ProtectionSection = () => {
  const { state, dispatch, derivedState } = useEngine();

  const handleToggleLeg = (leg) => () => {
    dispatch({ type: 'TOGGLE_PROTECTION_LEG', leg });
  };

  const handleFieldChange = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: Number(e.target.value) });
  };

  const currentAge = derivedState?.currentAge || 35;
  const annualEmoluments = (state.startBasic || 56100) * (1 + (state.daPct || 60) / 100) * 12;
  const targetMultiple = state.termTargetMultiple ?? 12;
  const targetCover = suggestTermTarget(annualEmoluments, targetMultiple);

  const protectionInfo = protectionLump({
    fbfOn: state.fbfOn ?? true,
    securityOn: state.securityOn ?? true,
    dcfOn: state.dcfOn ?? true,
    termAmt: state.termAmt || 0,
    gratuity: state.gratuity || 0,
    cpsBal: state.cpsBal || 0,
    sipBal: 0,
  });

  const gapInfo = protectionGap({
    targetCover,
    poolWithoutTerm: protectionInfo.poolWithoutTerm,
  });

  const autoPremium = estimateTermPremium(currentAge, targetCover > 0 ? targetCover : gapInfo.gap);
  const activePremium = state.termPremium > 0 ? state.termPremium : autoPremium.premiumAnnual;
  const feasibility = premiumFeasible(activePremium, state.mSurplus || 0);

  const handleAddSuggestedCover = () => {
    dispatch({ type: 'SET_FIELD', field: 'termAmt', value: targetCover });
  };

  const handleClearTermAmt = () => {
    dispatch({ type: 'SET_FIELD', field: 'termAmt', value: 0 });
  };

  return (
    <CollapsibleSection title="Family Protection & Term Cover" number={6} defaultOpen={false}>
      <div className={styles.sectionContent}>
        {/* Statutory & Voluntary Leg Toggles */}
        <div className={styles.legTogglesBox}>
          <div className={styles.boxTitle}>Statutory & Voluntary Protection Legs</div>
          <div className={styles.legList}>
            <label className={styles.legItem}>
              <input
                type="checkbox"
                checked={state.fbfOn ?? true}
                onChange={handleToggleLeg('fbfOn')}
              />
              <span className={styles.legText}>
                <strong>Family Benefit Fund (FBF)</strong> — ₹1.5 Lakhs
                <span className={styles.legMeta}>TN Govt Statutory (incl. ₹5k funeral advance)</span>
              </span>
            </label>

            <label className={styles.legItem}>
              <input
                type="checkbox"
                checked={state.securityOn ?? true}
                onChange={handleToggleLeg('securityOn')}
              />
              <span className={styles.legText}>
                <strong>Family Security Fund</strong> — ₹5 Lakhs
                <span className={styles.legMeta}>TN Govt Subscriber Fund (G.O.Ms.129 revision)</span>
              </span>
            </label>

            <label className={styles.legItem}>
              <input
                type="checkbox"
                checked={state.dcfOn ?? true}
                onChange={handleToggleLeg('dcfOn')}
              />
              <span className={styles.legText}>
                <strong>Doctors Corpus Fund (DCF)</strong> — ₹1 Crore
                <span className={styles.legMeta}>TNGDA Voluntary Scheme (duty-death basis)</span>
              </span>
            </label>
          </div>
        </div>

        {/* 3-Block Term Protection Gap Card */}
        <div className={styles.gapCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Term Cover Gap Planner</span>
            <span className={styles.multipleBadge}>{targetMultiple}× Annual Income Target</span>
          </div>

          <div className={styles.rangeWrapper}>
            <RangeInput
              label="Target Cover Multiple"
              value={targetMultiple}
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'termTargetMultiple', value: v })}
              min={1}
              max={25}
              step={1}
              suffix="× Income"
            />
          </div>

          <div className={styles.threeBlockGrid}>
            {/* Block A: Target Need */}
            <div className={styles.block}>
              <div className={styles.blockLabel}>Required Target</div>
              <div className={styles.blockValue}>{fmtCr(targetCover)}</div>
              <div className={styles.blockSub}>{formatIndianRupeeWords(targetCover)}</div>
            </div>

            {/* Block B: Existing Pool */}
            <div className={styles.block}>
              <div className={styles.blockLabel}>Existing Assets Pool</div>
              <div className={styles.blockValue}>{fmtCr(protectionInfo.poolWithoutTerm)}</div>
              <div className={styles.blockSub}>
                Gratuity + CPS + Active Statutory Legs
              </div>
            </div>

            {/* Block C: Protection Gap */}
            <div className={`${styles.block} ${gapInfo.covered ? styles.coveredBlock : styles.gapBlock}`}>
              <div className={styles.blockLabel}>Protection Gap</div>
              <div className={styles.blockValue}>
                {gapInfo.covered ? '₹0' : fmtCr(gapInfo.gap)}
              </div>
              <div className={styles.blockSub}>
                {gapInfo.covered ? 'Fully Covered' : formatIndianRupeeWords(gapInfo.gap)}
              </div>
            </div>
          </div>

          {/* Action CTA Row */}
          <div className={styles.ctaRow}>
            {state.termAmt > 0 ? (
              <div className={styles.coverAddedBox}>
                <CheckCircle2 size={16} className={styles.successIcon} />
                <span>Active Term Cover: <strong>{fmtCr(state.termAmt)}</strong></span>
                <button className={styles.clearBtn} onClick={handleClearTermAmt}>Reset</button>
              </div>
            ) : (
              <button className={styles.addCoverBtn} onClick={handleAddSuggestedCover}>
                + Add Suggested Term Cover ({fmtCr(targetCover)})
              </button>
            )}
          </div>

          {/* Custom Term Cover Input */}
          <div className={styles.formGroup}>
            <label>Hold Existing Term Cover (₹)</label>
            <input
              type="number"
              value={state.termAmt || 0}
              onChange={handleFieldChange('termAmt')}
              step={500000}
              placeholder="e.g. 10000000"
            />
            {state.termAmt > 0 && (
              <span className="rupeeHint">{formatIndianRupeeWords(state.termAmt)}</span>
            )}
          </div>
        </div>

        {/* Term Premium & Surplus Feasibility Check */}
        <div className={styles.premiumBox}>
          <div className={styles.premiumHeader}>
            <span className={styles.premiumTitle}>Indicative Term Premium & Affordability</span>
            <span className={styles.ageBandTag}>{autoPremium.ageBand}</span>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Annual Premium (₹/yr)</label>
              <input
                type="number"
                value={state.termPremium || 0}
                onChange={handleFieldChange('termPremium')}
                placeholder={`Auto: ₹${autoPremium.premiumAnnual.toLocaleString('en-IN')}`}
              />
              <span className={styles.hint}>
                {state.termPremium > 0 ? 'User Quote Override' : `Auto-estimated for ${autoPremium.ageBand}`}
              </span>
            </div>

            <div className={styles.formGroup}>
              <label>Monthly Breakout</label>
              <div className={styles.monthlyVal}>
                ₹{feasibility.monthlyPremium.toLocaleString('en-IN')} / month
              </div>
              <span className={styles.hint}>
                Calculated as annual premium ÷ 12
              </span>
            </div>
          </div>

          {/* Surplus Check Badge */}
          <div className={`${styles.feasibilityBadge} ${feasibility.feasible ? styles.feasible : styles.unfeasible}`}>
            {feasibility.feasible ? (
              <>
                <ShieldCheck size={16} />
                <span>
                  <strong>Affordable:</strong> ₹{feasibility.monthlyPremium.toLocaleString('en-IN')}/mo is within your ₹{state.mSurplus?.toLocaleString('en-IN')}/mo monthly surplus ({feasibility.pctOfSurplus}% of surplus)
                </span>
              </>
            ) : (
              <>
                <ShieldAlert size={16} />
                <span>
                  <strong>Surplus Exceeded:</strong> ₹{feasibility.monthlyPremium.toLocaleString('en-IN')}/mo exceeds your ₹{state.mSurplus?.toLocaleString('en-IN')}/mo monthly surplus
                </span>
              </>
            )}
          </div>

          <div className={styles.disclaimer}>
            <Info size={13} />
            <span>{autoPremium.disclaimer}</span>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default ProtectionSection;
