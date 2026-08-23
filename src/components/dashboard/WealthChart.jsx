import React from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useEngine } from '../../context/EngineContext';
import { useSimulation } from '../../hooks';
import styles from './WealthChart.module.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>Year: {data.yr} (Age {data.age})</p>
        <p>Phase: {data.phase}</p>
        <p>Total: {data.tot.toFixed(2)} Cr</p>
        <p>Liquid: {data.liquid.toFixed(2)} Cr</p>
      </div>
    );
  }
  return null;
};

const WealthChart = () => {
  const { state } = useEngine();
  const { results, isLoading } = useSimulation();

  if (isLoading || !results) return <div className={styles.loading}>Loading Chart...</div>;

  const chartData = results.mid.records.map((m, i) => ({
    yr: m.yr,
    age: m.age,
    phase: m.phase,
    tot: m.tot,
    liquid: m.liquid,
    real: m.real,
    totLow: results.low?.records[i]?.tot || m.tot,
    totHigh: results.high?.records[i]?.tot || m.tot,
  }));

  const retireYear = chartData.find(d => d.phase === 'post-retire')?.yr;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Accumulation & Drawdown</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis dataKey="yr" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} minTickGap={30} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `₹${val}Cr`} />
            <Tooltip content={<CustomTooltip />} />
            
            <Area type="monotone" dataKey="totHigh" stroke="none" fill="var(--accent-amber)" fillOpacity={0.12} />
            <Area type="monotone" dataKey="totLow" stroke="none" fill="var(--bg-card)" fillOpacity={1} />
            
            <Area type="monotone" dataKey="liquid" stroke="none" fill="var(--accent-green)" fillOpacity={0.15} />
            <Line type="monotone" dataKey="tot" stroke="var(--accent-green)" strokeWidth={2} dot={false} />
            
            {retireYear && (
              <ReferenceLine x={retireYear} stroke="var(--accent-purple)" strokeDasharray="3 3" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {state.mcEnabled && <p className={styles.mcNote}>* Shows P10-P90 confidence band</p>}
    </div>
  );
};

export default WealthChart;
