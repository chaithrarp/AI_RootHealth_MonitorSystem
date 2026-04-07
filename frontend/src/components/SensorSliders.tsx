import { motion } from 'framer-motion'
import type { SensorInput } from '../types'

// ─── Slider config ────────────────────────────────────────────────────────────
const SLIDERS: {
  key:   keyof SensorInput
  label: string
  unit:  string
  min:   number
  max:   number
  step:  number
}[] = [
  { key: 'ph',                     label: 'pH',                      unit: '',      min: 0,  max: 14,   step: 0.1  },
  { key: 'temperature',            label: 'Temperature',             unit: '°C',    min: 0,  max: 40,   step: 0.1  },
  { key: 'dissolved_oxygen',       label: 'Dissolved Oxygen',        unit: 'mg/L',  min: 0,  max: 20,   step: 0.1  },
  { key: 'electrical_conductivity',label: 'Electrical Conductivity', unit: 'mS/cm', min: 0,  max: 5,    step: 0.01 },
  { key: 'turbidity',              label: 'Turbidity',               unit: 'NTU',   min: 0,  max: 1000, step: 1    },
]

// ─── Default sensor values ────────────────────────────────────────────────────
export const DEFAULT_SENSORS: SensorInput = {
  ph:                      6.5,
  temperature:             22,
  dissolved_oxygen:        8,
  electrical_conductivity: 1.5,
  turbidity:               50,
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SensorSlidersProps {
  values:   SensorInput
  onChange: (updated: SensorInput) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export const SensorSliders = ({ values, onChange }: SensorSlidersProps) => {
  const handleChange = (key: keyof SensorInput, value: number) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {SLIDERS.map((slider, i) => {
        const percent =
          ((values[slider.key] - slider.min) / (slider.max - slider.min)) * 100

        return (
          <motion.div
            key={slider.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col gap-2"
          >
            {/* ── Label + Value ── */}
            <div className="flex justify-between items-center">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#E8E0D0', opacity: 0.6 }}
              >
                {slider.label}
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: '#4ADE80' }}
              >
                {values[slider.key].toFixed(slider.step < 1 ? 2 : 0)} {slider.unit}
              </span>
            </div>

            {/* ── Slider track ── */}
            <div className="relative h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {/* fill */}
              <div
                className="absolute left-0 top-0 h-1 rounded-full transition-all duration-150"
                style={{ width: `${percent}%`, background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }}
              />
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={values[slider.key]}
                onChange={(e) => handleChange(slider.key, parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-4 -top-1.5"
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}