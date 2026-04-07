import { useEffect, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'

// ─── Particle Config ──────────────────────────────────────────────────────────
const OPTIONS: ISourceOptions = {
  fpsLimit: 60,
  particles: {
    number:   { value: 60, density: { enable: true } },
    color:    { value: '#4ADE80' },
    opacity:  { value: { min: 0.05, max: 0.3 } },
    size:     { value: { min: 1, max: 3 } },
    move: {
      enable:    true,
      speed:     0.4,
      direction: 'top',
      outModes:  { default: 'out' },
    },
    links: {
      enable:   true,
      color:    '#4ADE80',
      opacity:  0.06,
      distance: 120,
    },
  },
  detectRetina: true,
}

// ─── Component ────────────────────────────────────────────────────────────────
export const ParticleBackground = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <Particles
      id="root-particles"
      options={OPTIONS}
      className="absolute inset-0 z-0"
    />
  )
}