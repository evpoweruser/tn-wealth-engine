import React, { useState } from 'react';
import { useEngine } from '../../context/EngineContext';
import { CollapsibleSection } from '../shared';
import { ChildCard } from './ChildCard';
import styles from './ChildrenSection.module.css';

export const ChildrenSection = () => {
  const { state, dispatch } = useEngine();
  const [newName, setNewName] = useState('');
  const [newBirth, setNewBirth] = useState('');

  const handleAdd = () => {
    if (newName && newBirth) {
      dispatch({ type: 'ADD_CHILD', name: newName, birth: Number(newBirth) });
      setNewName('');
      setNewBirth('');
    }
  };

  const handleClear = () => {
    dispatch({ type: 'CLEAR_CHILDREN' });
  };

  return (
    <CollapsibleSection title="Children Planning" number={6} defaultOpen={false}>
      <div className={styles.sectionContent}>
        <div className={styles.addRow}>
          <input 
            type="text" 
            placeholder="Name" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            className={styles.input}
          />
          <input 
            type="number" 
            placeholder="Birth YYYY" 
            value={newBirth} 
            onChange={(e) => setNewBirth(e.target.value)} 
            className={styles.input}
          />
        </div>
        
        <div className={styles.actionRow}>
          <button className={styles.addBtn} onClick={handleAdd}>+ Add Child</button>
          <button className={styles.clearBtn} onClick={handleClear}>Clear</button>
        </div>

        <div className={styles.childrenList}>
          {state.children.map(child => (
            <ChildCard key={child.id} child={child} />
          ))}
          {state.children.length === 0 && (
            <div className={styles.emptyState}>No children added yet.</div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
};
