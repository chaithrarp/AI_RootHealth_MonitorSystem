// frontend/src/components/PredictionCard.tsx
// Drop-in replacement — no prop changes, no new dependencies beyond framer-motion + lucide

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import {
  CheckCircle, AlertTriangle, Cpu, Image as ImageIcon,
  Eye, EyeOff, ArrowUp, ArrowDown, Minus, ChevronDown,
  Zap, Activity,
} from 'lucide-react'
import { ConfidenceRing } from './ConfidenceRing'
import type { PredictionResponse, SensorAttribution } from '../types'

// ─── Reasoning copy ────────────────────────────────────────────────────────────
const DISEASE_REASONS: Record<string, { title: string; body: string }> = {
  high_image: {
    title: 'Visual pathology detected',
    body: 'The model identified browning, slime coating, or necrosis patterns on root tips. These are hallmark visual markers of Pythium or Fusarium infection.',
  },
  low_image: {
    title: 'Root structure looks clean',
    body: 'Root coloration is white-to-cream with no visible lesions or discolouration. Tip structure appears intact and well-formed.',
  },
  high_sensor: {
    title: 'Sensor readings outside optimal range',
    body: 'One or more readings (pH, DO, or temperature) deviate from healthy hydroponics windows, creating conditions that favour opportunistic pathogens.',
  },
  low_sensor: {
    title: 'All sensor readings nominal',
    body: 'pH, dissolved oxygen, temperature, and TDS are all within optimal ranges. Water chemistry is unlikely to be a contributing stressor.',
  },
  fusion_agree: {
    title: 'Image + sensor signals agree',
    body: 'Both modalities point in the same direction, which raises the model\'s overall confidence in this classification.',
  },
  fusion_split: {
    title: 'Image + sensor signals diverge',
    body: 'Visual and chemical signals pull in different directions. Confidence is moderated — consider re-checking sensor probe placement.',
  },
}

function getReasonKeys(result: PredictionResponse): string[] {
  const keys: string[] = []
  if (result.image_score > 0.5) keys.push('high_image')
  else keys.push('low_image')
  if (result.sensor_score !== null && result.sensor_score !== undefined) {
    if (result.sensor_score > 0.5) keys.push('high_sensor')
    else keys.push('low_sensor')
    const diff = Math.abs(result.image_score - result.sensor_score)
    keys.push(diff < 0.25 ? 'fusion_agree' : 'fusion_split')
  }
  return keys
}

