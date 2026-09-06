import React from 'react';
import { Calendar, GraduationCap, Heart, Award } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { fmtCr, fmtLakh } from '../../utils/format';
import styles from './MilestoneTimeline.module.css';

const getGoalIcon = (label) => {
  if (label.includes('Higher') || label.includes('Secondary')) return <Award size={14} />;
  if (label.includes('College')) return <GraduationCap size={14} />;
  return <Heart size={14} />;
};

const MilestoneTimeline = () => {
  const { derivedState } = useEngine();
  const goals = derivedState?.goals || [];

  if (!goals.length) return null;

  // Sort goals by target year
  const sortedGoals = [...goals].sort((a, b) => a.year - b.year);

  return (
    <div className={styles.container} data-pdf="milestone-timeline">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Calendar className={styles.icon} size={18} />
          <h3 className={styles.title}>Child Milestone Timeline</h3>
        </div>
        <span className={styles.countBadge}>{goals.length} Life Goals</span>
      </div>

      <div className={styles.timelineWrapper}>
        <div className={styles.line} />

        <div className={styles.nodesGrid}>
          {sortedGoals.map((goal, idx) => (
            <div key={idx} className={styles.nodeCard}>
              <div className={`${styles.nodePoint} ${goal.fund === 'corpus' ? styles.corpusPoint : styles.sipPoint}`}>
                {getGoalIcon(goal.label)}
              </div>
              <div className={styles.nodeYear}>{goal.year}</div>
              <div className={styles.nodeContent}>
                <div className={styles.childName}>{goal.childName}</div>
                <div className={styles.label}>{goal.label}</div>
                <div className={styles.costVal}>{fmtLakh(goal.grossFV)}</div>
                <span className={`${styles.fundBadge} ${goal.fund === 'corpus' ? styles.corpusBadge : styles.sipBadge}`}>
                  {goal.fund === 'corpus' ? 'Corpus Funded' : 'SIP Funded'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MilestoneTimeline;
