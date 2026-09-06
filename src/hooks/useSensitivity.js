/**
 * useSensitivity — runs 1-factor sensitivity tornado sweep.
 *
 * Computed only when mcOn && sensitivityOn.
 * Uses its own 300ms debounce to avoid blocking the main sim.
 */

import { useMemo } from 'react';
import { useDebounce } from './useDebounce.js';
import { runSensitivity } from '../engine/sensitivity.js';
import { computeWithdrawals } from '../engine/index.js';

export function useSensitivity(state, derivedState, simParams, sensitivityOn) {
  const debouncedState   = useDebounce(state, 300);
  const debouncedDerived = useDebounce(derivedState, 300);
  const debouncedParams  = useDebounce(simParams, 300);

  const sensitivityResults = useMemo(() => {
    if (!sensitivityOn || !debouncedState?.mcOn) return null;
    if (!debouncedParams || !debouncedDerived) return null;

    try {
      const { inflationData } = debouncedDerived;
      const mode = debouncedState.retireMode || 'taps';
      const mcMode = debouncedState.mcMode || 'A';
      const mcRuns = Number(debouncedState.mcRuns) || 1000;

      // Reduced paths: clamp(round(mcRuns/3), 300, 500)
      const paths = Math.min(500, Math.max(300, Math.round(mcRuns / 3)));

      // Use real goal withdrawals so sensitivity results stay consistent with headline sim
      const withdrawals = computeWithdrawals(debouncedDerived.goals || []);

      return runSensitivity(
        debouncedParams,
        mode,
        inflationData,
        withdrawals,
        { paths, mcMode, rngSeed: 77 }
      );
    } catch (err) {
      console.error('Sensitivity analysis error:', err);
      return null;
    }
  }, [debouncedState, debouncedDerived, debouncedParams, sensitivityOn]);

  return sensitivityResults;
}
