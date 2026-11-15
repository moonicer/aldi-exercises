import data from './exercises.json';
import type { Exercise, ExerciseId } from './types';

export type * from './types';

// JSON imports widen string unions (e.g. phase becomes `string`); the shape is
// checked at build time by generating the file, so a cast is enough here.
export const exercises = data as Exercise[];

export function getExercise(id: ExerciseId): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}
