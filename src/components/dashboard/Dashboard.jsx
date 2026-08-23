import React from 'react';
import KpiGrid from './KpiGrid';
import WealthChart from './WealthChart';
import FeasibilityChart from './FeasibilityChart';
import GoalsTable from './GoalsTable';
import ComparePanel from './ComparePanel';
import styles from './Dashboard.module.css';

const Dashboard = ({ results, isLoading }) => {
  return (
    <div className={styles.container}>
      <ComparePanel results={results} isLoading={isLoading} />
      <KpiGrid results={results} isLoading={isLoading} />
      <WealthChart results={results} isLoading={isLoading} />
      <div className={styles.row}>
        <FeasibilityChart results={results} isLoading={isLoading} />
        <GoalsTable />
      </div>
    </div>
  );
};

export default Dashboard;
