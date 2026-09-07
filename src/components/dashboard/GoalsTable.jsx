import React from 'react';
import { useEngine } from '../../context/EngineContext';
import { Badge, InfoButton } from '../shared';
import { fmt } from '../../utils/format';
import styles from './GoalsTable.module.css';

const GoalsTable = () => {
  const { derivedState } = useEngine();
  const goals = derivedState.goals || [];

  if (goals.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Milestone Goals <InfoButton id="goals-table" /></h3>
        <p className={styles.empty}>No child goals configured.</p>
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
              <th>Target</th>
              <th>Gross</th>
              <th>Fund</th>
              <th>SIP</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g, i) => (
              <tr key={i}>
                <td><b>{g.childName}</b> {g.label}</td>
                <td>{g.year}</td>
                <td>{fmt(g.baseCost)}</td>
                <td><b>{fmt(g.grossFV)}</b></td>
                <td>
                  <Badge variant={g.fund === 'corpus' ? 'danger' : 'success'}>
                    {g.fund}
                  </Badge>
                </td>
                <td>{g.fund === 'sip' ? `${fmt(g.sipRequired)}/mo` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GoalsTable;
