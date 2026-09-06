/**
 * Engine simulation-parameter builder.
 * Converts raw context/display-unit state + derived state into the engine-unit
 * params object expected by runPath / runMonteCarlo.
 *
 * Single source of truth — useSimulation, ComparePanel, and GoalOptimizerPanel
 * must all build params through here so the engine never receives raw state
 * (which lacks bYr/rYr/endYr and uses percent units, producing empty records
 * and downstream crashes).
 *
 * @module engine/params
 */

/**
 * Build engine-unit simulation params from context state.
 *
 * @param {object} state - Raw engine context state (display units: percents, strings)
 * @param {object} derivedState - Derived state ({ baseYear, retireYear, endYear,
 *   currentAge, lastPay, goals }) from EngineContext
 * @returns {object|null} Engine-unit simParams, or null when derived data is missing
 */
export function buildSimParams(state, derivedState) {
  if (!state || !derivedState) return null;

  const { baseYear, retireYear, endYear, currentAge, lastPay, goals } = derivedState;

  const pcBumps = {};
  if (state.payCommissions) {
    Object.entries(state.payCommissions).forEach(([yr, enabled]) => {
      if (enabled) pcBumps[Number(yr)] = 0.25;
    });
  }

  const simParams = {
    bYr: baseYear || new Date().getFullYear(),
    rYr: retireYear || 2052,
    endYr: endYear || (baseYear + 50),
    currentAge: currentAge || 30,
    pcs: pcBumps,
    cpsBal: Number(state.cpsBal) || 0,
    cpsAnn: Number(state.cpsAnn) || 0,
    cpsInc: (Number(state.cpsInc) || 0) / 100,
    cpsRate: (Number(state.cpsRate) || 0) / 100,
    annPct: Number(state.annPct) || 0,
    annYield: (Number(state.annYield) || 0) / 100,
    gratuity: Number(state.gratuity) || 0,
    postRetRate: (Number(state.postRetRate) || 0) / 100,
    retSpend: Number(state.retSpend) || 0,
    medShare: (Number(state.medShare) || 0) / 100,
    sipMo: Number(state.sipMo) || 0,
    sipXirr: (Number(state.sipXirr) || 0) / 100,
    sipStep: (Number(state.sipStep) || 0) / 100,
    mSurplus: Number(state.mSurplus) || 0,
    lastPay: lastPay || { tapsPension: 0, emoluments: 0 },
  };

  // Sum goals LTCG tax for lifetime-tax display (informational; already embedded
  // in grossFV withdrawals, so this is display-only, not a double-deduction).
  simParams.goalsLtcgNominal = (goals || []).reduce((sum, g) => sum + (g.tax || 0), 0);

  return simParams;
}
