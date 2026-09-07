import { describe, it, expect } from 'vitest';
import {
  STREAMS,
  projectStreamCost,
  streamSipRequired,
  buildStreamScenario,
} from '../streams.js';

describe('college stream projector', () => {
  it('curates 4 streams with trend ordering medical > engineering > arts', () => {
    expect(STREAMS).toHaveLength(4);
    const trend = Object.fromEntries(STREAMS.map((s) => [s.id, s.trend]));
    expect(trend.medical).toBeGreaterThan(trend.engineering);
    expect(trend.engineering).toBeGreaterThan(trend.arts);
    STREAMS.forEach((s) => {
      expect(s.todayAnnual).toBeGreaterThan(0);
      expect(s.courseYears).toBeGreaterThan(0);
      expect(s.sourceYear).toBe(2026);
    });
  });

  it('compounds each course year by the trend (hand-checked)', () => {
    const eng = STREAMS.find((s) => s.id === 'engineering');
    // 10 years out: Σ 220000 × 1.08^(10+k), k = 0..3
    const expected =
      220000 * Math.pow(1.08, 10) +
      220000 * Math.pow(1.08, 11) +
      220000 * Math.pow(1.08, 12) +
      220000 * Math.pow(1.08, 13);
    const { total, entryYearAnnual } = projectStreamCost(eng, 10);
    expect(total).toBe(Math.round(expected));
    expect(entryYearAnnual).toBe(Math.round(220000 * Math.pow(1.08, 10)));
  });

  it('prorates fractional course years (MBBS 5.5)', () => {
    const med = STREAMS.find((s) => s.id === 'medical');
    const { total } = projectStreamCost(med, 0);
    // Fees still inflate during the program: full years k=0..4 + half of year 5.
    const expected =
      1800000 * (1 + 1.09 + Math.pow(1.09, 2) + Math.pow(1.09, 3) + Math.pow(1.09, 4)) +
      1800000 * 0.5 * Math.pow(1.09, 5);
    expect(total).toBe(Math.round(expected));
  });

  it('override annual cost replaces the dataset figure', () => {
    const arts = STREAMS.find((s) => s.id === 'arts');
    const a = projectStreamCost(arts, 5);
    const b = projectStreamCost(arts, 5, 100000);
    expect(b.total).toBeGreaterThan(a.total);
    expect(b.entryYearAnnual).toBe(Math.round(100000 * Math.pow(1 + arts.trend, 5)));
  });

  it('clamps negative years to now-cost', () => {
    const arts = STREAMS.find((s) => s.id === 'arts');
    const { total, yearsLeft } = projectStreamCost(arts, -3);
    expect(yearsLeft).toBe(0);
    // Entry now, but fees still inflate across the 3 course years.
    expect(total).toBe(Math.round(60000 * (1 + 1.06 + Math.pow(1.06, 2))));
  });

  it('required SIP falls as the horizon lengthens', () => {
    const near = streamSipRequired(2000000, 2, 0.108);
    const far = streamSipRequired(2000000, 10, 0.108);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it('buildStreamScenario maps projection to child payload + shift', () => {
    const child = { id: 1, cAge: 18, cCost: 2000000 };
    const sc = buildStreamScenario(child, 3500000);
    expect(sc).toMatchObject({ childId: 1, cAge: 18, cCost: 3500000, costShift: 1500000 });
  });
});
