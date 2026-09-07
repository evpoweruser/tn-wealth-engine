import React, { useState, useMemo } from 'react';
import { useEngine } from '../../context/EngineContext';
import { solveTargetSurvival, evaluateGoalTradeoff, buildSimParams, computeWithdrawals, computeWithdrawalTaxes, STREAMS, projectStreamCost, streamSipRequired, buildStreamScenario } from '../../engine';
import { formatIndianRupeeWords } from '../../utils/format';
import { InfoButton } from '../shared';
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

  // Stream planner state (replaces the old stepper matrix)
  const [streamChildId, setStreamChildId] = useState(null);
  const [streamId, setStreamId] = useState('engineering');
  const [costOverride, setCostOverride] = useState('');

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

  // ---- College stream planner: what will each stream cost at entry? ----
  const activeChild = state.children?.find((c) => String(c.id) === String(streamChildId))
    || state.children?.[0] || null;
  const activeStream = STREAMS.find((s) => s.id === streamId) || STREAMS[0];
  const baseYear = derivedState?.baseYear || new Date().getFullYear();
  const collegeEntryYear = activeChild
    ? (Number(activeChild.birth) || baseYear) + (activeChild.cAge ?? 18)
    : baseYear;
  const streamYearsLeft = Math.max(0, collegeEntryYear - baseYear);
  const overrideAnnual = Number(costOverride) > 0 ? Number(costOverride) : undefined;

  const streamProj = projectStreamCost(activeStream, streamYearsLeft, overrideAnnual);
  const streamSip = simParams ? streamSipRequired(streamProj.total, streamYearsLeft, simParams.sipXirr) : 0;

  const streamScenario = useMemo(
    () => (activeChild ? buildStreamScenario(activeChild, streamProj.total) : null),
    // total is the only projected input; child identity covers the rest
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChild, streamProj.total]
  );

  // Live plan impact of adopting the projected cost (single scenario, 2×500 paths)
  const streamImpact = useMemo(() => {
    if (!activeChild || !simParams || !inflation || !streamScenario) return null;
    try {
      return evaluateGoalTradeoff({
        simParams,
        mode,
        inflation,
        children: state.children,
        goalModifications: [{ childId: streamScenario.childId, cCostShift: streamScenario.costShift }],
      });
    } catch (err) {
      console.error('Stream impact error:', err);
      return null;
    }
  }, [activeChild, simParams, inflation, state.children, mode, streamScenario]);

  // Apply Stream Cost to State
  const handleApplyStream = () => {
    if (!streamScenario) return;
    const child = state.children?.find((c) => String(c.id) === String(streamScenario.childId));
    if (!child) return;
    dispatch({ type: 'UPDATE_CHILD', id: child.id, field: 'cCost', value: streamScenario.cCost });
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
            <div className={styles.title}>Smart Goal Optimizer & Reverse Solver <InfoButton id="optimizer" /></div>
            <div className={styles.subTitle}>
              Automated reverse solver & college stream cost planner
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
              className={`${styles.tabBtn} ${activeTab === 'streams' ? styles.active : ''}`}
              onClick={() => setActiveTab('streams')}
            >
              Stream Planner
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
          {!activeChild ? (
            <div className={styles.noChildrenNotice}>
              No child education goals added yet. Add a child card in the sidebar to plan college streams.
            </div>
          ) : (
            <>
              {state.children.length > 1 && (
                <div className={styles.pillGroup}>
                  {state.children.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.pillBtn} ${String(c.id) === String(activeChild.id) ? styles.activePill : ''}`}
                      onClick={() => setStreamChildId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.streamGrid}>
                {STREAMS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`${styles.streamCard} ${s.id === activeStream.id ? styles.activeStreamCard : ''}`}
                    onClick={() => setStreamId(s.id)}
                  >
                    <div className={styles.streamName}>{s.label}</div>
                    <div className={styles.streamEx}>{s.examples}</div>
                    <div className={styles.streamMeta}>
                      {formatIndianRupeeWords(s.todayAnnual)}/yr · {s.courseYears} yrs · +{Math.round(s.trend * 100)}%/yr
                    </div>
                  </button>
                ))}
              </div>

              <div className={styles.overrideRow}>
                <label className={styles.controlLabel} htmlFor="stream-override">
                  Actual quote (₹/yr, optional — overrides the {activeStream.sourceYear} estimate)
                </label>
                <input
                  id="stream-override"
                  type="number"
                  min={0}
                  step={10000}
                  value={costOverride}
                  placeholder={String(activeStream.todayAnnual)}
                  onChange={(e) => setCostOverride(e.target.value)}
                  className={styles.overrideInput}
                />
              </div>

              <div className={styles.resultCard}>
                <div className={styles.resultInfo}>
                  <div className={styles.resultHeadline}>
                    {activeChild.name} · {activeStream.label} in {collegeEntryYear}:{' '}
                    <span className={styles.resultHighlight}>
                      {formatIndianRupeeWords(streamProj.total)}
                    </span>
                  </div>
                  <div className={styles.resultSubText}>
                    Entry-year fee {formatIndianRupeeWords(streamProj.entryYearAnnual)}/yr ·
                    needs {formatIndianRupeeWords(Math.round(streamSip))}/mo SIP from now
                    {streamImpact && (
                      <> · plan survival {streamImpact.baselineSurvivePct}% → {streamImpact.modifiedSurvivePct}%</>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.applyBtn}
                  onClick={handleApplyStream}
                >
                  Apply Cost to Plan
                </button>
              </div>

              <div className={styles.datasetNote}>
                Indicative {activeStream.sourceYear} TN private-college estimates — replace with actual
                college quotes. Dataset refresh: yearly.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
