/**
 * useStressPanel — runs the 4-regime stress sweep.
 *
 * Computed only when mcOn && stressOn.
 * Uses its own 300ms debounce to avoid blocking the main sim.
 */

import { useMemo } from 'react';
import { useDebounce } from './useDebounce.js';
import { runStressPanel } from '../engine/stress.js';
import { computeWithdrawals } from '../engine/index.js';

export function useStressPanel(state, derivedState, simParams, stressOn) {
  const debouncedState   = useDebounce(state, 300);
  const debouncedDerived = useDebounce(derivedState, 300);
  const debouncedParams  = useDebounce(simParams, 300);

  const stressResults = useMemo(() => {
    if (!stressOn || !debouncedState?.mcOn) return null;
    if (!debouncedParams || !debouncedDerived) return null;

    try {
      const { inflationData } = debouncedDerived;
      const mode = debouncedState.retireMode || 'taps';
      const mcMode = debouncedState.mcMode || 'A';
      const mcRuns = Number(debouncedState.mcRuns) || 1000;

      // Reduced paths: clamp(round(mcRuns/3), 300, 500)
      const paths = Math.min(500, Math.max(300, Math.round(mcRuns / 3)));

      // Use real goal withdrawals so stress results stay consistent with headline sim
      const withdrawals = computeWithdrawals(debouncedDerived.goals || []);

      return runStressPanel(
        debouncedParams,
        mode,
        inflationData,
        withdrawals,
        { paths, mcMode, rngSeed: 99 }
      );
    } catch (err) {
      console.error('Stress panel error:', err);
      return null;
    }
  }, [debouncedState, debouncedDerived, debouncedParams, stressOn]);

  return stressResults;
}
