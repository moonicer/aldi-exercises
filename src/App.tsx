import { ExercisePlayer } from './exercises/widgets/exercise-player/ExercisePlayer'

function App() {
  return (
    <main className="app">
      {/* TODO: remove `debug` once timing is verified. */}
      <ExercisePlayer exerciseId="pf-slow" locale="kk" debug />
    </main>
  )
}

export default App
