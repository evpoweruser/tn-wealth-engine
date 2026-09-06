import { describe, it, expect } from 'vitest';
import { clampField, sanitizeLoadedState, FIELD_RANGES } from '../../utils/validation.js';

describe('input validation', () => {
  it('clamps out-of-range numbers into range', () => {
    expect(clampField('sipXirr', 99, 10)).toBe(30);
    expect(clampField('sipXirr', -5, 10)).toBe(0);
    expect(clampField('medShare', 150, 20)).toBe(100);
    expect(clampField('mcRuns', 50, 1000)).toBe(100);
  });

  it('keeps the previous value on NaN instead of corrupting state', () => {
    expect(clampField('sipMo', NaN, 13000)).toBe(13000);
  });

  it('passes through unlisted fields untouched', () => {
    expect(clampField('retireMode', 'cps', 'taps')).toBe('cps');
    expect(clampField('ltcOn', true, false)).toBe(true);
  });

  it('sanitizes stale/corrupt saved states', () => {
    const clean = sanitizeLoadedState(
      { sipXirr: 999, retSpend: -100, retireMode: 'cps' },
      { sipXirr: 10.8, retSpend: 40000 }
    );
    expect(clean.sipXirr).toBe(FIELD_RANGES.sipXirr[1]);
    expect(clean.retSpend).toBe(FIELD_RANGES.retSpend[0]);
    expect(clean.retireMode).toBe('cps');
  });
});
