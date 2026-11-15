export type Locale = 'ru' | 'kk' | 'uz' | 'en';

export type ExerciseId = 'pf-slow' | 'pelvic-tilt' | 'bridge';

/** Procedural 3D scene used by the exercise player. */
export type ExerciseVisual = 'hammock' | 'mannequin';

export type CuePhase = 'inhale' | 'squeeze' | 'hold' | 'release' | 'rest';

/** One point on the timeline. A cue lasts until the next cue's atSec (or durationSec). */
export interface Cue {
  atSec: number;
  phase: CuePhase;
  text: string;
}

export interface ExerciseContent {
  title: string;
  description: string;
  steps: string[];
  /** Sorted by atSec. atSec/phase are identical across locales; only text differs. */
  cues: Cue[];
  /** true for ru/en/uz drafts; false for kk (written by a native speaker). */
  machineTranslated: boolean;
  /** Only for locked exercises: tells the user how to unlock it. */
  unlockNote?: string;
}

export interface Exercise {
  id: ExerciseId;
  visual: ExerciseVisual;
  locked: boolean;
  /** Always false for now: UI must show the "demo, not specialist-reviewed" badge. */
  reviewed: false;
  durationSec: number;
  content: Record<Locale, ExerciseContent>;
}
