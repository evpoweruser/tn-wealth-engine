import React from 'react';
import { ResponsiveContainer, BarChart, Bar, ReferenceLine, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useEngine } from '../../context/EngineContext';
import styles from './FeasibilityChart.module.css';

const inrShort = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${Math.round(v / 1000)}k`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const base = payload[0]?.value || 0;
    const ded = payload[1]?.value || 0;
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>Year {label}</p>
        <p className={styles.tooltipRow}><span>Base SIP</span><b>₹{Math.round(base).toLocaleString('en-IN')}</b></p>
        <p className={styles.tooltipRow}><span>Dedicated SIP</span><b>₹{Math.round(ded).toLocaleString('en-IN')}</b></p>
        <p className={styles.tooltipRow}><span>Total</span><b>₹{Math.round(base + ded).toLocaleString('en-IN')}</b></p>
      </div>
    );
  }
  return null;
};

const FeasibilityChart = ({ results, isLoading }) => {
  const { state } = useEngine();

  if (isLoading || !results || !results.feasibility) {
    return <div className={styles.card}><div className={styles.loading}>Loading feasibility...</div></div>;
  }

  const chartData = results.feasibility.years.map((yr, i) => ({
    yr,
    baseSip: results.feasibility.baseSip[i],
    dedSip: results.feasibility.dedSip[i],
  }));

  return (
    <div className={styles.card} data-pdf="feasibility-chart">
      <h3 className={styles.title}>SIP vs Surplus</h3>
      <p className={styles.subtitle}>Stacked monthly commitment vs available surplus</p>
      <div className={styles.legend}>
        <span className={styles.legendItem}><i style={{ background: 'var(--accent-blue)' }} /> Base SIP</span>
        <span className={styles.legendItem}><i style={{ background: 'var(--accent-amber)' }} /> Dedicated</span>
        <span className={styles.legendItem}><i className={styles.surplusLine} /> Surplus</span>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="yr" stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} minTickGap={24} />
            <YAxis stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} width={56} tickLine={false} axisLine={false} tickFormatter={inrShort} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
            <Bar dataKey="baseSip" stackId="a" fill="var(--accent-blue)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="dedSip" stackId="a" fill="var(--accent-amber)" radius={[3, 3, 0, 0]} />
            <ReferenceLine y={state.mSurplus} stroke="var(--accent-green)" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: 'Surplus', position: 'insideTopRight', fill: 'var(--accent-green)', fontSize: 10, fontWeight: 700 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FeasibilityChart;
