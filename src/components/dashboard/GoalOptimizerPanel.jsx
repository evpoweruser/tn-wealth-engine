import React, { useState, useMemo } from 'react';
import { useEngine } from '../../context/EngineContext';
import { solveTargetSurvival, buildSimParams, computeWithdrawals, computeWithdrawalTaxes } from '../../engine';
import { formatIndianRupeeWords } from '../../utils/format';
import { InfoButton } from '../shared';
import styles from './GoalOptimizerPanel.module.css';

export const GoalOptimizerPanel = () => {
  const { state, derivedState, dispatch } = useEngine();

  // Solver local controls
  const [targetSurvivePct, setTargetSurvivePct] = useState(99);
  const [solveField, setSolveField] = useState('sipStep');
  const [solverResult, setSolverResult] = useState(null);
  const [solverError, setSolverError] = useState(null);
  const [isSolving, setIsSolving] = useState(false);

  // (College stream planning lives in StreamPlanner on the Family tab.)

  // Apply Solver Recommendation

  // Engine-unit sim params (never pass raw context state into the engine —
  // it lacks bYr/rYr/endYr and uses percent units, which crashes runMonteCarlo).
  const simParams = useMemo(
    () => buildSimParams(state, derivedState),
    [state, derivedState]
  );
  const inflation = derivedState?.inflationData || null;
  const mode = state.retireMode || 'taps';

  // Handle Reverse Solver Run
  const handleSolve = () => {
    if (!simParams || !inflation) {
      setSolverError('Plan data is still loading — try again in a moment.');
      return;
    }
    setIsSolving(true);
    setSolverError(null);
    setTimeout(() => {
      try {
        const res = solveTargetSurvival({
          params: simParams,
          mode,
          inflation,
          withdrawals: computeWithdrawals(derivedState.goals || []),
          wTaxDraws: computeWithdrawalTaxes(derivedState.goals || []),
          targetSurvivePct,
          solveField,
          mcRuns: 250,
        });
        setSolverResult(res);
      } catch (err) {
        console.error('Solver error:', err);
        setSolverError('Solver failed — check plan inputs and try again.');
        setSolverResult(null);
      } finally {
        setIsSolving(false);
      }
    }, 50);
  };

  // Apply Solver Recommendation
  const handleApplySolver = () => {
    if (!solverResult) return;
    dispatch({
      type: 'SET_FIELD',
      field: solverResult.field,
      value: solverResult.solvedValue,
    });
  };

  // College stream planning lives in StreamPlanner.jsx (Family tab).

  const getFieldLabel = (f) => {
    if (f === 'sipStep') return 'Annual SIP Step-Up %';
    if (f === 'sipMo') return 'Monthly SIP (₹)';
    if (f === 'retSpend') return 'Retirement Spend (₹)';
    return f;
  };

  const formatFieldValue = (f, val) => {
    if (f === 'sipStep') return `${val}%`;
    return formatIndianRupeeWords(val);
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>⚡</span>
          <div>
            <div className={styles.title}>Smart Goal Optimizer & Reverse Solver <InfoButton id="optimizer" /></div>
            <div className={styles.subTitle}>
              Automated reverse solver — what input hits your survival target?
            </div>
          </div>
        </div>
      </div>

      <div className={styles.solverContainer}>
          <div className={styles.solverGrid}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Target Plan Survival</span>
              <div className={styles.pillGroup}>
                {[90, 95, 99].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`${styles.pillBtn} ${targetSurvivePct === pct ? styles.activePill : ''}`}
                    onClick={() => setTargetSurvivePct(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Variable to Solve For</span>
              <select
                value={solveField}
                onChange={(e) => setSolveField(e.target.value)}
                className={styles.selectInput}
              >
                <option value="sipStep">Annual SIP Step-Up %</option>
                <option value="sipMo">Initial Monthly SIP (₹)</option>
                <option value="retSpend">Retirement Monthly Spend (₹)</option>
              </select>
            </div>

            <button
              type="button"
              className={styles.solveActionBtn}
              onClick={handleSolve}
              disabled={isSolving}
            >
              {isSolving ? 'Solving Math...' : `⚡ Calculate Required ${getFieldLabel(solveField)}`}
            </button>
          </div>

          {solverError && (
            <div className={styles.resultCard}>
              <div className={styles.resultSubText}>{solverError}</div>
            </div>
          )}

          {solverResult && (
            <div className={styles.resultCard}>
              <div className={styles.resultInfo}>
                <div className={styles.resultHeadline}>
                  Recommended {getFieldLabel(solverResult.field)}:{' '}
                  <span className={styles.resultHighlight}>
                    {formatFieldValue(solverResult.field, solverResult.solvedValue)}
                  </span>
                  {' '}
                  <span style={{ opacity: 0.7 }}>
                    ({solverResult.delta >= 0 ? '+' : ''}{formatFieldValue(solverResult.field, solverResult.delta)})
                  </span>
                </div>
                <div className={styles.resultSubText}>
                  Current: {formatFieldValue(solverResult.field, solverResult.currentValue)} ({solverResult.currentSurvivePct}% survival) → Achieves {solverResult.achievedSurvivePct}% Plan Survival
                </div>
              </div>
              <button
                type="button"
                className={styles.applyBtn}
                onClick={handleApplySolver}
              >
                Apply Recommendation to Plan
              </button>
            </div>
          )}
        </div>
      </div>
  );
};
