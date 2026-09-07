import { describe, it, expect } from 'vitest';
import { PANEL_INFO, PANEL_IDS } from '../panelInfo.js';

// Panels wiring an <InfoButton id="…"/> — cross-checked against the map.
const REFERENCED_IDS = [
  'kpi',
  'narrative',
  'health-score',
  'milestones',
  'spending',
  'buckets',
  'feasibility',
  'goals-table',
  'compare',
  'robustness',
  'optimizer',
  'wealth-chart',
  'what-if',
  'stress-regimes',
  'tornado',
];

describe('panel explainer content', () => {
  it('covers every referenced panel id', () => {
    expect(PANEL_IDS).toEqual(expect.arrayContaining(REFERENCED_IDS));
  });

  it('every entry has a title and all four non-empty sections', () => {
    for (const id of PANEL_IDS) {
      const entry = PANEL_INFO[id];
      expect(entry.title, `${id}: title`).toBeTruthy();
      for (const key of ['assumptions', 'says', 'doesntSay']) {
        expect(Array.isArray(entry[key]), `${id}.${key} is a list`).toBe(true);
        expect(entry[key].length, `${id}.${key} non-empty`).toBeGreaterThan(0);
        entry[key].forEach((line, i) => {
          expect(typeof line, `${id}.${key}[${i}]`).toBe('string');
          expect(line.trim().length, `${id}.${key}[${i}] non-blank`).toBeGreaterThan(0);
        });
      }
      expect(typeof entry.howToRead, `${id}.howToRead`).toBe('string');
      expect(entry.howToRead.trim().length, `${id}.howToRead non-blank`).toBeGreaterThan(0);
    }
  });
});
