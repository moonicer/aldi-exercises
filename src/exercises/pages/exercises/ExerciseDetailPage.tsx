import { useEffect, useRef } from 'react';
import type { ExerciseId } from '../../../entities/exercise';
import { useExercisesT } from '../../shared/i18n';
import { useLocale } from '../../shared/locale';
import { ExercisePlayer } from '../../widgets/exercise-player/ExercisePlayer';
import { useExercises } from './useExercises';
import './exercises-pages.css';

export interface ExerciseDetailPageProps {
  exerciseId: ExerciseId;
  onBack: () => void;
}

export function ExerciseDetailPage({ exerciseId, onBack }: ExerciseDetailPageProps) {
  const t = useExercisesT();
  const { status, items, retry } = useExercises(useLocale());
  const backRef = useRef<HTMLButtonElement>(null);
  const exercise = items.find((e) => e.id === exerciseId);

  // Keyboard and screen-reader users land at the top of the new page.
  useEffect(() => backRef.current?.focus(), []);

  return (
    <main className="exercises-page">
      <button type="button" ref={backRef} className="exercises-page__back" onClick={onBack}>
        <span aria-hidden="true">← </span>
        {t('detail.back')}
      </button>

      {status === 'loading' && <p role="status">{t('catalog.loading')}</p>}
      {status === 'error' && (
        <div role="alert" className="catalog__error">
          <p>{t('catalog.loadError')}</p>
          <button type="button" className="exercises-page__button" onClick={retry}>
            {t('catalog.retry')}
          </button>
        </div>
      )}
      {status === 'ready' && (exercise ? <ExercisePlayer exercise={exercise} /> : <p role="alert">{t('player.notFound')}</p>)}
    </main>
  );
}
