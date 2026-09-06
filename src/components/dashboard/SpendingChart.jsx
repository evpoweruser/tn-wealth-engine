import React from 'react';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import styles from './SpendingChart.module.css';

/**
 * SpendingChart — dual-area breakdown of retirement spend over time.
 * Living (core + discretionary) vs healthcare/OOP (medical share), monthly nominal ₹.
 * Uses median-path drawdown records (expLiv/expMed recorded by runPath).
 */
const SpendingChart = ({ results, isLoading }) => {
  if (isLoading || !results?.mid?.records) {
    return <div className={styles.card}><div className={styles.loading}>Simulating spending…</div></div>;
  }

  const data = results.mid.records
    .filter((r) => r.phase === 'draw' && r.expTot != null)
    .map((r) => ({ yr: r.yr, age: r.age, liv: r.expLiv || 0, med: r.expMed || 0 }));

  if (!data.length) return null;

  const last = data[data.length - 1];
  const medShareEnd = last.liv + last.med > 0
    ? Math.round((last.med / (last.liv + last.med)) * 100)
    : 0;

  return (
    <div className={styles.card} data-pdf="spending-chart">
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>Retirement Spending Breakdown</h3>
          <p className={styles.subtitle}>
            Monthly spend, nominal ₹ · healthcare is {medShareEnd}% by age {last.age}
          </p>
        </div>
        <div className={styles.legendBadges}>
          <span className={styles.badgeItem}>
            <span className={styles.dot} style={{ background: 'var(--accent-blue)' }}></span> Living
          </span>
          <span className={styles.badgeItem}>
            <span className={styles.dot} style={{ background: 'var(--accent-red)' }}></span> Healthcare
          </span>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }} stackOffset="none">
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="yr" stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} minTickGap={48} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={56} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v, name) => [`₹${Math.round(Number(v)).toLocaleString('en-IN')}/mo`, name === 'med' ? 'Healthcare' : 'Living']}
              labelFormatter={(yr) => `Year ${yr}`}
            />
            <Area type="monotone" dataKey="liv" name="liv" stackId="1" stroke="none" fill="var(--accent-blue)" fillOpacity={0.35} />
            <Area type="monotone" dataKey="med" name="med" stackId="1" stroke="none" fill="var(--accent-red)" fillOpacity={0.45} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendingChart;
