/**
 * Split inflation engine module.
 * Computes weighted composite inflation from 4 CPI categories.
 * @module engine/inflation
 */

import { clamp } from '../utils/format.js';

/**
 * Validate that inflation weights sum to 100.
 * @param {{ consumer: number, food: number, medical: number, education: number }} weights
 * @returns {{ valid: boolean, sum: number }}
 */
export function validateWeights(weights) {
  const sum = (weights.consumer || 0) + (weights.food || 0) +
              (weights.medical || 0) + (weights.education || 0);
  return { valid: sum === 100, sum };
}

/**
 * Compute inflation components from rates and weights.
 * @param {{ consumer: number, food: number, medical: number, education: number }} rates
 *   Annual rates as percentages (e.g., 4.5 for 4.5%)
 * @param {{ consumer: number, food: number, medical: number, education: number }} weights
 *   Category weights as percentages summing to 100
 * @returns {{
 *   rCons: number, rFood: number, rMed: number, rEdu: number,
 *   wCons: number, wFood: number, wMed: number, wEdu: number,
 *   infLiving: number, infMed: number, infEdu: number, infComposite: number,
 *   weightSum: number
 * }}
 */
export function computeInflation(rates, weights) {
  const rCons = (rates.consumer || 0) / 100;
  const rFood = (rates.food || 0) / 100;
  const rMed = (rates.medical || 0) / 100;
  const rEdu = (rates.education || 0) / 100;

  const wCons = weights.consumer || 0;
  const wFood = weights.food || 0;
  const wMed = weights.medical || 0;
  const wEdu = weights.education || 0;

  const wLiv = wCons + wFood || 1;
  const wSum = wCons + wFood + wMed + wEdu || 1;

  const infLiving = (rCons * wCons + rFood * wFood) / wLiv;
  const infMed = rMed;
  const infEdu = rEdu;
  const infComposite = (rCons * wCons + rFood * wFood + rMed * wMed + rEdu * wEdu) / wSum;

  return {
    rCons, rFood, rMed, rEdu,
    wCons, wFood, wMed, wEdu,
    infLiving, infMed, infEdu, infComposite,
    weightSum: wCons + wFood + wMed + wEdu,
  };
}

/**
 * Apply a stochastic shock to inflation rates for Monte Carlo simulation.
 * Medical and education inflation are more sensitive to shocks.
 * @param {Object} baseInf - Result from computeInflation()
 * @param {number} shock - Normal deviate shock magnitude
 * @returns {{ infLiving: number, infMed: number, infEdu: number, infComposite: number }}
 */
export function shockInflation(baseInf, shock) {
  const rC = clamp(baseInf.rCons + shock, 0.01, 0.12);
  const rF = clamp(baseInf.rFood + shock, 0.01, 0.12);
  const rM = clamp(baseInf.rMed + shock * 1.2, 0.02, 0.15);
  const rE = clamp(baseInf.rEdu + shock * 1.1, 0.02, 0.15);

  const wC = baseInf.wCons, wF = baseInf.wFood;
  const wM = baseInf.wMed, wE = baseInf.wEdu;
  const wLiv = wC + wF || 1;
  const wSum = wC + wF + wM + wE || 1;

  return {
    infLiving: (rC * wC + rF * wF) / wLiv,
    infMed: rM,
    infEdu: rE,
    infComposite: (rC * wC + rF * wF + rM * wM + rE * wE) / wSum,
  };
}
