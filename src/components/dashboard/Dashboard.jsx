import React from 'react';
import KpiGrid from './KpiGrid';
import WealthChart from './WealthChart';
import FeasibilityChart from './FeasibilityChart';
import GoalsTable from './GoalsTable';
import ComparePanel from './ComparePanel';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  return (
    <div className={styles.container}>
      <ComparePanel />
      <KpiGrid />
      <WealthChart />
      <div className={styles.row}>
        <FeasibilityChart />
        <GoalsTable />
      </div>
    </div>
  );
};

export default Dashboard;