// ─── Scan-line heatmap reveal ──────────────────────────────────────────────────
const ScanReveal = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-20"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.6, duration: 0.3 }}
    >
      {/* scan line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5"
        style={{ background: 'rgba(74,222,128,0.9)', boxShadow: '0 0 12px rgba(74,222,128,0.8)' }}
        initial={{ top: '0%' }}
        animate={{ top: '100%' }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
      {/* reveal mask — wipes down with scan line */}
      <motion.div
        className="absolute left-0 right-0 bottom-0"
        style={{ background: 'rgba(13,13,13,0.92)' }}
        initial={{ height: '100%' }}
        animate={{ height: '0%' }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
      {/* scanning grid lines */}
      {[0.25, 0.5, 0.75].map((x) => (
        <div
          key={x}
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${x * 100}%`, background: 'rgba(74,222,128,0.08)' }}
        />
      ))}
    </motion.div>
  )
}

// ─── Annotation arrow (points at a region of the image) ────────────────────────
const AnnotationArrow = ({
  label,
  fromX, fromY,
  toX, toY,
  color,
  delay,
}: {
  label: string
  fromX: number; fromY: number   // % within the image container
  toX: number;   toY: number
  color: string
  delay: number
}) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ inset: 0 }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.4 }}
  >
    <svg width="100%" height="100%" className="absolute inset-0" style={{ overflow: 'visible' }}>
      <defs>
        <marker
          id={`head-${delay}`}
          viewBox="0 0 10 10"
          refX="8" refY="5"
          markerWidth="5" markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M2 1L8 5L2 9" fill="none" stroke={color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <motion.line
        x1={`${fromX}%`} y1={`${fromY}%`}
        x2={`${toX}%`}   y2={`${toY}%`}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd={`url(#head-${delay})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
    {/* label chip */}
    <motion.div
      className="absolute text-xs px-2 py-1 rounded-md"
      style={{
        left: `${fromX}%`,
        top:  `${fromY}%`,
        transform: 'translate(-50%, -130%)',
        background: 'rgba(13,13,13,0.9)',
        border:     `1px solid ${color}40`,
        color,
        fontSize: 10,
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(4px)',
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay + 0.5, duration: 0.4 }}
    >
      {label}
    </motion.div>
  </motion.div>
)

// ─── Heatmap panel with scan reveal + annotations ─────────────────────────────
const HeatmapPanel = ({
  originalPreview,
  gradcamOverlay,
  prediction,
}: {
  originalPreview: string | null
  gradcamOverlay:  string
  prediction:      'healthy' | 'diseased'
}) => {
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [scanning, setScanning]       = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const isD = prediction === 'diseased'
  const accentColor = isD ? '#F87171' : '#4ADE80'

  const activateHeatmap = () => {
    if (showHeatmap) { setShowHeatmap(false); setShowAnnotations(false); return }
    setScanning(true)
    setShowHeatmap(true)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={13} style={{ color: accentColor }} />
          <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#E8E0D0', opacity: 0.5 }}>
            Activation Map
          </span>
        </div>
        <button
          onClick={activateHeatmap}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-wider uppercase transition-all duration-200"
          style={{
            background: showHeatmap ? `${accentColor}14` : 'rgba(255,255,255,0.04)',
            border:     showHeatmap ? `1px solid ${accentColor}40` : '1px solid rgba(255,255,255,0.08)',
            color:      showHeatmap ? accentColor : '#E8E0D0',
          }}
        >
          {showHeatmap ? <Eye size={11} /> : <EyeOff size={11} />}
          {showHeatmap ? 'Heatmap on' : 'Show heatmap'}
        </button>
      </div>

      {/* image frame */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ aspectRatio: '4/3', background: '#0a0a0a' }}
      >
        {/* original image — always underneath */}
        {originalPreview && (
          <img
            src={originalPreview}
            alt="Root image"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* heatmap layer */}
        <AnimatePresence>
          {showHeatmap && (
            <motion.img
              key="heatmap"
              src={gradcamOverlay}
              alt="Grad-CAM"
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* scan reveal animation */}
        <AnimatePresence>
          {scanning && (
            <ScanReveal onDone={() => { setScanning(false); setShowAnnotations(true) }} />
          )}
        </AnimatePresence>

        {/* annotation arrows — appear after scan */}
        <AnimatePresence>
          {showAnnotations && isD && (
            <>
              <AnnotationArrow
                label="High activation zone"
                fromX={30} fromY={20}
                toX={45}   toY={38}
                color="#F87171"
                delay={0}
              />
              <AnnotationArrow
                label="Root tip necrosis"
                fromX={72} fromY={25}
                toX={60}   toY={55}
                color="#FBBF24"
                delay={0.3}
              />
            </>
          )}
          {showAnnotations && !isD && (
            <AnnotationArrow
              label="Healthy structure"
              fromX={50} fromY={20}
              toX={50}   toY={45}
              color="#4ADE80"
              delay={0}
            />
          )}
        </AnimatePresence>

        {/* gradient legend at bottom */}
        <AnimatePresence>
          {showHeatmap && !scanning && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(to top, rgba(13,13,13,0.95), transparent)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.4 }}>
                Model attention
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.3 }}>low</span>
                <div
                  className="h-1.5 w-16 rounded-full"
                  style={{ background: 'linear-gradient(to right, #1a237e, #0288d1, #4CAF50, #FFEB3B, #F44336)' }}
                />
                <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.3 }}>high</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* idle overlay when no preview and no heatmap */}
        {!originalPreview && !showHeatmap && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.2 }}>
              No preview
            </span>
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: '#E8E0D0', opacity: 0.3, lineHeight: 1.6 }}>
        Red/yellow regions show where the CNN concentrated attention.
        High activation on root tips or discoloured patches indicates detected pathology.
      </p>
    </div>
  )
}

// ─── Sensor attribution row ────────────────────────────────────────────────────
const DirectionIcon = ({ dir }: { dir: SensorAttribution['direction'] }) => {
  if (dir === 'high') return <ArrowUp size={11} style={{ color: '#F87171' }} />
  if (dir === 'low')  return <ArrowDown size={11} style={{ color: '#FBBF24' }} />
  return <Minus size={11} style={{ color: '#4ADE80' }} />
}

