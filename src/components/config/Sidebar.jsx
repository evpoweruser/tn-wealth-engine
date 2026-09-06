import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CareerSection } from './CareerSection';
import { SchemeSection } from './SchemeSection';
import { SipSection } from './SipSection';
import { InflationSection } from './InflationSection';
import { MonteCarloSection } from './MonteCarloSection';
import { ChildrenSection } from './ChildrenSection';
import styles from './Sidebar.module.css';
import { SlidersHorizontal } from 'lucide-react';

export const Sidebar = () => {
  const { derivedState } = useEngine();
  const goalCount = derivedState?.goals?.length ?? 0;

  return (
    <aside className={styles.sidebar} aria-label="Configuration">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <SlidersHorizontal size={14} aria-hidden="true" />
          Configuration
        </h2>
        <span className={styles.meta} title="Configured milestone goals">
          {goalCount > 0 ? `${goalCount} goal${goalCount > 1 ? 's' : ''}` : '6 sections'}
        </span>
      </div>
      
      <div className={styles.scrollArea}>
        <div className={styles.sections}>
          <CareerSection />
          <SchemeSection />
          <SipSection />
          <InflationSection />
          <MonteCarloSection />
          <ChildrenSection />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
