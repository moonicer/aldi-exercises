import { lazy, memo, Suspense, useState } from 'react';
import { getExercise, type CuePhase, type Exercise, type ExerciseId, type Locale } from '../../../entities/exercise';
import { playerT, type PlayerT } from './i18n';
import { liftForPhase, progressForPhase } from './phaseLift';
import { cueIndexAt, repetitionAt } from './timeline';
import { useTimelineClock } from './useTimelineClock';
import { WebGLBoundary } from './WebGLBoundary';
import type { MannequinExercise } from './Mannequin';
import './ExercisePlayer.css';

// three.js and the scenes are only downloaded when a player actually shows a canvas.
const Hammock = lazy(() => import('./Hammock').then((m) => ({ default: m.Hammock })));
const Mannequin = lazy(() => import('./Mannequin').then((m) => ({ default: m.Mannequin })));

type T = PlayerT;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function isMannequinExercise(id: ExerciseId): id is MannequinExercise {
  return id === 'pelvic-tilt' || id === 'bridge';
}

function Steps({ steps, t, notice }: { steps: string[]; t: T; notice?: boolean }) {
  return (
    <div className="player__steps">
      {notice && <p className="player__notice">{t('noWebgl')}</p>}
      <h3>{t('steps')}</h3>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

interface VisualProps {
  exercise: Exercise;
  phase: CuePhase | null;
  paused: boolean;
  /** Stable reference (from the JSON), used for the no-WebGL canvas fallback. */
  steps: string[];
  t: T;
}

/** Memoized so the clock's frequent re-renders don't touch the canvas unless the phase changes. */
const Visual = memo(function Visual({ exercise, phase, paused, steps, t }: VisualProps) {
  const fallback = <Steps steps={steps} t={t} notice />;
  if (exercise.visual === 'mannequin' && isMannequinExercise(exercise.id)) {
    return (
      <Mannequin
        className="player__canvas"
        exercise={exercise.id}
        progress={phase ? progressForPhase(phase) : 0}
        paused={paused}
        label={t('visualMannequin')}
        fallback={fallback}
      />
    );
  }
  return (
    <Hammock
      className="player__canvas"
      lift={phase ? liftForPhase(phase) : 0}
      paused={paused}
      label={t('visualHammock')}
      fallback={fallback}
    />
  );
});

function Header({ exercise, title, t }: { exercise: Exercise; title: string; t: T }) {
  return (
    <header className="player__header">
      <h2>{title}</h2>
      <span className="player__badge">{t('sourceBadge')}</span>
      {/* Until specialists review the content. Moves to the catalog page once it exists. */}
      {!exercise.reviewed && <p className="player__review-note">{t('reviewPlanned')}</p>}
    </header>
  );
}

function PlayerBody({ exercise, locale }: { exercise: Exercise; locale: Locale }) {
  const t = playerT(locale);
  const content = exercise.content[locale];
  const [webgl] = useState(detectWebGL);
  const clock = useTimelineClock(exercise.durationSec);

  const { cues, steps } = content;
  const index = cueIndexAt(cues, clock.elapsed);
  const cue = cues[index];
  const rep = repetitionAt(cues, index);
  const active = clock.status === 'running' || clock.status === 'paused';
  const percent = Math.round((clock.elapsed / exercise.durationSec) * 100);

  // Before start the first instruction is shown so the user knows what's coming.
  const cueText = clock.status === 'finished' ? t('finished') : (cue?.text ?? '');
  const mainLabel =
    clock.status === 'running' ? t('pause') : clock.status === 'paused' ? t('resume') : t('play');
  const textSteps = <Steps steps={steps} t={t} notice />;

  return (
    <section className="player">
      <Header exercise={exercise} title={content.title} t={t} />

      <div className="player__stage">
        {webgl ? (
          <WebGLBoundary fallback={textSteps}>
            <Suspense fallback={<div className="player__loading">{t('loading')}</div>}>
              <Visual
                exercise={exercise}
                phase={active ? (cue?.phase ?? null) : null}
                paused={clock.status === 'paused'}
                steps={steps}
                t={t}
              />
            </Suspense>
          </WebGLBoundary>
        ) : (
          textSteps
        )}
      </div>

      <p className="player__cue" aria-live="polite" aria-atomic="true">
        {cueText}
      </p>

      <div className="player__meta">
        <div
          className="player__progress"
          role="progressbar"
          aria-label={t('progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="player__progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="player__rep">
          <span aria-hidden="true">
            {rep.current} / {rep.total}
          </span>
          <span className="visually-hidden">{t('repetition', rep)}</span>
        </p>
      </div>

      <div className="player__controls">
        <button
          type="button"
          className="player__button player__button--primary"
          onClick={clock.status === 'running' ? clock.pause : clock.play}
        >
          {mainLabel}
        </button>
        <button type="button" className="player__button" onClick={clock.replay}>
          {t('replay')}
        </button>
      </div>

    </section>
  );
}

function LockedBody({ exercise, locale }: { exercise: Exercise; locale: Locale }) {
  const t = playerT(locale);
  const content = exercise.content[locale];
  return (
    <section className="player player--locked">
      <Header exercise={exercise} title={content.title} t={t} />
      <div className="player__locked">
        <p className="player__locked-label">
          <span aria-hidden="true">🔒 </span>
          {t('locked')}
        </p>
        {content.unlockNote && <p>{content.unlockNote}</p>}
      </div>
    </section>
  );
}

export interface ExercisePlayerProps {
  exerciseId: ExerciseId;
  locale: Locale;
}

export function ExercisePlayer({ exerciseId, locale }: ExercisePlayerProps) {
  const exercise = getExercise(exerciseId);
  if (!exercise) {
    return <p role="alert">{playerT(locale)('notFound')}</p>;
  }
  if (exercise.locked) {
    return <LockedBody exercise={exercise} locale={locale} />;
  }
  // key: a new exercise starts with a fresh clock and a fresh error boundary.
  return <PlayerBody key={exercise.id} exercise={exercise} locale={locale} />;
}
