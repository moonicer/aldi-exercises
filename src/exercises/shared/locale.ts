import { createContext, useContext } from 'react';
import type { Locale } from '../../entities/exercise';

/*
 * PROVISIONAL stand-in for the app's shared i18n language setting, which isn't in this
 * repo yet. Exercise screens read the language only through useLocale(), so switching
 * to the real setting is a one-line change here.
 */
export const LocaleContext = createContext<Locale>('kk');

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
