import { useCallback, useEffect, useRef, useState } from 'react';

export type ClockStatus = 'idle' | 'running' | 'paused' | 'finished';

// UI refresh granularity (s). The clock itself is exact; this only limits re-renders.
const TICK = 0.05;

const nowSec = () => performance.now() / 1000;

/**
 * Wall-clock timeline for an exercise. Elapsed time is computed from performance.now(),
 * not by counting frames, so cues stay in sync after pause/resume, slow frames or
 * throttled tabs. Pauses automatically when the tab is hidden.
 */
export function useTimelineClock(durationSec: number) {
  const [status, setStatus] = useState<ClockStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  // Time accumulated before the current run, and when the current run started.
  const accumulated = useRef(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (status !== 'running') return;
    let raf = 0;
    let lastShown = -1;
    const tick = () => {
      const e = accumulated.current + nowSec() - startedAt.current;
      if (e >= durationSec) {
        accumulated.current = durationSec;
        setElapsed(durationSec);
        setStatus('finished');
        return;
      }
      const shown = Math.floor(e / TICK);
      if (shown !== lastShown) {
        lastShown = shown;
        setElapsed(e);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, durationSec]);

  const start = useCallback((from: number) => {
    accumulated.current = from;
    startedAt.current = nowSec();
    setElapsed(from);
    setStatus('running');
  }, []);

  const replay = useCallback(() => start(0), [start]);

  const play = useCallback(() => {
    if (status === 'running') return;
    start(status === 'finished' ? 0 : accumulated.current);
  }, [status, start]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    accumulated.current = Math.min(durationSec, accumulated.current + nowSec() - startedAt.current);
    setElapsed(accumulated.current);
    setStatus('paused');
  }, [status, durationSec]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pause]);

  return { status, elapsed, play, pause, replay };
}
