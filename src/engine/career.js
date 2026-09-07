/**
 * Career progression engine module.
 * Projects last pay for TAPS pension and builds detailed CPS corpus.
 * @module engine/career
 */

export function projectLastPay(config) {
  const dor = new Date(config.dor);
  return stepTo(config, dor.getFullYear(), dor.getMonth());
}

/**
 * Project monthly emoluments (basic + DA) for any calendar year in service.
 * Uses the exact same stepping as projectLastPay — at the retirement year the
 * result is bit-identical to projectLastPay().emoluments (pinned by test).
 * Year-end is November (month 10): the legacy loop applies the next year's
 * increment when rolling out of December, so December would overstate by one
 * increment. November matches "last drawn" semantics.
 *
 * @param {object} config - Same config as projectLastPay
 * @param {number} year - Calendar year (clamped to [doj year, dor year])
 * @returns {{ basic:number, da:number, emoluments:number, serviceYears:number }}
 */
export function projectEmolumentsAtYear(config, year) {
  const doj = new Date(config.doj);
  const dor = new Date(config.dor);
  const y = Math.max(doj.getFullYear(), Math.min(dor.getFullYear(), Math.floor(year)));
  const out = stepTo(config, y, 10);
  return { ...out, serviceYears: y - doj.getFullYear() };
}

/** Month-stepping core shared by projectLastPay and projectEmolumentsAtYear. */
function stepTo(config, eY, eM) {
  const doj = new Date(config.doj);
  let basic = config.startBasic || 56100;
  let da = (config.daPct || 60) / 100;
  const mdYear = config.mdYear || 2026;
  const mdIncr = config.mdIncr || 2;
  const pcs = config.payCommissions || {};

  const dacp = {};
  if (config.dacp) {
    Object.entries(config.dacp).forEach(([yrs, pct]) => {
      dacp[Number(yrs)] = (pct || 0) / 100;
    });
  }

  let y = doj.getFullYear();
  let m = doj.getMonth();

  while (y < eY || (y === eY && m <= eM)) {
    if (y === mdYear && m === 6) {
      basic *= Math.pow(1.03, mdIncr);
    }

    if (pcs[y] && m === 0) {
      basic *= 1 + pcs[y];
      da = 0;
    }

    m++;
    if (m > 11) {
      m = 0;
      y++;
      basic *= 1.03;

      const serviceYears = y - doj.getFullYear();
      if (dacp[serviceYears]) {
        basic *= 1 + dacp[serviceYears];
      }

      // DA escalation (annual +6 percentage points, resets on Pay Commission)
      da = da + 0.06;
    }
  }

  const emoluments = basic * (1 + da);
  const tapsPension = 0.5 * emoluments;

  return { basic, da, emoluments, tapsPension };
}

export function buildDetailedCPS(config) {
  const doj = new Date(config.doj);
  const today = config.today || new Date();
  let basic = config.startBasic || 56100;
  let da = (config.daPct || 60) / 100;
  const annualRate = (config.cpsRate || 7.1) / 100;
  const monthlyR = Math.pow(1 + annualRate, 1 / 12) - 1;
  const mdYear = config.mdYear || 2026;
  const mdIncr = config.mdIncr || 2;

  const dacp = {};
  if (config.dacp) {
    Object.entries(config.dacp).forEach(([yrs, pct]) => {
      dacp[Number(yrs)] = (pct || 0) / 100;
    });
  }

  const pcs = config.payCommissions || {};
  let corpus = 0;
  let y = doj.getFullYear();
  let m = doj.getMonth();

  while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
    if (y === mdYear && m === 6) {
      basic *= Math.pow(1.03, mdIncr);
    }

    if (pcs[y] && m === 0) {
      basic *= 1 + pcs[y];
      da = 0;
    }

    // 20% of monthly emoluments (10% employee + 10% employer)
    const monthlyContrib = 0.2 * basic * (1 + da);
    corpus = corpus * (1 + monthlyR) + monthlyContrib;

    m++;
    if (m > 11) {
      m = 0;
      y++;
      basic *= 1.03;
      const serviceYears = y - doj.getFullYear();
      if (dacp[serviceYears]) {
        basic *= 1 + dacp[serviceYears];
      }
      da = da + 0.06;
    }
  }

  const annualContribution = Math.round(basic * (1 + da) * 0.2 * 12);
  const lastPay = projectLastPay(config);

  return { corpus: Math.round(corpus), annualContribution, lastPay };
}
