import { useId, useState } from 'react'
import { Hammock } from './exercises/widgets/exercise-player/Hammock'

function App() {
  const [lift, setLift] = useState(0)
  const sliderId = useId()

  return (
    <main className="app">
      <Hammock
        className="app__canvas"
        lift={lift}
        label={`Pelvic floor hammock, lift ${Math.round(lift * 100)}%`}
        fallback={<p>WebGL is not available.</p>}
      />
      <label htmlFor={sliderId}>Lift: {lift.toFixed(2)}</label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={lift}
        onChange={(e) => setLift(Number(e.target.value))}
      />
    </main>
  )
}

export default App
