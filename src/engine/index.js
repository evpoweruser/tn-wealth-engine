/**
 * Engine barrel export.
 * Re-exports all calculation modules for convenient importing.
 * @module engine
 */

export { ASSET_RETURNS, computeBlendedReturn } from './allocation.js';
export { computeInflation, shockInflation, validateWeights } from './inflation.js';
export { projectLastPay, buildDetailedCPS, projectEmolumentsAtYear } from './career.js';
export { computeGoals, computeWithdrawals, computeWithdrawalTaxes, computeDedicatedSIP, getSipRequired, estimateWithdrawalLtcg, LTCG_GAINS_FRACTION, LTCG_EXEMPTION, LTCG_RATE } from './goals.js';
export { runPath, runMonteCarlo, randn, percentile, FAMILY_PENSION_FRACTION } from './simulation.js';
export { runStressPanel, applyRegimeOverlay, applyWhatIfCrash, terminalFallPct, REGIMES, WHATIF_PRESETS } from './stress.js';
export { runSensitivity, SENSITIVITY_SHOCKS } from './sensitivity.js';
export { buildSimParams } from './params.js';
export { solveTargetSurvival, evaluateGoalTradeoff } from './solver.js';
export { computeHealthScore, computeSrrResilience, computeTaxEfficiency, recommendScoreActions } from './score.js';
export { STREAMS, projectStreamCost, streamSipRequired, buildStreamScenario } from './streams.js';
export { deathGratuity, survivorBenefit, DCRG_CEILING, ENHANCED_YEARS, ENHANCED_FRACTION } from './survivor.js';
export { PROTECTION_LEGS, TERM_AGE_BANDS, protectionLump, suggestTermTarget, protectionGap, estimateTermPremium, premiumFeasible } from './protection.js';

