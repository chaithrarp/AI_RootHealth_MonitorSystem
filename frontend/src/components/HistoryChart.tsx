import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'
import type { HistoryRecord } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────
interface HistoryChartProps {
  records: HistoryRecord[]
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  const point = payload[0].payload
  const isHealthy = point.prediction === 'healthy'

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{
        background: 'rgba(13,13,13,0.95)',
        border: `1px solid ${isHealthy ? '#4ADE8033' : '#F8717133'}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span
        className="text-xs tracking-widest uppercase font-semibold"
        style={{ color: isHealthy ? '#4ADE80' : '#F87171' }}
      >
        {point.prediction}
      </span>
      <span className="text-sm font-bold" style={{ color: '#E8E0D0' }}>
        {Math.round(point.confidence * 100)}% confidence
      </span>
      <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.4 }}>
        {label}
      </span>
    </div>
  )
}

// ─── Custom Dot ───────────────────────────────────────────────────────────────
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  const color = payload.prediction === 'healthy' ? '#4ADE80' : '#F87171'

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke="rgba(0,0,0,0.4)"
      strokeWidth={2}
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export const HistoryChart = ({ records }: HistoryChartProps) => {
  // ── Transform records into chart-friendly shape ──
  const data = [...records]
    .reverse()
    .map((r) => ({
      time: new Date(r.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      confidence: parseFloat((r.confidence * 100).toFixed(1)),
      prediction: r.prediction,
    }))

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-48 rounded-xl"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.3 }}>
          No data yet
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="w-full rounded-2xl p-6"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <span
          className="text-xs tracking-[0.2em] uppercase"
          style={{ color: '#E8E0D0', opacity: 0.5 }}
        >
          Confidence Over Time
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.4 }}>Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.4 }}>Diseased</span>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: '#E8E0D0', opacity: 0.3, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#E8E0D0', opacity: 0.3, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={50}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="confidence"
            stroke="#4ADE80"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#4ADE80', stroke: '#0D0D0D', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}