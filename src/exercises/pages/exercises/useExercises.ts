import { useCallback, useEffect, useState } from 'react';
import { getExercises, type Locale, type LocalizedExercise } from '../../../entities/exercise';

type Result = { key: string; items: LocalizedExercise[] | null };

/** Loads the exercise list for `locale` through entities/exercise/api.ts. */
export function useExercises(locale: Locale) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${locale}#${attempt}`;

  useEffect(() => {
    const ac = new AbortController();
    getExercises(locale, { signal: ac.signal }).then(
      (res) => !ac.signal.aborted && setResult({ key, items: res.items }),
      () => !ac.signal.aborted && setResult({ key, items: null }),
    );
    return () => ac.abort();
  }, [locale, key]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  // A result for a previous locale/attempt counts as still loading.
  const current = result?.key === key ? result : null;
  const status: 'loading' | 'error' | 'ready' = !current ? 'loading' : current.items ? 'ready' : 'error';
  return { status, items: current?.items ?? [], retry };
}

/** "1:20" — language-neutral, so no unit words need translating. */
export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
