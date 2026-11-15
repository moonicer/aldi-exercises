import en from '../../shared/i18n/locales/en.json';
import kk from '../../shared/i18n/locales/kk.json';
import ru from '../../shared/i18n/locales/ru.json';
import uz from '../../shared/i18n/locales/uz.json';
import type { Locale } from '../../entities/exercise';
import { useLocale } from './locale';

type Dict = typeof en.exercises;
type Section = { [K in keyof Dict]: Dict[K] extends Record<string, string> ? K : never }[keyof Dict];

/** "section.key" for every `exercises.*` string, e.g. "player.play". */
export type TKey = { [S in Section]: `${S}.${keyof Dict[S] & string}` }[Section];
export type ExercisesT = (key: TKey, vars?: Record<string, string | number>) => string;

const DICTS: Record<Locale, Dict> = {
  en: en.exercises,
  kk: kk.exercises,
  ru: ru.exercises,
  uz: uz.exercises,
};

const cache = new Map<Locale, ExercisesT>();

/**
 * Stable translate function per locale for `exercises.*` strings, with {var} substitution.
 * Values are shown as-is (kk "TODO_KK" placeholders included) so nothing is silently rewritten.
 */
export function exercisesT(locale: Locale): ExercisesT {
  let t = cache.get(locale);
  if (!t) {
    const dict = DICTS[locale];
    t = (key, vars) => {
      const [section, name] = key.split('.') as [Section, string];
      const value = (dict[section] as Record<string, string>)[name];
      return value.replace(/\{(\w+)\}/g, (m, v: string) => (vars && v in vars ? String(vars[v]) : m));
    };
    cache.set(locale, t);
  }
  return t;
}

export function useExercisesT(): ExercisesT {
  return exercisesT(useLocale());
}
