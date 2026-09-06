import { fmtCr, fmt } from './format.js';

/**
 * Generates an executive auto-narrative ("Reading the result") — 3–4 sentences
 * synthesizing simulation results, tail risk, tax burden, and stress/sensitivity findings.
 *
 * @param {object} opts
 * @param {object} opts.results           Monte Carlo / deterministic simulation results
 * @param {object} opts.state             User inputs / state
 * @param {object} opts.derivedState      Derived state (goals, retireYear, etc.)
 * @param {Array}  [opts.stressResults]   Optional stress panel results
 * @param {Array}  [opts.sensitivityResults] Optional sensitivity tornado results
 * @returns {string[]} Array of 3-4 narrative paragraph sentences.
 */
export function generateNarrative({ results, state, derivedState, stressResults, sensitivityResults }) {
  if (!results?.mid || !state) {
    return [
      'Simulating wealth trajectory and evaluating plan robustness...'
    ];
  }

  const { mid, survivePct = 100, exhaustPct = 0, retP10, taxRealP50, taxP50, medBufferSurvives } = results;
  const mcOn = state.mcOn ?? true;
  const bYr = state.bYr ?? 30;
  const rYr = state.rYr ?? 58;
  const lifeAge = state.lifeAge ?? 85;
  const retireYear = derivedState?.retireYear ?? (new Date().getFullYear() + (rYr - bYr));
  const sipMo = state.sipMo ?? 0;

  const sentences = [];

  // --- Sentence 1: Plan Sustainability & Longevity ---
  if (mcOn) {
    if (survivePct >= 90) {
      sentences.push(
        `Your plan demonstrates high sustainability with a ${survivePct}% probability of fully funding your lifestyle and goals through age ${lifeAge}+ without corpus exhaustion.`
      );
    } else if (survivePct >= 60) {
      sentences.push(
        `Your plan exhibits a moderate ${survivePct}% survival probability through age ${lifeAge}, but faces depletion risk under adverse market sequences.`
      );
    } else {
      const depYr = mid.depletedYear ? `in ${mid.depletedYear}` : `prior to age ${lifeAge}`;
      sentences.push(
        `Under current parameters, the plan has a ${survivePct}% survival rate, with median liquid reserves projected to exhaust ${depYr}.`
      );
    }
  } else {
    if (mid.depletedYear) {
      sentences.push(
        `Under deterministic assumptions, liquid reserves sustain until ${mid.depletedYear} before depleting.`
      );
    } else {
      sentences.push(
        `Under deterministic assumptions, your corpus remains positive through age ${lifeAge}+ with a projected legacy wealth of ${fmtCr(mid.records?.[mid.records.length - 1]?.tot || 0)}.`
      );
    }
  }

  // --- Sentence 2: Downside Exposure & Retirement Corpus ---
  const retTotVal = fmtCr(mid.totalWealthAtRetire || mid.liquidStart || 0);
  if (mcOn && retP10 != null && retP10 > 0) {
    const p10Val = fmtCr(retP10);
    sentences.push(
      `At retirement in ${retireYear} (age ${rYr}), median total wealth is projected at ${retTotVal}, while downside 10th-percentile (P10) conditions yield ${p10Val}.`
    );
  } else {
    sentences.push(
      `At retirement in ${retireYear} (age ${rYr}), total accumulated corpus is projected at ${retTotVal} with a monthly pension of ${mid.monthlyPension > 0 ? fmt(mid.monthlyPension) + '/mo' : 'lump-sum allocation'}.`
    );
  }

  // --- Sentence 3: Tax & Healthcare Inflation Impact ---
  const taxRealVal = fmtCr(taxRealP50 ?? 0);
  const taxNomVal = fmtCr(taxP50 ?? 0);
  const medStatus = medBufferSurvives === false
    ? 'healthcare inflation poses a drawdown risk as your medical liquid buffer depletes prematurely.'
    : 'your dedicated medical buffer remains intact to absorb rising healthcare inflation.';
  
  sentences.push(
    `Cumulative real tax burden under FY26-27 slabs is estimated at ${taxRealVal} (nominal ${taxNomVal}), while ${medStatus}`
  );

  // --- Sentence 4: Stress Resilience / Top Risk Factor ---
  let stressNote = null;
  if (stressResults && Array.isArray(stressResults) && stressResults.length > 0) {
    const worst = [...stressResults].sort((a, b) => (a.survivePct ?? 0) - (b.survivePct ?? 0))[0];
    if (worst && worst.survivePct < survivePct) {
      stressNote = `Stress testing indicates the ${worst.name} scenario is your largest vulnerability, reducing plan holds to ${worst.survivePct}%.`;
    }
  }

  if (!stressNote && sensitivityResults && Array.isArray(sensitivityResults) && sensitivityResults.length > 0) {
    const topShock = [...sensitivityResults].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];
    if (topShock && Math.abs(topShock.deltaPct) > 0) {
      const direction = topShock.deltaPct < 0 ? 'reduces' : 'increases';
      stressNote = `Sensitivity analysis reveals ${topShock.name} as the key driver, which ${direction} survival by ${Math.abs(topShock.deltaPct)}pp.`;
    }
  }

  if (stressNote) {
    sentences.push(stressNote);
  } else if (sipMo > 0) {
    sentences.push(
      `Maintaining your active monthly SIP of ${fmt(sipMo)} alongside matching pension annuity streams provides a strong core foundation for long-term plan stability.`
    );
  }

  return sentences;
}
