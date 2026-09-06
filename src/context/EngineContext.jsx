import React, { createContext, useReducer, useEffect, useMemo, useContext } from 'react';
import {
  computeInflation,
  computeBlendedReturn,
  projectLastPay,
  computeGoals
} from '../engine/index.js';
import { ageFromDob } from '../utils/format.js';

const initialState = {
  dob: '1993-05-15',
  doj: '2019-11-01',
  dor: '2052-11-30',
  lifeAge: 85,
  mSurplus: 35000,
  retSpend: 40000,
  medShare: 20,
  gratuity: 2500000,
  postRetRate: 7.5,
  retireMode: 'taps',
  cpsBal: 1583556,
  cpsAnn: 222000,
  cpsInc: 3.0,
  cpsRate: 7.1,
  annPct: 0,
  annYield: 6.5,
  payCommissions: { 2027: true, 2037: true, 2047: true },
  startBasic: 56100,
  mdYear: 2026,
  mdIncr: 2,
  dacp8: 8,
  dacp15: 10,
  dacp17: 8,
  dacp20: 15,
  daPct: 60,
  sipMo: 13000,
  sipStep: 3.0,
  sipXirr: 10.8,
  allocation: { indianEq: 35, usEq: 15, debt: 40, gold: 10 },
  inflation: {
    rates: { consumer: 4.5, food: 5.5, medical: 7.0, education: 8.0 },
    weights: { consumer: 55, food: 15, medical: 20, education: 10 }
  },
  mcOn: true,
  mcMode: 'A',
  mcRuns: 1000,
  stressOn: true,
  sensitivityOn: true,
  children: [
    {
      id: 1,
      name: 'Child 1',
      birth: 2023,
      hAge: 15, hCost: 200000, hFund: 'sip',
      cAge: 18, cCost: 2000000, cFund: 'corpus',
      mAge: 25, mCost: 1000000, mFund: 'corpus'
    }
  ]
};

function engineReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ALLOCATION':
      return { ...state, allocation: { ...state.allocation, [action.key]: action.value } };
    case 'SET_INFLATION_RATE':
      return {
        ...state,
        inflation: {
          ...state.inflation,
          rates: { ...state.inflation.rates, [action.key]: action.value }
        }
      };
    case 'SET_INFLATION_WEIGHT':
      return {
        ...state,
        inflation: {
          ...state.inflation,
          weights: { ...state.inflation.weights, [action.key]: action.value }
        }
      };
    case 'SET_PAY_COMMISSION':
      return {
        ...state,
        payCommissions: { ...state.payCommissions, [action.year]: action.enabled }
      };
    case 'SET_RETIRE_MODE':
      return { ...state, retireMode: action.mode };
    case 'ADD_CHILD':
      return {
        ...state,
        children: [
          ...state.children,
          {
            id: Date.now(),
            name: action.name,
            birth: action.birth,
            hAge: 15, hCost: 200000, hFund: 'sip',
            cAge: 18, cCost: 2000000, cFund: 'corpus',
            mAge: 25, mCost: 1000000, mFund: 'corpus'
          }
        ]
      };
    case 'REMOVE_CHILD':
      return {
        ...state,
        children: state.children.filter(c => c.id !== action.id)
      };
    case 'UPDATE_CHILD':
      return {
        ...state,
        children: state.children.map(c =>
          c.id === action.id ? { ...c, [action.field]: action.value } : c
        )
      };
    case 'CLEAR_CHILDREN':
      return { ...state, children: [] };
    case 'RESET':
      return initialState;
    case 'LOAD_STATE':
      return { ...initialState, ...action.state };
    default:
      return state;
  }
}

export const EngineContext = createContext();

export function EngineProvider({ children }) {
  const [state, dispatch] = useReducer(engineReducer, initialState);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('tn_engine_v5');
      if (saved) {
        dispatch({ type: 'LOAD_STATE', state: JSON.parse(saved) });
      }
    } catch (e) {
      console.error("Error loading state from localStorage", e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem('tn_engine_v5', JSON.stringify(state));
      } catch (e) {
        console.error("Error saving state to localStorage", e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  const derivedState = useMemo(() => {
    const currentAge = ageFromDob(state.dob);
    const baseYear = new Date().getFullYear();
    const retireYear = new Date(state.dor).getFullYear();
    const yearsToRetire = retireYear - baseYear;
    const endYear = baseYear + state.lifeAge - currentAge;

    const inflationData = computeInflation(state.inflation.rates, state.inflation.weights);
    const allocationData = computeBlendedReturn(state.allocation);
    
    // Convert boolean payCommissions to bump values for the engine
    const pcBumps = {};
    Object.entries(state.payCommissions).forEach(([yr, enabled]) => {
      if (enabled) pcBumps[Number(yr)] = 0.25;
    });

    const lastPay = projectLastPay({
      doj: state.doj,
      dor: state.dor,
      startBasic: state.startBasic,
      daPct: state.daPct,
      mdYear: state.mdYear,
      mdIncr: state.mdIncr,
      dacp: { 8: state.dacp8, 15: state.dacp15, 17: state.dacp17, 20: state.dacp20 },
      payCommissions: pcBumps
    });

    const goals = computeGoals(state.children, inflationData, state.sipXirr / 100, baseYear);

    return {
      currentAge,
      baseYear,
      yearsToRetire,
      retireYear,
      endYear,
      inflationData,
      allocationData,
      lastPay,
      goals
    };
  }, [state]);

  return (
    <EngineContext.Provider value={{ state, dispatch, derivedState }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  const context = useContext(EngineContext);
  if (context === undefined) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
}
