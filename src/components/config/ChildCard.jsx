import React from 'react';
import { useEngine } from '../../context/EngineContext';
import styles from './ChildCard.module.css';

export const ChildCard = ({ child }) => {
  const { dispatch } = useEngine();

  const handleUpdate = (field) => (e) => {
    dispatch({ 
      type: 'UPDATE_CHILD', 
      id: child.id, 
      field, 
      value: e.target.type === 'number' ? Number(e.target.value) : e.target.value 
    });
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_CHILD', id: child.id });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{child.name} ({child.birth})</span>
        <button className={styles.removeBtn} onClick={handleRemove} title="Remove">×</button>
      </div>
      
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div>Milestone</div>
          <div>Age</div>
          <div>Cost (₹)</div>
          <div>Source</div>
        </div>
        
        {/* Higher Secondary */}
        <div className={styles.row}>
          <div className={styles.label}>Higher Sec</div>
          <input type="number" value={child.hAge ?? 15} onChange={handleUpdate('hAge')} className={styles.input} />
          <input type="number" value={child.hCost ?? 200000} onChange={handleUpdate('hCost')} className={styles.input} />
          <select value={child.hFund ?? 'sip'} onChange={handleUpdate('hFund')} className={styles.select}>
            <option value="corpus">Corpus</option>
            <option value="sip">SIP</option>
          </select>
        </div>
        
        {/* College */}
        <div className={styles.row}>
          <div className={styles.label}>College</div>
          <input type="number" value={child.cAge ?? 18} onChange={handleUpdate('cAge')} className={styles.input} />
          <input type="number" value={child.cCost ?? 2000000} onChange={handleUpdate('cCost')} className={styles.input} />
          <select value={child.cFund ?? 'corpus'} onChange={handleUpdate('cFund')} className={styles.select}>
            <option value="corpus">Corpus</option>
            <option value="sip">SIP</option>
          </select>
        </div>
        
        {/* Marriage */}
        <div className={styles.row}>
          <div className={styles.label}>Marriage</div>
          <input type="number" value={child.mAge ?? 25} onChange={handleUpdate('mAge')} className={styles.input} />
          <input type="number" value={child.mCost ?? 1000000} onChange={handleUpdate('mCost')} className={styles.input} />
          <select value={child.mFund ?? 'corpus'} onChange={handleUpdate('mFund')} className={styles.select}>
            <option value="corpus">Corpus</option>
            <option value="sip">SIP</option>
          </select>
        </div>
      </div>
    </div>
  );
};