const SensorRow = ({ attr, delay }: { attr: SensorAttribution; delay: number }) => {
  const barColor =
    attr.direction === 'high' ? '#F87171' :
    attr.direction === 'low'  ? '#FBBF24' : '#4ADE80'
  const statusLabel =
    attr.direction === 'high' ? 'above range' :
    attr.direction === 'low'  ? 'below range' : 'optimal'

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-2 rounded-xl px-4 py-3"
      style={{
        background: attr.direction !== 'normal' ? `${barColor}06` : 'rgba(255,255,255,0.02)',
        border:     `1px solid ${attr.direction !== 'normal' ? barColor + '18' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DirectionIcon dir={attr.direction} />
          <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.65 }}>
            {attr.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums font-semibold" style={{ color: barColor }}>
            {attr.value.toFixed(attr.unit === 'ppm' ? 0 : 2)}{attr.unit ? ` ${attr.unit}` : ''}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: `${barColor}14`,
              color:      barColor,
              border:     `1px solid ${barColor}30`,
              fontSize:   10,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* range bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums" style={{ color: '#E8E0D0', opacity: 0.2, fontSize: 10, minWidth: 28 }}>
          {attr.range_lo}
        </span>
        <div className="relative flex-1 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {/* healthy zone */}
          <div
            className="absolute top-0 h-0.5 rounded-full"
            style={{ left: '0%', right: '0%', background: 'rgba(74,222,128,0.2)' }}
          />
          {/* actual value marker */}
          <motion.div
            className="absolute top-1/2 w-2 h-2 rounded-full -translate-y-1/2 -translate-x-1/2"
            style={{ background: barColor, boxShadow: `0 0 6px ${barColor}` }}
            initial={{ left: '50%' }}
            animate={{
              left: `${Math.min(Math.max(
                ((attr.value - attr.range_lo) / (attr.range_hi - attr.range_lo + 1e-6)) * 100,
                0
              ), 100)}%`
            }}
            transition={{ duration: 1, delay: delay + 0.4, ease: 'easeOut' }}
          />
          {/* deviation fill */}
          <motion.div
            className="absolute left-0 top-0 h-0.5 rounded-full"
            style={{ background: barColor, boxShadow: `0 0 4px ${barColor}` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(attr.deviation * 100, 100)}%` }}
            transition={{ duration: 1, delay: delay + 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs tabular-nums" style={{ color: '#E8E0D0', opacity: 0.2, fontSize: 10, minWidth: 28, textAlign: 'right' }}>
          {attr.range_hi}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Score bar ─────────────────────────────────────────────────────────────────
const ScoreBar = ({
  label, value, icon, color = '#4ADE80', delay = 0,
}: {
  label: string; value: number; icon: React.ReactNode; color?: string; delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className="flex flex-col gap-2"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.5 }}>
          {label}
        </span>
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color: '#E8E0D0' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
    <div className="h-px w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        className="h-px rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: delay + 0.3 }}
      />
    </div>
  </motion.div>
)

// ─── Reasoning item ────────────────────────────────────────────────────────────
const ReasonItem = ({
  reasonKey, accentColor, delay,
}: { reasonKey: string; accentColor: string; delay: number }) => {
  const reason = DISEASE_REASONS[reasonKey]
  if (!reason) return null
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex gap-4 rounded-xl px-4 py-4"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border:     '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
      />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: accentColor }}>
          {reason.title}
        </span>
        <p className="text-sm leading-relaxed" style={{ color: '#E8E0D0', opacity: 0.5 }}>
          {reason.body}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
interface PredictionCardProps {
  result:           PredictionResponse
  originalPreview?: string | null
}

