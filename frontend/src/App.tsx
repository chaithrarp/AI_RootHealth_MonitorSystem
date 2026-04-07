import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lenis from 'lenis'
import { Navbar } from './components/Navbar'
import { Hero }      from './pages/Hero'
import { Dashboard } from './pages/Dashboard'
import { Predict }   from './pages/Predict'
import { History }   from './pages/History'

// ─── Component ────────────────────────────────────────────────────────────────
const App = () => {
  // ── Lenis smooth scroll ──
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })

    const raf = (time: number) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => lenis.destroy()
  }, [])

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Hero />}      />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predict"   element={<Predict />}   />
        <Route path="/history"   element={<History />}   />
      </Routes>
    </BrowserRouter>
  )
}

export default App