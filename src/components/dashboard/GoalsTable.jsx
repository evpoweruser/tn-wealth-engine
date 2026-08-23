import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { Badge } from '../shared';
import { fmt } from '../../utils/format';
import styles from './GoalsTable.module.css';

const GoalsTable = () => {
  const { derivedState } = useEngine();
  const goals = derivedState.goals || [];

  if (goals.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Milestone Goals</h3>
        <p className={styles.empty}>No goals configured.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Milestone Goals</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Goal</th>
              <th>Year</th>
              <th>Target Cost</th>
              <th>Gross FV</th>
              <th>Fund</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g, i) => (
              <tr key={i}>
                <td>{g.childName ? `${g.childName} - ${g.type}` : g.type}</td>
                <td>{g.year}</td>
                <td>{fmt(g.targetCost)}</td>
                <td>{fmt(g.grossFv)}</td>
                <td><Badge text="SIP" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GoalsTable;
