import en from '../../../shared/i18n/locales/en.json';
import kk from '../../../shared/i18n/locales/kk.json';
import ru from '../../../shared/i18n/locales/ru.json';
import uz from '../../../shared/i18n/locales/uz.json';
import type { Locale } from '../../../entities/exercise';

type PlayerStrings = typeof en.exercises.player;
export type PlayerKey = keyof PlayerStrings;

const DICTS: Record<Locale, PlayerStrings> = {
  en: en.exercises.player,
  kk: kk.exercises.player,
  ru: ru.exercises.player,
  uz: uz.exercises.player,
};

/**
 * Minimal lookup for the player's `exercises.player.*` strings with {var} substitution.
 * Values are shown as-is (kk "TODO_KK" placeholders included) so nothing is silently rewritten.
 */
export type PlayerT = (key: PlayerKey, vars?: Record<string, string | number>) => string;

const cache = new Map<Locale, PlayerT>();

/** Returns a stable translate function per locale (safe to pass to memoized components). */
export function playerT(locale: Locale): PlayerT {
  let t = cache.get(locale);
  if (!t) {
    const dict = DICTS[locale];
    t = (key, vars) =>
      dict[key].replace(/\{(\w+)\}/g, (m, name: string) => (vars && name in vars ? String(vars[name]) : m));
    cache.set(locale, t);
  }
  return t;
}
