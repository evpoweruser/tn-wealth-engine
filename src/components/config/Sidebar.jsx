import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { CareerSection } from './CareerSection';
import { SchemeSection } from './SchemeSection';
import { SipSection } from './SipSection';
import { InflationSection } from './InflationSection';
import { MonteCarloSection } from './MonteCarloSection';
import { ProtectionSection } from './ProtectionSection';
import styles from './Sidebar.module.css';
import { SlidersHorizontal } from 'lucide-react';

export const Sidebar = ({ onGoFamily }) => {
  const { derivedState } = useEngine();
  const goalCount = derivedState?.goals?.length ?? 0;

  return (
    <aside className={styles.sidebar} aria-label="Configuration">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <SlidersHorizontal size={14} aria-hidden="true" />
          Configuration
        </h2>
        {goalCount > 0 && onGoFamily ? (
          <button
            type="button"
            className={styles.meta}
            style={{ cursor: 'pointer' }}
            title="Open the Family tab"
            onClick={onGoFamily}
          >
            {`${goalCount} goal${goalCount > 1 ? 's' : ''} →`}
          </button>
        ) : (
          <span className={styles.meta} title="Configuration sections">
            6 sections
          </span>
        )}
      </div>
      
      <div className={styles.scrollArea}>
        <div className={styles.sections}>
          <CareerSection />
          <SchemeSection />
          <SipSection />
          <InflationSection />
          <MonteCarloSection />
          <ProtectionSection />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
