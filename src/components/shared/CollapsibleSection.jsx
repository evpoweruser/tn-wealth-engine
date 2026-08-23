import React, { useState, useRef, useEffect } from 'react';
import styles from './CollapsibleSection.module.css';

const CollapsibleSection = ({ title, number, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState(defaultOpen ? 'auto' : 0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(`${contentHeight}px`);
      // Optional: After animation finishes, change to auto so it can resize
      const timer = setTimeout(() => {
        setHeight('auto');
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // If we're closing and it's 'auto', we need to set it to explicit height first for animation to work
      if (height === 'auto' && contentRef.current) {
        setHeight(`${contentRef.current.scrollHeight}px`);
        // Force reflow
        void contentRef.current.offsetHeight;
      }
      // Then set it to 0
      requestAnimationFrame(() => {
        setHeight(0);
      });
    }
  }, [isOpen]);

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`}>
      <button 
        className={styles.header} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className={styles.titleWrapper}>
          {number && <span className={styles.number}>{number}</span>}
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      <div 
        className={styles.contentWrapper}
        style={{ height: height !== 'auto' ? height : 'auto' }}
        ref={contentRef}
      >
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
