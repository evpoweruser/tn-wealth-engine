import { describe, it, expect } from 'vitest';
import { projectLastPay, projectEmolumentsAtYear } from '../career.js';
import {
  deathGratuity,
  survivorBenefit,
  DCRG_CEILING,
  ENHANCED_YEARS,
} from '../survivor.js';

const config = {
  doj: '2019-11-01',
  dor: '2052-11-30',
  startBasic: 56100,
  daPct: 60,
  mdYear: 2026,
  mdIncr: 2,
  dacp: { 8: 8, 15: 10, 17: 8, 20: 15 },
  payCommissions: { 2027: 0.25, 2037: 0.25, 2047: 0.25 },
};

describe('projectEmolumentsAtYear', () => {
  it('is bit-identical to projectLastPay at the retirement year', () => {
    const last = projectLastPay(config);
    const atRetire = projectEmolumentsAtYear(config, 2052);
    expect(atRetire.emoluments).toBe(last.emoluments);
    expect(atRetire.basic).toBe(last.basic);
    expect(atRetire.serviceYears).toBe(2052 - 2019);
  });

  it('grows monotonically across service and clamps outside [doj, dor]', () => {
    const early = projectEmolumentsAtYear(config, 2025);
    const late = projectEmolumentsAtYear(config, 2045);
    expect(late.emoluments).toBeGreaterThan(early.emoluments);
    expect(projectEmolumentsAtYear(config, 1990).emoluments)
      .toBe(projectEmolumentsAtYear(config, 2019).emoluments);
    expect(projectEmolumentsAtYear(config, 2100).emoluments)
      .toBe(projectEmolumentsAtYear(config, 2052).emoluments);
  });
});

describe('deathGratuity slabs (TN Pension Rules §45(1)(b))', () => {
  const e = 100000;
  it('<1 yr: 2x', () => expect(deathGratuity(e, 0.5)).toBe(200000));
  it('1-5 yrs: 6x', () => expect(deathGratuity(e, 3)).toBe(600000));
  it('5-20 yrs: 12x', () => {
    expect(deathGratuity(e, 5)).toBe(1200000);
    expect(deathGratuity(e, 19.9)).toBe(1200000);
  });
  it('20+ yrs: half-month per 6 months, max 33x (subject to ceiling)', () => {
    expect(deathGratuity(e, 20)).toBe(2000000); // 40 halves × 0.5 = 20x
    expect(deathGratuity(50000, 40)).toBe(1650000); // 33x cap, under ceiling
    expect(deathGratuity(100000, 40)).toBe(2500000); // 33x would be 33L → ceiling
  });
  it('caps at the DCRG ceiling', () => {
    expect(DCRG_CEILING).toBe(2500000);
    expect(deathGratuity(500000, 30)).toBe(2500000);
  });
});

describe('survivorBenefit', () => {
  const base = {
    emolumentsAtDeath: 200000,
    serviceYears: 15,
    sipBalance: 3000000,
    cpsBalance: 4000000,
  };

  it('pays enhanced 50% x 7 yrs then 60%-of-notional', () => {
    const r = survivorBenefit(base);
    expect(r.phase1Mo).toBe(100000);
    expect(r.phase2Mo).toBe(60000); // 0.6 × 0.5 × 200000
    expect(r.enhancedYears).toBe(ENHANCED_YEARS);
  });

  it('pools gratuity + balances + protection legs; children inherit the pool', () => {
    const r = survivorBenefit(base);
    // gratuity 12×200000=24L; protection 1.5L+5L+100L; balances 30L+40L
    expect(r.gratuity).toBe(2400000);
    expect(r.childrenInherit).toBe(r.lumpTotal);
    expect(r.lumpTotal).toBe(
      2400000 + 3000000 + 4000000 + 150000 + 500000 + 10000000
    );
  });

  it('toggles exclude legs; term adds on top', () => {
    const noDcf = survivorBenefit({ ...base, dcfOn: false });
    expect(noDcf.lumpTotal).toBe(2400000 + 3000000 + 4000000 + 150000 + 500000);
    const withTerm = survivorBenefit({ ...base, termAmt: 10000000 });
    expect(withTerm.lumpTotal).toBe(noDcf.lumpTotal + 10000000 + 10000000);
  });
});
