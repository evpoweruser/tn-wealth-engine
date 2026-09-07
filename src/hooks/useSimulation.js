import { useMemo } from 'react';
import { useDebounce } from './useDebounce.js';
import { runPath, runMonteCarlo, computeWithdrawals, computeWithdrawalTaxes, computeDedicatedSIP, buildSimParams } from '../engine/index.js';

export function useSimulation(state, derivedState) {
  const debouncedState = useDebounce(state, 150);
  const debouncedDerived = useDebounce(derivedState, 150);

  const results = useMemo(() => {
    if (!debouncedDerived || !debouncedState) return null;

    try {
      const { goals, inflationData } = debouncedDerived;

      const simParams = buildSimParams(debouncedState, debouncedDerived);
      if (!simParams) return null;

      const mode = debouncedState.retireMode || 'taps';
      const withdrawals = computeWithdrawals(goals || []);
      const wTaxDraws = computeWithdrawalTaxes(goals || []);
      const dedicatedSIP = computeDedicatedSIP(goals || [], simParams.bYr, simParams.rYr);

      const feasibility = {
        years: [],
        baseSip: [],
        dedSip: []
      };

      let currentSip = simParams.sipMo;
      for (let y = simParams.bYr; y < simParams.rYr; y++) {
        feasibility.years.push(y);
        feasibility.baseSip.push(currentSip);
        feasibility.dedSip.push(dedicatedSIP[y] || 0);
        currentSip *= (1 + simParams.sipStep);
      }

      if (!debouncedState.mcOn) {
        const res = runPath(
          simParams,
          mode,
          simParams.cpsRate,
          simParams.sipXirr,
          inflationData.infLiving,
          inflationData.infMed,
          inflationData.infEdu,
          inflationData.infComposite,
          withdrawals,
          undefined,
          wTaxDraws
        );

        const detDepleted = !!res.depletedYear;
        return {
          mid: {
            records: res.records,
            finCPS: res.finCPS,
            annuityCorpus: res.annuityCorpus,
            monthlyPension: res.monthlyPension,
            tapsPension: res.tapsPension,
            familyPension: res.familyPension || 0,
            liquidStart: res.liquidStart,
            totalWealthAtRetire: res.totalWealthAtRetire,
            realWealthAtRetire: res.realWealthAtRetire,
            depletedYear: res.depletedYear,
            mode,
            lastEmol: res.lastEmol
          },
          low: { records: res.records },
          high: { records: res.records },
          survivePct: detDepleted ? 0 : 100,
          retP10: null,
          retP90: null,
          retMed: null,
          // Robustness fields — degenerate single-path values
          neverShortPct: res.shortYears === 0 ? 100 : 0,
          exhaustPct: detDepleted ? 100 : 0,
          deplYearMed: res.depletedYear,
          bequestP10: res.bequestReal,
          bequestP50: res.bequestReal,
          taxP50: res.taxReal,
          shortYrsP50: res.shortYears,
          firstShortP50: res.firstShortYear,
          feasibility,
          dedicatedSIP
        };
      } else {
        const mcRes = runMonteCarlo(
          simParams,
          mode,
          inflationData,
          withdrawals,
          {
            runs: Number(debouncedState.mcRuns) || 1000,
            mcMode: debouncedState.mcMode || 'A',
            rngSeed: 42,
          },
          wTaxDraws
        );

        return {
          ...mcRes,
          feasibility,
          dedicatedSIP
        };
      }
    } catch (err) {
      console.error('Error running simulation:', err);
      return null;
    }
  }, [debouncedState, debouncedDerived]);

  return { results, isLoading: false, error: null };
}
