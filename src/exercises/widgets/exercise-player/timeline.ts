import type { Cue } from '../../../entities/exercise';

/** Index of the cue active at `t` seconds (last cue with atSec <= t). Cues are sorted. */
export function cueIndexAt(cues: Cue[], t: number): number {
  let index = 0;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].atSec <= t) index = i;
    else break;
  }
  return index;
}

/**
 * Repetition number for the cue at `index`. A repetition starts at each cue whose
 * phase matches the first cue's phase (e.g. every "inhale").
 */
export function repetitionAt(cues: Cue[], index: number): { current: number; total: number } {
  if (cues.length === 0) return { current: 0, total: 0 };
  const startPhase = cues[0].phase;
  let current = 0;
  let total = 0;
  cues.forEach((c, i) => {
    if (c.phase !== startPhase) return;
    total++;
    if (i <= index) current++;
  });
  return { current: Math.max(1, current), total };
}
