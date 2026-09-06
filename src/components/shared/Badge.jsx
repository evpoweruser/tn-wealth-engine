import React from 'react';
import styles from './Badge.module.css';

const Badge = ({ variant = 'default', text, children }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children || text}
    </span>
  );
};

export default Badge;
