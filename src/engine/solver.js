/**
 * Reverse Solver & Goal Tradeoff Engine Module.
 * Calculates exact SIP step-up / initial SIP requirements for target plan survival
 * and simulates interactive goal tradeoff modifications.
 * @module engine/solver
 */

import { runMonteCarlo } from './simulation.js';
import { computeGoals, computeWithdrawals } from './goals.js';

/**
 * Solve for the parameter value required to achieve target Monte Carlo survival %
 *
 * @param {object} options
 * @param {object} options.params - Engine-unit sim params (see buildSimParams):
 *   bYr/rYr/endYr present, rates as decimals. NEVER raw context state.
 * @param {string} [options.mode='taps'] - 'taps' | 'cps' | 'compare'
 * @param {object} options.inflation - Inflation rates object
 * @param {object} [options.withdrawals={}] - Year-keyed goal withdrawals map
 * @param {number} [options.targetSurvivePct=99] - Target plan survival percentage (e.g. 99)
 * @param {string} [options.solveField='sipStep'] - Field to solve for: 'sipStep' | 'sipMo' | 'retSpend'
 * @param {number} [options.mcRuns=250] - Number of runs per solver iteration
 * @returns {object} Solution result { field, currentValue, targetSurvivePct, solvedValue, delta, achievedSurvivePct, iterations }
 */
export function solveTargetSurvival({
  params,
  mode = 'taps',
  inflation,
  withdrawals = {},
  targetSurvivePct = 99,
  solveField = 'sipStep',
  mcRuns = 250,
}) {
  const mcConfig = { runs: mcRuns, mcMode: 'A', rngSeed: 42 };

  // sipStep is solved in PERCENT units for display; the engine field is decimal.
  const toEngine = (field, val) => (field === 'sipStep' ? val / 100 : val);
  const toDisplay = (field, val) => (field === 'sipStep' ? val * 100 : val);

  let minVal = 0;
  let maxVal = 100;
  let currentValue = 0;

  if (solveField === 'sipStep') {
    currentValue = toDisplay('sipStep', params.sipStep ?? 0.03);
    minVal = 0;
    maxVal = 30; // Max 30% step-up
  } else if (solveField === 'sipMo') {
    currentValue = params.sipMo ?? 0;
    minVal = 0;
    maxVal = Math.max(500000, (currentValue || 10000) * 5);
  } else if (solveField === 'retSpend') {
    currentValue = params.retSpend ?? 0;
    minVal = 0;
    maxVal = Math.max((currentValue || 50000) * 2, 500000);
  }

  const evalSurvive = (testVal) => {
    const testParams = { ...params, [solveField]: toEngine(solveField, testVal) };
    const res = runMonteCarlo(testParams, mode, inflation, withdrawals, mcConfig);
    return res.survivePct;
  };

  const currentSurvivePct = evalSurvive(currentValue);

  const isHigherBetter = solveField === 'sipStep' || solveField === 'sipMo';

  let low = minVal;
  let high = maxVal;
  let bestVal = currentValue;
  let iterations = 0;

  const MAX_ITER = 12;
  while (iterations < MAX_ITER && (high - low > (solveField === 'sipStep' ? 0.05 : 100))) {
    iterations++;
    const mid = (low + high) / 2;
    const midSurvive = evalSurvive(mid);

    if (isHigherBetter) {
      if (midSurvive >= targetSurvivePct) {
        bestVal = mid;
        high = mid; // Seek smaller valid value
      } else {
        low = mid;
      }
    } else {
      // retSpend: lower spend -> higher survival
      if (midSurvive >= targetSurvivePct) {
        bestVal = mid;
        low = mid; // Seek higher spend that still satisfies target
      } else {
        high = mid;
      }
    }
  }

  // Final verification with 1,000 runs
  const finalParams = { ...params, [solveField]: toEngine(solveField, bestVal) };
  const finalMC = runMonteCarlo(finalParams, mode, inflation, withdrawals, { runs: 1000, mcMode: 'A', rngSeed: 42 });

  return {
    field: solveField,
    currentValue,
    solvedValue: solveField === 'sipStep' ? Number(bestVal.toFixed(1)) : Math.round(bestVal),
    delta: solveField === 'sipStep' ? Number((bestVal - currentValue).toFixed(1)) : Math.round(bestVal - currentValue),
    targetSurvivePct,
    currentSurvivePct: Math.round(currentSurvivePct),
    achievedSurvivePct: Math.round(finalMC.survivePct),
    iterations,
  };
}

/**
 * Evaluate goal tradeoff scenario modifications.
 *
 * @param {object} options
 * @param {object} options.simParams - Engine-unit sim params (see buildSimParams).
 *   NEVER raw context state (it lacks bYr/rYr/endYr and uses percent units).
 * @param {string} [options.mode='taps'] - 'taps' | 'cps'
 * @param {object} options.inflation - Inflation rates object ({ infLiving, infMed,
 *   infEdu, infComposite } decimals)
 * @param {Array<object>} [options.children=[]] - Child goal records
 * @param {Array<object>} [options.goalModifications=[]] - List of modifications [{ childId, hAgeShift, cAgeShift, mAgeShift, hCostShift, cCostShift, mCostShift }]
 * @returns {object} { baselineSurvivePct, modifiedSurvivePct, deltaSurvivePct, baselineBequestP50, modifiedBequestP50, modifiedChildren }
 */
export function evaluateGoalTradeoff({ simParams, mode = 'taps', inflation, children = [], goalModifications = [] }) {
  const mcConfig = { runs: 500, mcMode: 'A', rngSeed: 42 };

  // Baseline withdrawals & MC (goals computed with the canonical engine signature)
  const baseGoalData = computeGoals(children, inflation, simParams.sipXirr, simParams.bYr);
  const baseWithdrawals = computeWithdrawals(baseGoalData);
  const baseMC = runMonteCarlo(simParams, mode, inflation, baseWithdrawals, mcConfig);

  // Apply goal modifications
  const modifiedChildren = (children || []).map((child) => {
    const mod = goalModifications.find((m) => m.childId === child.id);
    if (!mod) return child;

    const newChild = { ...child };
    if (mod.hAgeShift) newChild.hAge = (child.hAge ?? 15) + mod.hAgeShift;
    if (mod.cAgeShift) newChild.cAge = (child.cAge ?? 18) + mod.cAgeShift;
    if (mod.mAgeShift) newChild.mAge = (child.mAge ?? 25) + mod.mAgeShift;

    if (mod.hCostShift) newChild.hCost = Math.max(0, (child.hCost ?? 200000) + mod.hCostShift);
    if (mod.cCostShift) newChild.cCost = Math.max(0, (child.cCost ?? 2000000) + mod.cCostShift);
    if (mod.mCostShift) newChild.mCost = Math.max(0, (child.mCost ?? 1000000) + mod.mCostShift);

    return newChild;
  });

  const modGoalData = computeGoals(modifiedChildren, inflation, simParams.sipXirr, simParams.bYr);
  const modWithdrawals = computeWithdrawals(modGoalData);
  const modMC = runMonteCarlo(simParams, mode, inflation, modWithdrawals, mcConfig);

  return {
    baselineSurvivePct: Math.round(baseMC.survivePct),
    modifiedSurvivePct: Math.round(modMC.survivePct),
    deltaSurvivePct: Math.round(modMC.survivePct - baseMC.survivePct),
    baselineBequestP50: baseMC.bequestP50,
    modifiedBequestP50: modMC.bequestP50,
    modifiedChildren,
  };
}
