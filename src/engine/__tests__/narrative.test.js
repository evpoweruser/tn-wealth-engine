import { describe, it, expect } from 'vitest';
import { generateNarrative } from '../../utils/narrative.js';

describe('generateNarrative', () => {
  const mockState = {
    bYr: 30,
    rYr: 58,
    lifeAge: 85,
    mcOn: true,
    sipMo: 25000,
    retireMode: 'taps',
  };

  const mockDerivedState = {
    retireYear: 2054,
    lifeYear: 2081,
    goals: [],
  };

  const mockResultsHighSurvival = {
    survivePct: 97,
    exhaustPct: 3,
    mid: {
      totalWealthAtRetire: 25000000,
      liquidStart: 20000000,
      monthlyPension: 85000,
      depletedYear: null,
    },
    retP10: 18000000,
    taxRealP50: 1200000,
    taxP50: 3500000,
    medBufferSurvives: true,
  };

  const mockResultsLowSurvival = {
    survivePct: 45,
    exhaustPct: 55,
    mid: {
      totalWealthAtRetire: 12000000,
      liquidStart: 10000000,
      monthlyPension: 35000,
      depletedYear: 2068,
    },
    retP10: 6000000,
    taxRealP50: 800000,
    taxP50: 2100000,
    medBufferSurvives: false,
  };

  it('generates 4 clear sentences for high survival plan', () => {
    const sentences = generateNarrative({
      results: mockResultsHighSurvival,
      state: mockState,
      derivedState: mockDerivedState,
    });

    expect(sentences).toHaveLength(4);
    expect(sentences[0]).toContain('97% probability');
    expect(sentences[0]).toContain('age 85+');
    expect(sentences[1]).toContain('2054');
    expect(sentences[1]).toContain('P10');
    expect(sentences[2]).toContain('tax burden');
    expect(sentences[2]).toContain('remains intact');
    expect(sentences[3]).toContain('SIP of');
  });

  it('generates accurate depletion sentence for low survival plan', () => {
    const sentences = generateNarrative({
      results: mockResultsLowSurvival,
      state: mockState,
      derivedState: mockDerivedState,
    });

    expect(sentences[0]).toContain('45% survival rate');
    expect(sentences[0]).toContain('exhaust in 2068');
    expect(sentences[2]).toContain('depletes prematurely');
  });

  it('incorporates worst stress regime when provided', () => {
    const mockStressResults = [
      { id: 'stagflation', name: 'Stagflation', survivePct: 92 },
      { id: 'earlyCrash', name: 'Early Crash', survivePct: 74 },
    ];

    const sentences = generateNarrative({
      results: mockResultsHighSurvival,
      state: mockState,
      derivedState: mockDerivedState,
      stressResults: mockStressResults,
    });

    expect(sentences[3]).toContain('Early Crash scenario');
    expect(sentences[3]).toContain('74%');
  });

  it('handles fallback gracefully when results are empty or loading', () => {
    const sentences = generateNarrative({ results: null, state: null });
    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toContain('Simulating wealth trajectory');
  });
});
