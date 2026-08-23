import { useState, useEffect, useMemo, useRef } from 'react';
import { useDebounce } from './useDebounce.js';
import { runPath, runMonteCarlo, computeWithdrawals, computeDedicatedSIP } from '../engine/index.js';

export function useSimulation(state, derivedState) {
  const debouncedState = useDebounce(state, 300);
  const debouncedDerived = useDebounce(derivedState, 300);
  
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const workerRef = useRef(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../workers/mcWorker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      console.warn('Web Worker construction failed, falling back to main thread:', err);
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const simulationInputs = useMemo(() => {
    if (!debouncedDerived || !debouncedState) return null;
    const {
      baseYear, retireYear, endYear, currentAge, lastPay, goals, inflationData
    } = debouncedDerived;

    const pcBumps = {};
    if (debouncedState.payCommissions) {
      Object.entries(debouncedState.payCommissions).forEach(([yr, enabled]) => {
        if (enabled) pcBumps[Number(yr)] = 0.25;
      });
    }

    const simParams = {
      bYr: baseYear,
      rYr: retireYear,
      endYr: endYear,
      currentAge,
      pcs: pcBumps,
      cpsBal: debouncedState.cpsBal,
      cpsAnn: debouncedState.cpsAnn,
      cpsInc: debouncedState.cpsInc / 100,
      cpsRate: debouncedState.cpsRate / 100,
      annPct: debouncedState.annPct,
      annYield: debouncedState.annYield / 100,
      gratuity: debouncedState.gratuity,
      postRetRate: debouncedState.postRetRate / 100,
      retSpend: debouncedState.retSpend,
      medShare: debouncedState.medShare / 100,
      sipMo: debouncedState.sipMo,
      sipXirr: debouncedState.sipXirr / 100,
      sipStep: debouncedState.sipStep / 100,
      mSurplus: debouncedState.mSurplus,
      lastPay
    };

    const withdrawals = computeWithdrawals(goals, retireYear);
    const dedicatedSIP = computeDedicatedSIP(goals, baseYear, retireYear);
    
    const feasibility = {
      years: [],
      baseSip: [],
      dedSip: []
    };
    
    let currentSip = debouncedState.sipMo;
    for (let y = baseYear; y < retireYear; y++) {
      feasibility.years.push(y);
      feasibility.baseSip.push(currentSip);
      feasibility.dedSip.push(dedicatedSIP[y] || 0);
      currentSip *= (1 + debouncedState.sipStep / 100);
    }

    return {
      params: simParams,
      mode: debouncedState.retireMode || 'taps',
      inflation: inflationData,
      withdrawals,
      dedicatedSIP,
      feasibility,
      mcOn: debouncedState.mcOn,
      mcConfig: {
        runs: debouncedState.mcRuns,
        mcMode: debouncedState.mcMode
      }
    };
  }, [debouncedState, debouncedDerived]);

  useEffect(() => {
    if (!simulationInputs) return;
    const { params, mode, inflation, withdrawals, mcOn, mcConfig, feasibility, dedicatedSIP } = simulationInputs;

    if (!mcOn) {
      try {
        const res = runPath(
          params, 
          mode, 
          params.cpsRate, 
          params.sipXirr, 
          inflation.infLiving, 
          inflation.infMed, 
          inflation.infEdu, 
          inflation.infComposite, 
          withdrawals
        );
        
        setResults({
          mid: {
            records: res.records,
            finCPS: res.finCPS,
            annuityCorpus: res.annuityCorpus,
            monthlyPension: res.monthlyPension,
            tapsPension: res.tapsPension,
            liquidStart: res.liquidStart,
            depletedYear: res.depletedYear,
            mode,
            lastEmol: res.lastEmol
          },
          low: { records: res.records },
          high: { records: res.records },
          survivePct: res.depletedYear ? 0 : 100,
          retP10: null,
          retP90: null,
          retMed: null,
          feasibility,
          dedicatedSIP
        });
        setError(null);
      } catch (err) {
        setError(err);
      }
    } else if (workerRef.current) {
      setIsLoading(true);
      setError(null);
      
      workerRef.current.onmessage = (e) => {
        setResults({ ...e.data, feasibility, dedicatedSIP });
        setIsLoading(false);
      };
      
      workerRef.current.onerror = (err) => {
        console.warn('Worker execution error, calculating on main thread:', err);
        try {
          const res = runMonteCarlo(params, mode, inflation, withdrawals, mcConfig);
          setResults({ ...res, feasibility, dedicatedSIP });
        } catch (syncErr) {
          setError(syncErr);
        }
        setIsLoading(false);
      };
      
      workerRef.current.postMessage({
        params,
        mode,
        inflation,
        withdrawals,
        mcConfig
      });
    } else {
      // Synchronous fallback if Web Worker is unavailable
      try {
        setIsLoading(true);
        const res = runMonteCarlo(params, mode, inflation, withdrawals, mcConfig);
        setResults({ ...res, feasibility, dedicatedSIP });
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [simulationInputs]);

  return { results, isLoading, error };
}
