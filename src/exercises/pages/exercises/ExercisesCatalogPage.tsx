import { useEffect, useRef } from 'react';
import type { ExerciseId } from '../../../entities/exercise';
import { useExercisesT } from '../../shared/i18n';
import { useLocale } from '../../shared/locale';
import { formatDuration, useExercises } from './useExercises';
import './exercises-pages.css';

function LockIcon() {
  return (
    <svg className="catalog__lock" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export interface ExercisesCatalogPageProps {
  onOpen: (id: ExerciseId) => void;
  /** Card to focus on mount, e.g. the one the user just came back from. */
  focusId?: ExerciseId | null;
}

export function ExercisesCatalogPage({ onOpen, focusId }: ExercisesCatalogPageProps) {
  const t = useExercisesT();
  const { status, items, retry } = useExercises(useLocale());
  const focusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === 'ready') focusRef.current?.focus();
  }, [status]);

  return (
    <main className="exercises-page">
      <h1>{t('catalog.title')}</h1>
      {/* Shown once here instead of on every exercise, until specialists have reviewed them. */}
      {items.some((e) => !e.reviewed) && <p className="catalog__review-note">{t('common.reviewPlanned')}</p>}

      {status === 'loading' && <p role="status">{t('catalog.loading')}</p>}
      {status === 'error' && (
        <div role="alert" className="catalog__error">
          <p>{t('catalog.loadError')}</p>
          <button type="button" className="exercises-page__button" onClick={retry}>
            {t('catalog.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <ul className="catalog__list">
          {items.map((e) => (
            <li key={e.id} className={`catalog__card${e.locked ? ' catalog__card--locked' : ''}`}>
              <h2 className="catalog__title">
                {/* The button's ::after stretches over the card, so the whole card is clickable. */}
                <button
                  type="button"
                  ref={e.id === focusId ? focusRef : undefined}
                  onClick={() => onOpen(e.id)}
                >
                  {e.title}
                </button>
              </h2>
              <div className="catalog__meta">
                <span>
                  <span className="visually-hidden">{t('catalog.duration')}: </span>
                  {formatDuration(e.durationSec)}
                </span>
                <span className="catalog__badge">{t('common.sourceBadge')}</span>
                {e.locked && (
                  <span className="catalog__locked">
                    <LockIcon />
                    <span className="visually-hidden">{t('common.locked')}</span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