export const PredictionCard = ({ result, originalPreview }: PredictionCardProps) => {
  const isHealthy   = result.prediction === 'healthy'
  const accentColor = isHealthy ? '#4ADE80' : '#F87171'
  const reasonKeys  = getReasonKeys(result)
  const [showReasons, setShowReasons] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="w-full flex flex-col gap-0 rounded-2xl overflow-hidden"
      style={{
        border:     `1px solid ${accentColor}20`,
        background: 'rgba(255,255,255,0.02)',
        boxShadow:  `0 0 80px ${accentColor}0a`,
      }}
    >

      {/* ── Verdict header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-7 py-5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background:   `linear-gradient(135deg, ${accentColor}0a 0%, transparent 60%)`,
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <motion.div
              className="absolute rounded-full"
              style={{ width: 36, height: 36, background: `${accentColor}14` }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.8, repeat: Infinity }}
            />
            {isHealthy
              ? <CheckCircle size={20} style={{ color: accentColor }} />
              : <AlertTriangle size={20} style={{ color: accentColor }} />
            }
          </div>
          <div className="flex flex-col">
            <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#E8E0D0', opacity: 0.35 }}>
              Diagnosis result
            </span>
            <motion.span
              className="text-2xl font-bold tracking-tight capitalize"
              style={{ color: accentColor }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {result.prediction}
            </motion.span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-xs px-3 py-1 rounded-full tracking-widest uppercase"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.1)',
              color:      '#E8E0D0',
              opacity:    0.6,
            }}
          >
            {result.mode.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ── Confidence ring ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center py-10 relative"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 220, height: 220,
            background: `radial-gradient(circle, ${accentColor}0e 0%, transparent 70%)`,
          }}
        />
        <ConfidenceRing confidence={result.confidence} prediction={result.prediction} size={160} />
      </div>

      {/* ── Probability split ────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {(['healthy', 'diseased'] as const).map((key) => {
          const pct    = Math.round(result.probabilities[key] * 100)
          const color  = key === 'healthy' ? '#4ADE80' : '#F87171'
          const active = result.prediction === key
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 py-6"
              style={{
                borderRight: key === 'healthy' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background:  active ? `${color}06` : 'transparent',
              }}
            >
              <motion.span
                className="text-3xl font-bold tabular-nums"
                style={{ color }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {pct}%
              </motion.span>
              <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.35 }}>
                {key}
              </span>
              {active && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${color}14`, color, border: `1px solid ${color}30`, fontSize: 10 }}
                >
                  predicted
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Score bars ──────────────────────────────────────────────────────── */}
      {(result.image_score > 0 || (result.sensor_score ?? 0) > 0) && (
        <div
          className="flex flex-col gap-4 px-7 py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: '#E8E0D0', opacity: 0.3 }} />
            <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#E8E0D0', opacity: 0.3 }}>
              Component scores
            </span>
          </div>
          {result.image_score > 0 && (
            <ScoreBar
              label="Image model"
              value={result.image_score}
              icon={<ImageIcon size={13} />}
              color={result.image_score > 0.5 ? '#F87171' : '#4ADE80'}
              delay={0}
            />
          )}
          {result.sensor_score !== null && result.sensor_score !== undefined && result.sensor_score > 0 && (
            <ScoreBar
              label="Sensor model"
              value={result.sensor_score}
              icon={<Cpu size={13} />}
              color={result.sensor_score > 0.5 ? '#F87171' : '#4ADE80'}
              delay={0.1}
            />
          )}
        </div>
      )}

      {/* ── Grad-CAM heatmap ──────────────────────────────────────────────── */}
      {result.gradcam_overlay && (
        <div
          className="px-7 py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <HeatmapPanel
            originalPreview={originalPreview ?? null}
            gradcamOverlay={result.gradcam_overlay}
            prediction={result.prediction}
          />
        </div>
      )}

      {/* ── Sensor attribution ────────────────────────────────────────────── */}
      {result.sensor_attributions && result.sensor_attributions.length > 0 && (
        <div
          className="flex flex-col gap-3 px-7 py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <Cpu size={12} style={{ color: '#E8E0D0', opacity: 0.3 }} />
            <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#E8E0D0', opacity: 0.3 }}>
              Sensor signals
            </span>
          </div>
          {result.sensor_attributions.map((attr, i) => (
            <SensorRow key={attr.key} attr={attr} delay={i * 0.08} />
          ))}
        </div>
      )}

      {/* ── Classification reasoning ────────────────────────────────────── */}
      <div className="flex flex-col">
        <button
          onClick={() => setShowReasons(v => !v)}
          className="flex items-center justify-between px-7 py-4 transition-colors duration-200"
          style={{
            borderBottom: showReasons ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}
        >
          <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#E8E0D0', opacity: 0.3 }}>
            Why this prediction?
          </span>
          <motion.div animate={{ rotate: showReasons ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={14} style={{ color: '#E8E0D0', opacity: 0.3 }} />
          </motion.div>
        </button>

        <AnimatePresence>
          {showReasons && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 px-7 py-5">
                {reasonKeys.map((key, i) => (
                  <ReasonItem
                    key={key}
                    reasonKey={key}
                    accentColor={accentColor}
                    delay={i * 0.08}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Timestamp ──────────────────────────────────────────────────────── */}
      <div className="px-7 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-xs tracking-widest text-center" style={{ color: '#E8E0D0', opacity: 0.15 }}>
          {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>

    </motion.div>
  )
}