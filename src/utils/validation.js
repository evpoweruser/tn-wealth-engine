/**
 * Input validation for plan fields (display units).
 * Central ranges table + clamping, applied on SET_FIELD and LOAD_STATE so the
 * engine never receives NaN or absurd values from free-form inputs.
 *
 * @module utils/validation
 */

/**
 * Valid display-unit ranges for numeric plan fields.
 * Fields absent here (booleans, strings, nested objects) pass through.
 */
export const FIELD_RANGES = {
  lifeAge: [50, 100],
  mSurplus: [0, 10000000],
  retSpend: [0, 2000000],
  medShare: [0, 100],
  gratuity: [0, 50000000],
  postRetRate: [0, 30],
  cpsBal: [0, 100000000],
  cpsAnn: [0, 10000000],
  cpsInc: [-50, 100],
  cpsRate: [0, 30],
  annPct: [0, 100],
  annYield: [0, 30],
  startBasic: [0, 5000000],
  mdIncr: [0, 20],
  dacp8: [0, 30],
  dacp15: [0, 30],
  dacp17: [0, 30],
  dacp20: [0, 30],
  daPct: [0, 100],
  sipMo: [0, 5000000],
  sipStep: [0, 50],
  sipXirr: [0, 30],
  mcRuns: [100, 5000],
};

/**
 * Clamp a numeric field into its valid range.
 * Non-numeric input keeps the previous value instead of corrupting state.
 */
export function clampField(field, value, fallback) {
  const range = FIELD_RANGES[field];
  if (!range || typeof value !== 'number' || Number.isNaN(value)) {
    return typeof value === 'number' && Number.isNaN(value) ? fallback : value;
  }
  return Math.max(range[0], Math.min(range[1], value));
}

/**
 * Sanitize a loaded/stale saved state: clamp known numeric fields.
 */
export function sanitizeLoadedState(saved, defaults) {
  const clean = { ...(saved || {}) };
  for (const field of Object.keys(FIELD_RANGES)) {
    if (typeof clean[field] === 'number') {
      clean[field] = clampField(field, clean[field], defaults[field]);
    }
  }
  return clean;
}
