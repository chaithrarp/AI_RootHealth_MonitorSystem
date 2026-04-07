import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { useHistory } from '../hooks/useHistory'
import { HistoryChart } from '../components/HistoryChart'
import { useScrollReveal } from '../hooks/useScrollReveal'

export const History = () => {
  const { records, stats, loading, error, refetch } = useHistory(50)
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal({ threshold: 0.1 })
  const { ref: chartRef, isVisible: chartVisible }   = useScrollReveal({ threshold: 0.1 })
  const { ref: tableRef, isVisible: tableVisible }   = useScrollReveal({ threshold: 0.05 })

  return (
    <div className="min-h-screen pt-28 pb-32 px-6 md:px-12" style={{ background: '#0D0D0D' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-14">

        {/* ── Header ── */}
        <motion.div
          ref={headerRef}
          animate={headerVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between pt-4"
        >
          <div className="flex flex-col gap-3">
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#4ADE80' }}>
              Records
            </span>
            <h1
              className="font-bold"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                color: '#E8E0D0',
                letterSpacing: '-0.02em',
              }}
            >
              History
            </h1>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 text-xs tracking-widest uppercase mb-3 transition-all hover:opacity-100"
            style={{ color: '#4ADE80', opacity: 0.6 }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </motion.div>

        {/* ── Error ── */}
        {error && (
          <div
            className="rounded-xl px-5 py-4 text-sm"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: '#F87171',
            }}
          >
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-green-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {!loading && records.length > 0 && (
          <>
            {/* ── Stats strip ── */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Scans',    value: `${stats.total_scans}`                              },
                  { label: 'Disease Rate',   value: `${(stats.disease_rate * 100).toFixed(1)}%`         },
                  { label: 'Healthy',        value: `${stats.healthy_count}`                            },
                  { label: 'Avg Confidence', value: `${(stats.average_confidence * 100).toFixed(1)}%`  },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-xl px-5 py-5 flex flex-col gap-2"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.35 }}>
                      {s.label}
                    </span>
                    <span className="text-2xl font-bold tabular-nums" style={{ color: '#E8E0D0' }}>
                      {s.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ── Chart ── */}
            <motion.div
              ref={chartRef}
              animate={chartVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <HistoryChart records={records} />
            </motion.div>

            {/* ── Table ── */}
            <motion.div
              ref={tableRef}
              animate={tableVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4"
            >
              <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#E8E0D0', opacity: 0.35 }}>
                All Predictions
              </span>

              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Header */}
                <div
                  className="grid grid-cols-5 px-5 py-3 text-xs tracking-widest uppercase"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#E8E0D0',
                    opacity: 0.4,
                  }}
                >
                  <span>Result</span>
                  <span>Confidence</span>
                  <span>Mode</span>
                  <span className="hidden md:block">Image</span>
                  <span>Time</span>
                </div>

                {/* Rows */}
                {records.map((r, i) => {
                  const isHealthy = r.prediction === 'healthy'
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.5 }}
                      className="grid grid-cols-5 px-5 py-4 items-center text-sm hover:bg-white/2 transition-colors duration-200"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2">
                        {isHealthy
                          ? <CheckCircle size={14} style={{ color: '#4ADE80' }} />
                          : <AlertTriangle size={14} style={{ color: '#F87171' }} />
                        }
                        <span className="capitalize font-medium" style={{ color: isHealthy ? '#4ADE80' : '#F87171' }}>
                          {r.prediction}
                        </span>
                      </div>
                      <span className="tabular-nums font-semibold" style={{ color: '#E8E0D0' }}>
                        {Math.round(r.confidence * 100)}%
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded-full w-fit tracking-wider uppercase"
                        style={{
                          background: 'rgba(74,222,128,0.06)',
                          border: '1px solid rgba(74,222,128,0.15)',
                          color: '#4ADE80',
                        }}
                      >
                        {r.mode.replace('_', ' ')}
                      </span>
                      <span className="hidden md:block tabular-nums text-xs" style={{ color: '#E8E0D0', opacity: 0.4 }}>
                        {Math.round(r.image_score * 100)}%
                      </span>
                      <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.35 }}>
                        {new Date(r.timestamp).toLocaleDateString()}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}

        {/* ── Empty ── */}
        {!loading && records.length === 0 && !error && (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.25 }}>
              No predictions recorded yet
            </p>
          </div>
        )}
      </div>
    </div>
  )
}