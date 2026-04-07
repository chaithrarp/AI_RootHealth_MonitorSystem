import { motion } from 'framer-motion'

// ─── Props ────────────────────────────────────────────────────────────────────
interface ConfidenceRingProps {
  confidence: number                        // 0–1 float from API
  prediction: 'healthy' | 'diseased'
  size?: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export const ConfidenceRing = ({
  confidence,
  prediction,
  size = 160,
}: ConfidenceRingProps) => {
  const radius      = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const percentage  = Math.round(confidence * 100)
  const offset      = circumference - (confidence * circumference)
  const color       = prediction === 'healthy' ? '#4ADE80' : '#F87171'
  const center      = size / 2

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        {/* ── Track ring ── */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={8}
        />

        {/* ── Animated progress ring ── */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>

      {/* ── Center label (counter-rotate so text is upright) ── */}
      <div className="flex flex-col items-center -mt-2" style={{ marginTop: -(size / 2 + 32) }}>
        <motion.span
          className="text-4xl font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {percentage}%
        </motion.span>
        <span className="text-xs tracking-widest uppercase mt-1" style={{ color: '#E8E0D0', opacity: 0.5 }}>
          confidence
        </span>
      </div>
    </div>
  )
}