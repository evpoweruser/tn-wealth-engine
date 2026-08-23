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
