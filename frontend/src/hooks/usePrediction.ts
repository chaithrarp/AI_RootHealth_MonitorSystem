import { useState } from 'react'
import { predict } from '../api/api'
import type { PredictionResponse, SensorInput } from '../types'

// ─── Hook State Shape ─────────────────────────────────────────────────────────
interface UsePredictionReturn {
  result: PredictionResponse | null
  loading: boolean
  error: string | null
  runPrediction: (image: File | null, sensors: SensorInput | null) => Promise<PredictionResponse | null>
  reset: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const usePrediction = (): UsePredictionReturn => {
  const [result, setResult] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runPrediction = async (
    image: File | null,
    sensors: SensorInput | null
  ) => {
    // ── Reset previous state ──
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const sensorsPayload = sensors
        ? (sensors as unknown as Record<string, number>)
        : null

      const data = await predict(image, sensorsPayload)
      setResult(data)
      return data
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Prediction failed. Check your backend connection.')
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setLoading(false)
  }

  return { result, loading, error, runPrediction, reset }
}