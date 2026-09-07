import React, { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { PANEL_INFO } from '../../content/panelInfo';
import styles from './PanelInfoModal.module.css';

const SECTIONS = [
  ['assumptions', 'Assumptions'],
  ['says', 'What it says'],
  ['doesntSay', 'What it doesn’t say'],
  ['howToRead', 'How to read it'],
];

/**
 * InfoButton — ⓘ explainer trigger for dashboard panels.
 * Owns its modal state locally; content comes from PANEL_INFO.
 */
export const InfoButton = ({ id, label }) => {
  const [open, setOpen] = useState(false);
  const info = PANEL_INFO[id];

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open ]);

  if (!info) return null;

  return (
    <>
      <button
        type="button"
        className={styles.infoBtn}
        onClick={() => setOpen(true)}
        title={`About this panel: ${info.title}`}
        aria-label={label || `About: ${info.title}`}
      >
        <Info size={14} />
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={info.title}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>ⓘ {info.title}</h2>
              <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.content}>
              {SECTIONS.map(([key, heading]) => (
                <section key={key} className={styles.section}>
                  <h3>{heading}</h3>
                  {key === 'howToRead' ? (
                    <p>{info[key]}</p>
                  ) : (
                    <ul>
                      {info[key].map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoButton;
