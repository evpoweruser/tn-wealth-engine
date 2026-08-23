import React from 'react';
import { CareerSection } from './CareerSection';
import { SchemeSection } from './SchemeSection';
import { SipSection } from './SipSection';
import { InflationSection } from './InflationSection';
import { MonteCarloSection } from './MonteCarloSection';
import { ChildrenSection } from './ChildrenSection';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Configuration</h2>
        <div className={styles.actions}>
          {/* Export buttons placeholder */}
          <button className={styles.exportBtn} title="Export Settings">↓</button>
          <button className={styles.exportBtn} title="Import Settings">↑</button>
        </div>
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
