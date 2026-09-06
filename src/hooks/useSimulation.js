import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce.js';
import { runPath, runMonteCarlo, computeWithdrawals, computeDedicatedSIP } from '../engine/index.js';

export function useSimulation(state, derivedState) {
  const debouncedState = useDebounce(state, 150);
  const debouncedDerived = useDebounce(derivedState, 150);

  const results = useMemo(() => {
    if (!debouncedDerived || !debouncedState) return null;

    try {
      const { baseYear, retireYear, endYear, currentAge, lastPay, goals, inflationData } = debouncedDerived;

      const pcBumps = {};
      if (debouncedState.payCommissions) {
        Object.entries(debouncedState.payCommissions).forEach(([yr, enabled]) => {
          if (enabled) pcBumps[Number(yr)] = 0.25;
        });
      }

      const simParams = {
        bYr: baseYear || new Date().getFullYear(),
        rYr: retireYear || 2052,
        endYr: endYear || (baseYear + 50),
        currentAge: currentAge || 30,
        pcs: pcBumps,
        cpsBal: Number(debouncedState.cpsBal) || 0,
        cpsAnn: Number(debouncedState.cpsAnn) || 0,
        cpsInc: (Number(debouncedState.cpsInc) || 0) / 100,
        cpsRate: (Number(debouncedState.cpsRate) || 0) / 100,
        annPct: Number(debouncedState.annPct) || 0,
        annYield: (Number(debouncedState.annYield) || 0) / 100,
        gratuity: Number(debouncedState.gratuity) || 0,
        postRetRate: (Number(debouncedState.postRetRate) || 0) / 100,
        retSpend: Number(debouncedState.retSpend) || 0,
        medShare: (Number(debouncedState.medShare) || 0) / 100,
        sipMo: Number(debouncedState.sipMo) || 0,
        sipXirr: (Number(debouncedState.sipXirr) || 0) / 100,
        sipStep: (Number(debouncedState.sipStep) || 0) / 100,
        mSurplus: Number(debouncedState.mSurplus) || 0,
        lastPay: lastPay || { tapsPension: 0, emoluments: 0 }
      };

      const mode = debouncedState.retireMode || 'taps';
      const withdrawals = computeWithdrawals(goals || []);
      const dedicatedSIP = computeDedicatedSIP(goals || [], simParams.bYr, simParams.rYr);

      // Sum goals LTCG tax for lifetime-tax display (informational; already embedded in grossFV withdrawals)
      simParams.goalsLtcgNominal = (goals || []).reduce((sum, g) => sum + (g.tax || 0), 0);

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
          withdrawals
        );

        const detDepleted = !!res.depletedYear;
        return {
          mid: {
            records: res.records,
            finCPS: res.finCPS,
            annuityCorpus: res.annuityCorpus,
            monthlyPension: res.monthlyPension,
            tapsPension: res.tapsPension,
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
          }
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
