import { lazy, memo, Suspense, useState } from 'react';
import type { CuePhase, ExerciseId, LocalizedExercise } from '../../../entities/exercise';
import { useExercisesT, type ExercisesT } from '../../shared/i18n';
import { liftForPhase, progressForPhase } from './phaseLift';
import { cueIndexAt, repetitionAt } from './timeline';
import { useTimelineClock } from './useTimelineClock';
import { WebGLBoundary } from './WebGLBoundary';
import type { MannequinExercise } from './Mannequin';
import './ExercisePlayer.css';

// three.js and the scenes are only downloaded when a player actually shows a canvas.
const Hammock = lazy(() => import('./Hammock').then((m) => ({ default: m.Hammock })));
const Mannequin = lazy(() => import('./Mannequin').then((m) => ({ default: m.Mannequin })));

type T = ExercisesT;

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
      {notice && <p className="player__notice">{t('player.noWebgl')}</p>}
      <h3>{t('player.steps')}</h3>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

interface VisualProps {
  exercise: LocalizedExercise;
  phase: CuePhase | null;
  paused: boolean;
  t: T;
}

/** Memoized so the clock's frequent re-renders don't touch the canvas unless the phase changes. */
const Visual = memo(function Visual({ exercise, phase, paused, t }: VisualProps) {
  const fallback = <Steps steps={exercise.steps} t={t} notice />;
  if (exercise.visual === 'mannequin' && isMannequinExercise(exercise.id)) {
    return (
      <Mannequin
        className="player__canvas"
        exercise={exercise.id}
        progress={phase ? progressForPhase(phase) : 0}
        paused={paused}
        label={t('player.visualMannequin')}
        fallback={fallback}
      />
    );
  }
  return (
    <Hammock
      className="player__canvas"
      lift={phase ? liftForPhase(phase) : 0}
      paused={paused}
      label={t('player.visualHammock')}
      fallback={fallback}
    />
  );
});

function Header({ title, t }: { title: string; t: T }) {
  return (
    <header className="player__header">
      <h2>{title}</h2>
      <span className="player__badge">{t('common.sourceBadge')}</span>
    </header>
  );
}

function PlayerBody({ exercise }: { exercise: LocalizedExercise }) {
  const t = useExercisesT();
  const [webgl] = useState(detectWebGL);
  const clock = useTimelineClock(exercise.durationSec);

  const { cues, steps } = exercise;
  const index = cueIndexAt(cues, clock.elapsed);
  const cue = cues[index];
  const rep = repetitionAt(cues, index);
  const active = clock.status === 'running' || clock.status === 'paused';
  const percent = Math.round((clock.elapsed / exercise.durationSec) * 100);

  // Before start the first instruction is shown so the user knows what's coming.
  const cueText = clock.status === 'finished' ? t('player.finished') : (cue?.text ?? '');
  const mainLabel =
    clock.status === 'running' ? t('player.pause') : clock.status === 'paused' ? t('player.resume') : t('player.play');
  const textSteps = <Steps steps={steps} t={t} notice />;

  return (
    <section className="player">
      <Header title={exercise.title} t={t} />

      <div className="player__stage">
        {webgl ? (
          <WebGLBoundary fallback={textSteps}>
            <Suspense fallback={<div className="player__loading">{t('player.loading')}</div>}>
              <Visual
                exercise={exercise}
                phase={active ? (cue?.phase ?? null) : null}
                paused={clock.status === 'paused'}
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
          aria-label={t('player.progress')}
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
          <span className="visually-hidden">{t('player.repetition', rep)}</span>
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
          {t('player.replay')}
        </button>
      </div>
    </section>
  );
}

function LockedBody({ exercise }: { exercise: LocalizedExercise }) {
  const t = useExercisesT();
  return (
    <section className="player player--locked">
      <Header title={exercise.title} t={t} />
      <div className="player__locked">
        <p className="player__locked-label">
          <span aria-hidden="true">🔒 </span>
          {t('common.locked')}
        </p>
        {exercise.unlockNote && <p>{exercise.unlockNote}</p>}
      </div>
    </section>
  );
}

export interface ExercisePlayerProps {
  /** Already localized (from the API); the UI language comes from useLocale(). */
  exercise: LocalizedExercise;
}

export function ExercisePlayer({ exercise }: ExercisePlayerProps) {
  if (exercise.locked) return <LockedBody exercise={exercise} />;
  // key: a new exercise starts with a fresh clock and a fresh error boundary.
  return <PlayerBody key={exercise.id} exercise={exercise} />;
}
