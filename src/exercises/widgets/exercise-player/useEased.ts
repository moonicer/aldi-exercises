import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Smoothing rate (1/s). ~1.7 s to reach 95% of a new target: slow and calm.
const EASE_RATE = 1.8;
const SETTLE_EPS = 0.0005;

/**
 * Eases a value toward `target` inside an on-demand (frameloop="demand") Canvas.
 * Calls `apply` with the eased value only while it is moving, then lets the loop sleep.
 * Returns a ref holding the current eased value (starts at the first `target`).
 */
export function useEased(target: number, apply: (value: number) => void) {
  const invalidate = useThree((s) => s.invalidate);
  const current = useRef(target);

  // New target: wake the render loop.
  useEffect(() => invalidate(), [target, invalidate]);

  useFrame((_, delta) => {
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
