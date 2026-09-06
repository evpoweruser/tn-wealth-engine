import React, { useState, useMemo } from 'react';
import { useEngine } from '../../context/EngineContext';
import { solveTargetSurvival, evaluateGoalTradeoff, buildSimParams, computeWithdrawals } from '../../engine';
import { formatIndianRupeeWords } from '../../utils/format';
import styles from './GoalOptimizerPanel.module.css';

export const GoalOptimizerPanel = () => {
  const { state, derivedState, dispatch } = useEngine();
  const [activeTab, setActiveTab] = useState('solver');

  // Solver local controls
  const [targetSurvivePct, setTargetSurvivePct] = useState(99);
  const [solveField, setSolveField] = useState('sipStep');
  const [solverResult, setSolverResult] = useState(null);
  const [solverError, setSolverError] = useState(null);
  const [isSolving, setIsSolving] = useState(false);

  // Tradeoff local state: map of childId -> { hAgeShift, cAgeShift, mAgeShift, hCostShift, cCostShift, mCostShift }
  const [tradeoffs, setTradeoffs] = useState({});

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

  // Evaluate Tradeoffs Live
  const tradeoffModifications = useMemo(() => {
    return Object.entries(tradeoffs).map(([childId, shifts]) => ({
      childId,
      ...shifts,
    }));
  }, [tradeoffs]);

  const tradeoffResult = useMemo(() => {
    if (!state.children?.length || !simParams || !inflation) return null;
    try {
      return evaluateGoalTradeoff({
        simParams,
        mode,
        inflation,
        children: state.children,
        goalModifications: tradeoffModifications,
      });
    } catch (err) {
      console.error('Tradeoff evaluation error:', err);
      return null;
    }
  }, [state.children, simParams, mode, inflation, tradeoffModifications]);

  // Handle Tradeoff Steppers
  const updateTradeoff = (childId, key, delta) => {
    setTradeoffs((prev) => {
      const existing = prev[childId] || {
        hAgeShift: 0, cAgeShift: 0, mAgeShift: 0,
        hCostShift: 0, cCostShift: 0, mCostShift: 0,
      };
      return {
        ...prev,
        [childId]: {
          ...existing,
          [key]: (existing[key] || 0) + delta,
        },
      };
    });
  };

  // Apply Tradeoffs to State
  const handleApplyTradeoffs = () => {
    if (!tradeoffResult?.modifiedChildren) return;
    tradeoffResult.modifiedChildren.forEach((child) => {
      dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'hAge', value: child.hAge });
      dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'cAge', value: child.cAge });
      dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'mAge', value: child.mAge });
      dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'hCost', value: child.hCost });
      dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'cCost', value: child.cCost });
      dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'mCost', value: child.mCost });
    });
    setTradeoffs({});
  };

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
            <div className={styles.title}>Smart Goal Optimizer & Reverse Solver</div>
            <div className={styles.subTitle}>
              Automated reverse solver & drag-and-drop goal tradeoff matrix
            </div>
          </div>
        </div>

        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'solver' ? styles.active : ''}`}
            onClick={() => setActiveTab('solver')}
          >
            Reverse Solver
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'tradeoff' ? styles.active : ''}`}
            onClick={() => setActiveTab('tradeoff')}
          >
            Goal Tradeoff Matrix
          </button>
        </div>
      </div>

      {activeTab === 'solver' ? (
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
      ) : (
        <div className={styles.tradeoffContainer}>
          {state.children?.length ? (
            state.children.map((child) => {
              const childShifts = tradeoffs[child.id] || {};
              return (
                <div key={child.id} className={styles.childCard}>
                  <div className={styles.childName}>{child.name} ({child.birth})</div>

                  {/* Higher Secondary */}
                  <div className={styles.milestoneRow}>
                    <span className={styles.mLabel}>Higher Sec</span>
                    <div className={styles.stepperGroup}>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'hAgeShift', -1)}>-</button>
                      <span className={styles.stepVal}>{(child.hAge ?? 15) + (childShifts.hAgeShift || 0)} yrs</span>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'hAgeShift', 1)}>+</button>
                    </div>
                    <div className={styles.stepperGroup}>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'hCostShift', -50000)}>-</button>
                      <span className={styles.stepVal}>{formatIndianRupeeWords(Math.max(0, (child.hCost ?? 200000) + (childShifts.hCostShift || 0)))}</span>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'hCostShift', 50000)}>+</button>
                    </div>
                  </div>

                  {/* College */}
                  <div className={styles.milestoneRow}>
                    <span className={styles.mLabel}>College</span>
                    <div className={styles.stepperGroup}>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'cAgeShift', -1)}>-</button>
                      <span className={styles.stepVal}>{(child.cAge ?? 18) + (childShifts.cAgeShift || 0)} yrs</span>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'cAgeShift', 1)}>+</button>
                    </div>
                    <div className={styles.stepperGroup}>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'cCostShift', -200000)}>-</button>
                      <span className={styles.stepVal}>{formatIndianRupeeWords(Math.max(0, (child.cCost ?? 2000000) + (childShifts.cCostShift || 0)))}</span>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'cCostShift', 200000)}>+</button>
                    </div>
                  </div>

                  {/* Marriage */}
                  <div className={styles.milestoneRow}>
                    <span className={styles.mLabel}>Marriage</span>
                    <div className={styles.stepperGroup}>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'mAgeShift', -1)}>-</button>
                      <span className={styles.stepVal}>{(child.mAge ?? 25) + (childShifts.mAgeShift || 0)} yrs</span>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'mAgeShift', 1)}>+</button>
                    </div>
                    <div className={styles.stepperGroup}>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'mCostShift', -200000)}>-</button>
                      <span className={styles.stepVal}>{formatIndianRupeeWords(Math.max(0, (child.mCost ?? 1000000) + (childShifts.mCostShift || 0)))}</span>
                      <button type="button" className={styles.stepBtn} onClick={() => updateTradeoff(child.id, 'mCostShift', 200000)}>+</button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.noChildrenNotice}>
              No child education or marriage goals added yet. Add a child card in the sidebar to configure tradeoff scenarios.
            </div>
          )}

          {tradeoffResult && (
            <div className={styles.impactBadgeCard}>
              <div>
                <div className={styles.impactTitle}>Goal Adjustment Impact</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Baseline: {tradeoffResult.baselineSurvivePct}% survival → Modified: {tradeoffResult.modifiedSurvivePct}% survival
                </div>
              </div>
              <div className={`${styles.impactDelta} ${tradeoffResult.deltaSurvivePct >= 0 ? styles.positiveDelta : styles.negativeDelta}`}>
                {tradeoffResult.deltaSurvivePct >= 0 ? '+' : ''}{tradeoffResult.deltaSurvivePct}% Boost
              </div>
              <button
                type="button"
                className={styles.applyBtn}
                onClick={handleApplyTradeoffs}
              >
                Apply Tradeoffs to Plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
