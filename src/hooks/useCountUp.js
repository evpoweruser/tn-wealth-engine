import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — eased number transition for KPI values.
 * Animates from the previous value to `target` over `duration`ms on change.
 *
 * @param {number|null} target - Numeric target; null disables animation
 * @param {number} [duration=600] - Transition length in ms
 * @returns {number|null} Current animated value (null when disabled)
 */
export function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (target == null || !Number.isFinite(target)) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current == null || !Number.isFinite(fromRef.current)
      ? target
      : fromRef.current;
    if (from === target) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (target - from) * eased;
      setValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}
