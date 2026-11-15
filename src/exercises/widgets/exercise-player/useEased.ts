import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Smoothing rate (1/s). ~1.7 s to reach 95% of a new target: slow and calm.
const EASE_RATE = 1.8;
const SETTLE_EPS = 0.0005;

/**
 * Eases a value toward `target` inside an on-demand (frameloop="demand") Canvas.
 * Calls `apply` with the eased value only while it is moving, then lets the loop sleep.
 * While `paused`, the value freezes where it is.
 * Returns a ref holding the current eased value (starts at the first `target`).
 */
export function useEased(target: number, apply: (value: number) => void, paused = false) {
  const invalidate = useThree((s) => s.invalidate);
  const current = useRef(target);

  // New target or resumed: wake the render loop.
  useEffect(() => invalidate(), [target, paused, invalidate]);

  useFrame((_, delta) => {
    if (paused) return; // freeze mid-motion; resumes from the same value
    const diff = target - current.current;
    if (Math.abs(diff) < SETTLE_EPS) return;
    const dt = Math.min(delta, 0.1); // avoid jumps after a background tab
    current.current += diff * (1 - Math.exp(-EASE_RATE * dt));
    if (Math.abs(target - current.current) < SETTLE_EPS) current.current = target;
    apply(current.current);
    invalidate();
  });

  return current;
}
