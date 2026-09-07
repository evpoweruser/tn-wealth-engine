import React from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, ReferenceLine, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useEngine } from '../../context/EngineContext';
import { fmtLakh } from '../../utils/format';
import styles from './WealthChart.module.css';

const shortGoalLabel = (g) => {
  const cn = g.childName.replace('Child ', 'C');
  const label = `${cn} · ${g.label}`;
  return label.length > 18 ? `${label.slice(0, 17)}…` : label;
};

const CustomTooltip = ({ active, payload, goals }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const yearGoals = (goals || []).filter(g => g.year === data.yr);

    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>Year {data.yr} · Age {data.age}</p>
        <p className={styles.tooltipRow}>
          <span>{data.phase === 'acc' ? 'Accumulation' : 'Drawdown'}</span>
        </p>
        <p className={styles.tooltipRow}><span>Total wealth</span><b>₹{data.tot.toFixed(2)} Cr</b></p>
        <p className={styles.tooltipRow}><span>Liquid portfolio</span><b>₹{data.liquid.toFixed(2)} Cr</b></p>
        {data.stressTot != null && (
          <p className={styles.tooltipRow}><span>Stress path</span><b>₹{data.stressTot.toFixed(2)} Cr</b></p>
        )}
        {data.whatIfTot != null && (
          <p className={styles.tooltipRow}><span>What-if path</span><b>₹{data.whatIfTot.toFixed(2)} Cr</b></p>
        )}

        {yearGoals.length > 0 && (
          <div className={styles.goalTag}>
            {yearGoals.map((g, idx) => (
              <div key={idx}>
                <b>{g.childName}</b> {g.label}: {fmtLakh(g.grossFV)} ({g.fund === 'corpus' ? 'Corpus' : 'SIP'})
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const WealthChart = ({ results, isLoading, stressOverlay, whatIfOverlay }) => {
  const { state, derivedState } = useEngine();

  if (isLoading || !results || !results.mid) {
    return <div className={styles.card}><div className={styles.loading}>Simulating portfolio paths...</div></div>;
  }

  // Merge deterministic overlay trajectories (regime + what-if) by year.
  const stressByYear = {};
  if (stressOverlay?.series) {
    stressOverlay.series.forEach((p) => { stressByYear[p.yr] = p.stressTot; });
  }
  const whatIfByYear = {};
  if (whatIfOverlay?.series) {
    whatIfOverlay.series.forEach((p) => { whatIfByYear[p.yr] = p.whatIfTot; });
  }

  const chartData = results.mid.records.map((m, i) => ({
    yr: m.yr,
    age: m.age,
    phase: m.phase,
    tot: m.tot,
    liquid: m.liquid,
    real: m.real,
    totLow: results.low?.records?.[i]?.tot ?? m.tot,
    totHigh: results.high?.records?.[i]?.tot ?? m.tot,
    ...(stressOverlay ? { stressTot: stressByYear[m.yr] ?? null } : {}),
    ...(whatIfOverlay ? { whatIfTot: whatIfByYear[m.yr] ?? null } : {}),
  }));

  const retireYear = chartData.find(d => d.phase === 'draw')?.yr;
  const goals = derivedState?.goals || [];

  return (
    <div className={styles.card} data-pdf="wealth-chart">
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>Accumulation & Drawdown Horizon</h3>
          <p className={styles.subtitle}>Median path{state.mcOn ? ' with P10–P90 confidence band' : ''} · ₹ Cr</p>
        </div>
        <div className={styles.legendBadges}>
          <span className={styles.badgeItem}>
            <span className={styles.dot} style={{ background: 'var(--accent-green)' }}></span> Total
          </span>
          <span className={styles.badgeItem}>
            <span className={styles.dot} style={{ background: 'var(--accent-green)', opacity: 0.45 }}></span> Liquid
          </span>
          {state.mcOn && (
            <span className={styles.badgeItem}>
              <span className={styles.dot} style={{ background: 'var(--accent-amber)' }}></span> P10–P90
            </span>
          )}
          <span className={styles.badgeItem}>
            <span className={styles.dot} style={{ background: 'var(--accent-purple)' }}></span> Retirement
          </span>
          {stressOverlay && (
            <span className={styles.badgeItem}>
              <span className={styles.dot} style={{ background: 'var(--accent-red)' }}></span> Stress: {stressOverlay.id}
            </span>
          )}
          {whatIfOverlay && (
            <span className={styles.badgeItem}>
              <span className={styles.dot} style={{ background: 'var(--accent-amber, #f59e0b)' }}></span> What-if: {whatIfOverlay.label}
            </span>
          )}
          {goals.length > 0 && (
            <span className={styles.badgeItem}>
              <span className={styles.dot} style={{ background: 'var(--accent-amber)' }}></span> Milestones
            </span>
          )}
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 25, right: 16, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="mcBandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35}/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04}/>
              </linearGradient>
              <linearGradient id="liquidAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.28}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02}/>
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="yr" stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} minTickGap={36} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} tickFormatter={(val) => `₹${Number(val).toFixed(1)}Cr`} width={64} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip goals={goals} />} cursor={{ stroke: 'var(--border-hover)', strokeWidth: 1 }} />

            {state.mcOn && (
              <>
                <Area type="monotone" dataKey="totHigh" stroke="none" fill="url(#mcBandGradient)" />
                <Area type="monotone" dataKey="totLow" stroke="none" fill="var(--bg-card-solid)" fillOpacity={1} />
              </>
            )}

            <Area type="monotone" dataKey="liquid" stroke="none" fill="url(#liquidAreaGradient)" />
            <Line type="monotone" dataKey="tot" stroke="var(--accent-green)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            {stressOverlay && (
              <Line
                type="monotone"
                dataKey="stressTot"
                name={`Stress: ${stressOverlay.id}`}
                stroke="var(--accent-red)"
                strokeWidth={1.75}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            )}
            {whatIfOverlay && (
              <Line
                type="monotone"
                dataKey="whatIfTot"
                name={`What-if: ${whatIfOverlay.label}`}
                stroke="var(--accent-amber, #f59e0b)"
                strokeWidth={1.75}
                strokeDasharray="2 3"
                dot={false}
                connectNulls
              />
            )}

            {retireYear && (
              <ReferenceLine
                x={retireYear}
                stroke="var(--accent-purple)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Retire',
                  position: 'top',
                  fill: 'var(--accent-purple)',
                  fontSize: 11,
                  fontWeight: 700,
                  dy: -5
                }}
              />
            )}

            {goals.map((g, idx) => (
              <ReferenceLine
                key={`goal-${idx}`}
                x={g.year}
                stroke={g.fund === 'corpus' ? 'var(--accent-red)' : 'var(--accent-amber)'}
                strokeDasharray="3 3"
                strokeWidth={1.25}
                label={{
                  value: shortGoalLabel(g),
                  position: idx % 2 === 0 ? 'top' : 'insideTop',
                  fill: g.fund === 'corpus' ? 'var(--accent-red)' : 'var(--accent-amber)',
                  fontSize: 10,
                  fontWeight: 600,
                  dy: idx % 2 === 0 ? -5 : 14
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {state.mcOn && <p className={styles.mcNote}>Median path with P10–P90 Monte Carlo confidence band</p>}
    </div>
  );
};

export default WealthChart;
