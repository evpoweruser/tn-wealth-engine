import { describe, it, expect } from 'vitest';
import { runPath } from '../simulation.js';
import { applyRegimeOverlay } from '../stress.js';

// ── runPath yearlyOverlay wiring tests ────────────────────────────────────────
// Task: drawdown-loop overlay invocation (docs/PROGRESS.md). The overlay must
// fire per drawdown year with yearIdx = accYears + j, not just in accumulation.

const params = {
  bYr: 2026,
  rYr: 2046,          // accYears = 20
  endYr: 2076,        // drawdownYears = 30
  currentAge: 30,
  pcs: {},
  cpsBal: 2000000,
  cpsAnn: 300000,
  cpsInc: 0.03,
  sipMo: 20000,
  sipStep: 0.05,
  gratuity: 1000000,
  postRetRate: 0.06,
  retSpend: 20000,
  medShare: 0.25,
  annPct: 0,
  annYield: 0.07,
  lastPay: { tapsPension: 30000, emoluments: 100000 },
};

const mode = 'taps';
const cRate = 0.071, sXirr = 0.10;
const infL = 0.045, infM = 0.07, infE = 0.08, infC = 0.05;
const wDraws = {};

const ACC_YEARS = 20;
const DRAW_YEARS = 30;

function runWithOverlay(overlay) {
  return runPath(params, mode, cRate, sXirr, infL, infM, infE, infC, wDraws, overlay);
}

describe('runPath overlay wiring — identity', () => {
  it('null overlay ≡ no overlay (identical records)', () => {
    const a = runWithOverlay(null);
    const b = runWithOverlay(undefined);
    expect(a.records).toEqual(b.records);
    expect(a.shortYears).toBe(b.shortYears);
    expect(a.taxNominal).toBe(b.taxNominal);
  });

  it('constant (pass-through) overlay ≡ no overlay', () => {
    const passThrough = (rates) => ({ ...rates });
    const a = runWithOverlay(passThrough);
    const b = runWithOverlay(undefined);
    expect(a.records).toEqual(b.records);
  });
});

describe('runPath overlay wiring — call order', () => {
  it('overlay fires for every accumulation year 0..accYears', () => {
    const seen = [];
    runWithOverlay((rates, yearIdx) => { seen.push(yearIdx); return rates; });
    expect(seen.slice(0, ACC_YEARS + 1)).toEqual(
      Array.from({ length: ACC_YEARS + 1 }, (_, i) => i)
    );
  });

  it('overlay fires per drawdown year with yearIdx = accYears + j', () => {
    const seen = [];
    runWithOverlay((rates, yearIdx) => { seen.push(yearIdx); return rates; });
    const drawSeen = seen.slice(ACC_YEARS + 1);
    expect(drawSeen).toEqual(
      Array.from({ length: DRAW_YEARS }, (_, k) => ACC_YEARS + 1 + k)
    );
  });
});

describe('runPath overlay wiring — drawdown effect', () => {
  // Medical-shock style overlay: +2pp infM only in drawdown years.
  // Must raise drawdown medical spend → lower liquid vs null overlay.
  const medShockDrawdown = (rates, yearIdx) =>
    yearIdx > ACC_YEARS
      ? { ...rates, infM: rates.infM + 0.02, infC: rates.infC + 0.006 }
      : { ...rates };

  it('drawdown-only inflation shock changes drawdown liquid', () => {
    const base = runWithOverlay(null);
    const shocked = runWithOverlay(medShockDrawdown);
    const idx = (ACC_YEARS + 1) + 5; // 6th drawdown record
    expect(shocked.records[idx].liquid).toBeLessThan(base.records[idx].liquid);
  });

  it('accumulation records unchanged by drawdown-only shock', () => {
    const base = runWithOverlay(null);
    const shocked = runWithOverlay(medShockDrawdown);
    expect(shocked.records.slice(0, ACC_YEARS + 1)).toEqual(
      base.records.slice(0, ACC_YEARS + 1)
    );
  });
});

describe('runPath overlay wiring — window reconvergence', () => {
  it('early_crash overlay past its window returns rates unchanged in drawdown', () => {
    // accYears (20) >> early_crash window (yrs 0-1): drawdown indices must be identity.
    const out = applyRegimeOverlay(
      { sXirr, cRate, infL, infM, infE, infC }, ACC_YEARS + 5, 'early_crash'
    );
    expect(out.sXirr).toBeCloseTo(sXirr, 10);
    expect(out.infL).toBeCloseTo(infL, 10);
  });

  it('medical_shock overlay still applies at drawdown indices', () => {
    const out = applyRegimeOverlay(
      { sXirr, cRate, infL, infM, infE, infC }, ACC_YEARS + 5, 'medical_shock'
    );
    expect(out.infM).toBeCloseTo(infM + 0.02, 10);
  });
});

describe('runMonteCarlo malformed-params guard (prod .tot crash regression)', () => {
  it('throws a descriptive error — not a cryptic .tot TypeError — on raw state without bYr/rYr', async () => {
    const { runMonteCarlo } = await import('../simulation.js');
    // Raw context state shape: no bYr/rYr/endYr (those live in derivedState).
    const rawState = { sipMo: 25000, sipXirr: 10.8, retireMode: 'taps', children: [] };
    const inflation = { infLiving: 0.05, infMed: 0.07, infEdu: 0.08, infComposite: 0.055 };
    expect(() => runMonteCarlo(rawState, 'taps', inflation, {}, { runs: 10, mcMode: 'A', rngSeed: 42 }))
      .toThrow(/zero records|buildSimParams/);
  });
});

describe('runPath long-term care (LTC) modeling', () => {
  const ltcParams = { ...params, ltcOn: true };

  it('is off by default: identical records with and without the flag absent', () => {
    const a = runWithOverlay(null);
    const b = runPath({ ...params, ltcOn: false }, mode, cRate, sXirr, infL, infM, infE, infC, wDraws, null);
    expect(b.records.length).toBe(a.records.length);
    expect(b.records[b.records.length - 1].tot).toBeCloseTo(a.records[a.records.length - 1].tot, 10);
  });

  it('steps up medical spend growth from age 65', () => {
    const off = runWithOverlay(null);
    const on = runPath(ltcParams, mode, cRate, sXirr, infL, infM, infE, infC, wDraws, null);
    const drawOff = off.records.filter((r) => r.phase === 'draw');
    const drawOn = on.records.filter((r) => r.phase === 'draw');
    // Before 65: identical med spend; from 65: LTC path spends more per year.
    const pre65 = drawOn.findIndex((r) => r.age >= 65);
    expect(drawOn[0].expMed).toBeCloseTo(drawOff[0].expMed, 10);
    expect(drawOn[pre65].expMed).toBeGreaterThan(drawOff[pre65].expMed);
    // Drawdown records carry the spend split for the spending chart.
    expect(drawOn[0]).toMatchObject({ expLiv: expect.any(Number), expMed: expect.any(Number), expTot: expect.any(Number) });
  });

  it('deducts the critical-illness shock once at age 75', () => {
    const on = runPath(ltcParams, mode, cRate, sXirr, infL, infM, infE, infC, wDraws, null);
    expect(on.ltcShockYear).not.toBeNull();
    const shockRec = on.records.find((r) => r.ltcShock > 0);
    expect(shockRec.age).toBe(75);
    expect(shockRec.ltcShock).toBeCloseTo(500000, 6);
    expect(on.records.filter((r) => r.ltcShock > 0).length).toBe(1);
  });
});
