import type { CuePhase } from '../../../entities/exercise/types';

/** Target hammock lift (0 = relaxed sag, 1 = fully lifted) for each breathing phase. */
const LIFT_BY_PHASE: Record<CuePhase, number> = {
  inhale: 0.1,
  squeeze: 1,
  hold: 1,
  release: 0,
  rest: 0,
};

export function liftForPhase(phase: CuePhase): number {
  return LIFT_BY_PHASE[phase];
}

/** Target mannequin pose progress (0 = rest pose, 1 = full pose) for each phase. */
const PROGRESS_BY_PHASE: Record<CuePhase, number> = {
  inhale: 0,
  squeeze: 1,
  hold: 1,
  release: 0,
  rest: 0,
};

export function progressForPhase(phase: CuePhase): number {
  return PROGRESS_BY_PHASE[phase];
}
