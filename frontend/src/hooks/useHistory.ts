import { useState, useEffect, useCallback } from 'react'
import { fetchHistory, fetchHistoryStats } from '../api/api'
import type { HistoryRecord, HistoryStats } from '../types'

// ─── Hook State Shape ─────────────────────────────────────────────────────────
interface UseHistoryReturn {
  records: HistoryRecord[]
  stats: HistoryStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useHistory = (limit = 50): UseHistoryReturn => {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // ── Fetch both in parallel — faster ──
      const [historyData, statsData] = await Promise.all([
        fetchHistory(limit, 0),
        fetchHistoryStats(),
      ])

      setRecords(historyData)
      setStats(statsData)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load history. Check your backend connection.')
      }
    } finally {
      setLoading(false)
    }
  }, [limit])

  // ── Auto-fetch on mount ──
  useEffect(() => {
    load()
  }, [load])

  return { records, stats, loading, error, refetch: load }
}