import axios from 'axios'
import type { HistoryRecord, HistoryStats, PredictionResponse } from '../types'

// ─── Base Client ─────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30000, // 30s — image uploads can be slow
})

// ─── Health Check ─────────────────────────────────────────────────────────────
export const checkHealth = async (): Promise<{ status: string }> => {
  const res = await client.get('/health')
  return res.data
}

// ─── Predict ──────────────────────────────────────────────────────────────────
// Accepts an image file and optional sensor readings as FormData
export const predict = async (
  image: File | null,
  sensors: Record<string, number> | null
): Promise<PredictionResponse> => {
  const form = new FormData()

  if (image) {
    form.append('image', image)
  }

  if (sensors) {
    // Append each sensor value individually as the backend expects
    Object.entries(sensors).forEach(([key, value]) => {
      form.append(key, String(value))
    })
  }

  const res = await client.post<PredictionResponse>('/predict', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return res.data
}

// ─── History ──────────────────────────────────────────────────────────────────
export const fetchHistory = async (
  limit = 50,
  offset = 0
): Promise<HistoryRecord[]> => {
  const res = await client.get<HistoryRecord[]>('/history', {
    params: { limit, offset },
  })
  return res.data
}

// ─── History Stats ────────────────────────────────────────────────────────────
export const fetchHistoryStats = async (): Promise<HistoryStats> => {
  const res = await client.get<HistoryStats>('/history/stats')
  return res.data
}