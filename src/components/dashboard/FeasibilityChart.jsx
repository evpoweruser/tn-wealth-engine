import React from 'react';
import { ResponsiveContainer, BarChart, Bar, ReferenceLine, XAxis, YAxis, Tooltip } from 'recharts';
import { useEngine } from '../../context/EngineContext';
import { useSimulation } from '../../hooks';
import styles from './FeasibilityChart.module.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p>Year: {label}</p>
        <p>Base SIP: {payload[0]?.value?.toFixed(0) || 0}</p>
        <p>Dedicated SIP: {payload[1]?.value?.toFixed(0) || 0}</p>
      </div>
    );
  }
  return null;
};

const FeasibilityChart = () => {
  const { state } = useEngine();
  const { results, isLoading } = useSimulation();

  if (isLoading || !results || !results.feasibility) return <div className={styles.loading}>Loading...</div>;

  const chartData = results.feasibility.years.map((yr, i) => ({
    yr,
    baseSip: results.feasibility.baseSip[i],
    dedSip: results.feasibility.dedSip[i],
  }));

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>SIP vs Surplus</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <XAxis dataKey="yr" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="baseSip" stackId="a" fill="var(--accent-blue)" />
            <Bar dataKey="dedSip" stackId="a" fill="var(--accent-amber)" />
            <ReferenceLine y={state.mSurplus} stroke="var(--accent-green)" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FeasibilityChart;
