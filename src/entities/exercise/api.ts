import data from './exercises.json';
import type { Exercise, ExerciseId, ExerciseListResponse, Locale, LocalizedExercise } from './types';

/*
 * PROVISIONAL: behaves like GET /api/exercises?locale=xx but reads the bundled JSON.
 * The response shape (ExerciseListResponse) is our proposal, not taken from
 * docs/API_CONTRACTS.md, which isn't available yet. When the backend is ready, replace
 * the body of getExercises with:
 *
 *   const res = await fetch(`/api/exercises?locale=${locale}`, { signal });
 *   if (!res.ok) throw new Error(`GET /api/exercises failed: ${res.status}`);
 *   return (await res.json()) as ExerciseListResponse;
 */

// JSON imports widen string unions (e.g. phase becomes `string`), so a cast is needed.
const exercises = data as Exercise[];

function localize({ content, ...rest }: Exercise, locale: Locale): LocalizedExercise {
  return { ...rest, ...content[locale] };
}

export async function getExercises(
  locale: Locale,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExerciseListResponse> {
  await Promise.resolve(); // stay async like a real request
  signal?.throwIfAborted();
  return { locale, items: exercises.map((e) => localize(e, locale)) };
}

export async function getExercise(
  id: ExerciseId,
  locale: Locale,
  options?: { signal?: AbortSignal },
): Promise<LocalizedExercise | null> {
  const { items } = await getExercises(locale, options);
  return items.find((e) => e.id === id) ?? null;
}
