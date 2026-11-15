import { useState } from 'react'
import type { Locale } from './entities/exercise'
import { LocaleContext } from './exercises/shared/locale'
import { ExercisesPage } from './exercises/pages/exercises/ExercisesPage'

// Native language names, so each option is readable by its own speakers.
const LANGUAGES: { value: Locale; name: string }[] = [
  { value: 'kk', name: 'Қазақша' },
  { value: 'ru', name: 'Русский' },
  { value: 'uz', name: 'Oʻzbekcha' },
  { value: 'en', name: 'English' },
]

function App() {
  // Temporary shell: stands in for the app's shared language setting.
  const [locale, setLocale] = useState<Locale>('kk')

  return (
    <LocaleContext value={locale}>
      <header className="app-bar">
        <select
          aria-label="Language"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value} lang={l.value}>
              {l.name}
            </option>
          ))}
        </select>
      </header>
      <ExercisesPage />
    </LocaleContext>
  )
}

export default App
