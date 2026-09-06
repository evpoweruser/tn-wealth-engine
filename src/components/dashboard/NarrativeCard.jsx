import React, { useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { generateNarrative } from '../../utils/narrative';
import styles from './NarrativeCard.module.css';

const NarrativeCard = ({ results, isLoading, stressResults, sensitivityResults }) => {
  const { state, derivedState } = useEngine();

  const sentences = useMemo(() => {
    if (isLoading || !results) return [];
    return generateNarrative({
      results,
      state,
      derivedState,
      stressResults,
      sensitivityResults,
    });
  }, [results, state, derivedState, stressResults, sensitivityResults, isLoading]);

  if (isLoading || !results) {
    return (
      <div className={styles.card} aria-busy="true">
        <div className={`${styles.header} skeleton`} style={{ height: 28, width: 200, marginBottom: 12 }} />
        <div className={`${styles.body} skeleton`} style={{ height: 60 }} />
      </div>
    );
  }

  const survivePct = results.survivePct ?? 100;
  const isHealthy = survivePct >= 90;
  const isWarning = survivePct < 60;

  return (
    <div className={styles.card} data-pdf="narrative">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Sparkles className={styles.icon} size={18} />
          <h3 className={styles.title}>Reading the Result</h3>
        </div>
        <span className={`${styles.badge} ${isHealthy ? styles.badgeSuccess : isWarning ? styles.badgeWarning : styles.badgeInfo}`}>
          {isHealthy ? (
            <>
              <CheckCircle2 size={12} style={{ marginRight: 4 }} /> High Resilience ({survivePct}%)
            </>
          ) : isWarning ? (
            <>
              <AlertTriangle size={12} style={{ marginRight: 4 }} /> High Depletion Risk ({survivePct}%)
            </>
          ) : (
            <>
              <Info size={12} style={{ marginRight: 4 }} /> Moderate Resilience ({survivePct}%)
            </>
          )}
        </span>
      </div>

      <div className={styles.content}>
        {sentences.map((sentence, idx) => (
          <p key={idx} className={styles.sentence}>
            {sentence}
          </p>
        ))}
      </div>
    </div>
  );
};

export default NarrativeCard;
