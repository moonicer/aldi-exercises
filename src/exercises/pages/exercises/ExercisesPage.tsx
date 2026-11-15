import { useState } from 'react';
import type { ExerciseId } from '../../../entities/exercise';
import { ExerciseDetailPage } from './ExerciseDetailPage';
import { ExercisesCatalogPage } from './ExercisesCatalogPage';

/*
 * Catalog ↔ detail switch kept in component state, because this repo has no router
 * (and CLAUDE.md says not to add one). For the app's router, mount
 * ExercisesCatalogPage at /exercises and ExerciseDetailPage at /exercises/:id instead.
 */
export function ExercisesPage() {
  const [openId, setOpenId] = useState<ExerciseId | null>(null);
  const [lastOpened, setLastOpened] = useState<ExerciseId | null>(null);

  const open = (id: ExerciseId) => {
    setLastOpened(id);
    setOpenId(id);
    window.scrollTo(0, 0);
  };

  return openId ? (
    <ExerciseDetailPage exerciseId={openId} onBack={() => setOpenId(null)} />
  ) : (
    <ExercisesCatalogPage onOpen={open} focusId={lastOpened} />
  );
}
