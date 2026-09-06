/**
 * Engine barrel export.
 * Re-exports all calculation modules for convenient importing.
 * @module engine
 */

export { ASSET_RETURNS, computeBlendedReturn } from './allocation.js';
export { computeInflation, shockInflation, validateWeights } from './inflation.js';
export { projectLastPay, buildDetailedCPS } from './career.js';
export { computeGoals, computeWithdrawals, computeDedicatedSIP, getSipRequired } from './goals.js';
export { runPath, runMonteCarlo, randn, percentile } from './simulation.js';
export { runStressPanel, applyRegimeOverlay, REGIMES } from './stress.js';
export { runSensitivity, SENSITIVITY_SHOCKS } from './sensitivity.js';
export { buildSimParams } from './params.js';
export { solveTargetSurvival, evaluateGoalTradeoff } from './solver.js';
export { computeHealthScore, computeSrrResilience, computeTaxEfficiency, recommendScoreActions } from './score.js';
