import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { animate } from 'framer-motion'
import { Activity, AlertTriangle, CheckCircle, Layers, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useHistory } from '../hooks/useHistory'
import { useScrollReveal } from '../hooks/useScrollReveal'

// ─── Animated counter ─────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = Number.isInteger(value)
            ? Math.floor(v).toString()
            : v.toFixed(1)
        }
      },
    })
    return controls.stop
  }, [value])

  return (
    <>
      <span ref={ref}>0</span>
      {suffix && <span style={{ color: '#4ADE80' }}>{suffix}</span>}
    </>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  suffix = '',
  icon,
  color = '#4ADE80',
  delay = 0,
}: {
  label: string
  value: number
  suffix?: string
  icon: React.ReactNode
  color?: string
  delay?: number
}) => {
  const { ref, isVisible } = useScrollReveal()

  return (
    <motion.div
      ref={ref}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5 rounded-2xl p-6 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Glow corner */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}10 0%, transparent 70%)` }}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#E8E0D0', opacity: 0.4 }}>
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>

      <div className="text-4xl font-bold tabular-nums" style={{ color: '#E8E0D0' }}>
        {isVisible ? <AnimatedNumber value={value} suffix={suffix} /> : '0'}
      </div>
    </motion.div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const { records, stats, loading, error } = useHistory(10)
  const navigate = useNavigate()
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <div className="min-h-screen pt-28 pb-32 px-6 md:px-12" style={{ background: '#0D0D0D' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-16">

        {/* ── Page header ── */}
        <motion.div
          ref={headerRef}
          animate={headerVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3 pt-4"
        >
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#4ADE80' }}>
            Overview
          </span>
          <h1
            className="font-bold"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              color: '#E8E0D0',
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard
          </h1>
          <p className="text-sm max-w-md" style={{ color: '#E8E0D0', opacity: 0.4 }}>
            Live overview of your hydroponic system health and scan history.
          </p>
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
            {error} — Is your backend running at localhost:8000?
          </div>
        )}

        {/* ── Stat cards ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Scans"     value={stats.total_scans}                                         suffix=""   icon={<Layers size={16} />}        delay={0}    />
            <StatCard label="Disease Rate"    value={parseFloat((stats.disease_rate * 100).toFixed(1))}         suffix="%"  icon={<AlertTriangle size={16} />}  delay={0.08} color="#F87171" />
            <StatCard label="Healthy"         value={stats.healthy_count}                                       suffix=""   icon={<CheckCircle size={16} />}    delay={0.16} />
            <StatCard label="Avg Confidence"  value={parseFloat((stats.average_confidence * 100).toFixed(1))}  suffix="%"  icon={<Activity size={16} />}       delay={0.24} />
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

        {/* ── Recent predictions ── */}
        {!loading && records.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#E8E0D0', opacity: 0.35 }}>
                Recent Predictions
              </span>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-2 text-xs tracking-widest uppercase transition-opacity hover:opacity-100"
                style={{ color: '#4ADE80', opacity: 0.6 }}
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {records.slice(0, 8).map((r, i) => {
                const isHealthy = r.prediction === 'healthy'
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-between rounded-xl px-5 py-4 transition-colors duration-200 hover:bg-white/2 cursor-default"
                    style={{
                      background: 'rgba(255,255,255,0.015)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isHealthy ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                        }}
                      >
                        {isHealthy
                          ? <CheckCircle size={14} style={{ color: '#4ADE80' }} />
                          : <AlertTriangle size={14} style={{ color: '#F87171' }} />
                        }
                      </div>
                      <div className="flex flex-col">
                        <span
                          className="text-sm font-semibold capitalize"
                          style={{ color: isHealthy ? '#4ADE80' : '#F87171' }}
                        >
                          {r.prediction}
                        </span>
                        <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.3 }}>
                          {new Date(r.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <span className="text-sm tabular-nums font-bold" style={{ color: '#E8E0D0' }}>
                        {Math.round(r.confidence * 100)}%
                      </span>
                      <span
                        className="hidden md:block text-xs px-3 py-1 rounded-full tracking-widest uppercase"
                        style={{
                          background: 'rgba(74,222,128,0.06)',
                          border: '1px solid rgba(74,222,128,0.15)',
                          color: '#4ADE80',
                        }}
                      >
                        {r.mode.replace('_', ' ')}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && records.length === 0 && !error && (
          <div className="flex flex-col items-center gap-5 py-24">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}
            >
              <Activity size={24} style={{ color: '#4ADE80', opacity: 0.5 }} />
            </div>
            <p className="text-sm tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.25 }}>
              No predictions yet
            </p>
            <button
              onClick={() => navigate('/predict')}
              className="text-xs tracking-widest uppercase px-6 py-3 rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.2)',
                color: '#4ADE80',
              }}
            >
              Run your first diagnosis →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}