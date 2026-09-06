import React, { useEffect, useState } from 'react';
import styles from './PdfOverlay.module.css';

const PdfOverlay = ({ visible, message }) => {
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <div className={`${styles.overlay} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <div className={styles.spinner}>
          <svg className={styles.circular} viewBox="25 25 50 50">
            <circle 
              className={styles.path} 
              cx="50" cy="50" r="20" 
              fill="none" 
              strokeWidth="4" 
              strokeMiterlimit="10" 
            />
          </svg>
        </div>
        <div className={styles.text}>{message || 'Generating PDF...'}</div>
      </div>
    </div>
  );
};

export default PdfOverlay;
