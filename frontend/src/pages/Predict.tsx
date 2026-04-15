// frontend/src/pages/Predict.tsx
// Only change from your original: pass `preview` as `originalPreview` prop to PredictionCard

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Cpu, Zap } from 'lucide-react'
import { usePrediction } from '../hooks/usePrediction'
import { SensorSliders, DEFAULT_SENSORS } from '../components/SensorSliders'
import { PredictionCard } from '../components/PredictionCard'
import { useScrollReveal } from '../hooks/useScrollReveal'
import type { SensorInput } from '../types'

export const Predict = () => {
  const { result, loading, error, runPrediction, reset } = usePrediction()
  const [image, setImage]           = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [useSensors, setUseSensors] = useState(false)
  const [sensors, setSensors]       = useState<SensorInput>(DEFAULT_SENSORS)
  const [dragging, setDragging]     = useState(false)
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal({ threshold: 0.1 })
  const [useImage, setUseImage] = useState(true)

  const handleFile = (file: File) => {
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setSensors(DEFAULT_SENSORS)
    reset()
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }, [])

  const clearImage = () => { 
    setImage(null)
    setPreview(null)
    setUseSensors(false)
    setSensors(DEFAULT_SENSORS)
    reset() 
  }

  // healthy and diseased suggested sensor ranges
  const getSuggestedSensors = (prediction: 'healthy' | 'diseased') => {
    const rand = (base: number, range: number) =>
      parseFloat((base + (Math.random() - 0.5) * range).toFixed(2))

    if (prediction === 'healthy') {
      return {
        ph:               rand(6.1, 0.4),
        tds:              rand(1100, 200),
        water_temp:       rand(20.0, 2),
        humidity:         rand(60, 8),
        dissolved_oxygen: rand(8.5, 1),
      }
    } else {
      return {
        ph:               rand(7.4, 0.4),
        tds:              rand(1800, 200),
        water_temp:       rand(26.0, 2),
        humidity:         rand(85, 6),
        dissolved_oxygen: rand(4.0, 0.8),
      }
    }
  }

  const handleSubmit = async () => {
    if (useImage && !image) return
    if (!useImage && !useSensors) return

    const data = await runPrediction(
      useImage ? image : null,
      useSensors ? sensors : null
    )

    // auto-suggest ONLY when image ON and sensor OFF
    if (data && useImage && !useSensors) {
      const key = data.prediction as 'healthy' | 'diseased'
      setSensors(getSuggestedSensors(key))
      setUseSensors(true)
    }
  }

  const canSubmit = ((useImage && image !== null) || useSensors) && !loading
  return (
    <div className="min-h-screen pt-28 pb-32 px-6 md:px-12" style={{ background: '#0D0D0D' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-10">

        {/* ── Header ── */}
        <motion.div
          ref={headerRef}
          animate={headerVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3 pt-4"
        >
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#4ADE80' }}>
            Analysis
          </span>
          <h1
            className="font-bold"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              color: '#E8E0D0',
              letterSpacing: '-0.02em',
            }}
          >
            Run Diagnosis
          </h1>
          <p className="text-sm" style={{ color: '#E8E0D0', opacity: 0.4 }}>
            Upload a root image, optionally add sensor readings, then run.
          </p>
        </motion.div>

        {/* ── Image upload ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3"
        >
          <span className="text-xs tracking-widest uppercase" style={{ color: '#E8E0D0', opacity: 0.4 }}>
            Root Image
          </span>

          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className="relative rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              border:     `1px dashed ${dragging ? '#4ADE80' : 'rgba(255,255,255,0.1)'}`,
              background: dragging ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)',
              boxShadow:  dragging ? '0 0 30px rgba(74,222,128,0.08)' : 'none',
              minHeight:  240,
            }}
          >
            {preview ? (
              <>
                <motion.img
                  src={preview}
                  alt="preview"
                  className="w-full object-cover"
                  style={{ maxHeight: 320 }}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                />
                <button
                  onClick={clearImage}
                  className="absolute top-3 right-3 p-2 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(13,13,13,0.85)', color: '#E8E0D0', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center gap-5 h-60 cursor-pointer">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
                >
                  <Upload size={22} style={{ color: '#4ADE80' }} />
                </motion.div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm" style={{ color: '#E8E0D0', opacity: 0.5 }}>
                    Drop image here or{' '}
                    <span style={{ color: '#4ADE80' }}>browse</span>
                  </span>
                  <span className="text-xs" style={{ color: '#E8E0D0', opacity: 0.25 }}>
                    PNG · JPG · WEBP
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </label>
            )}
          </div>
        </motion.div>

        {/* ── Sensor toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4"
        >
          {/* ── Image toggle ── */}
          <button
            onClick={() => setUseImage(v => !v)}
            className="flex items-center justify-between rounded-xl px-5 py-4 transition-all duration-300"
            style={{
              background: useImage ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
              border:     `1px solid ${useImage ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
              boxShadow:  useImage ? '0 0 20px rgba(74,222,128,0.06)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <Upload size={15} style={{ color: '#4ADE80' }} />
              <span className="text-sm tracking-widest uppercase" style={{ color: '#E8E0D0' }}>
                Include Image
              </span>
            </div>
            <div
              className="w-10 h-5 rounded-full relative transition-colors duration-300"
              style={{ background: useImage ? '#4ADE80' : 'rgba(255,255,255,0.1)' }}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full"
                style={{ background: '#0D0D0D' }}
                animate={{ left: useImage ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button> 
          <button
            onClick={() => setUseSensors(v => !v)}
            className="flex items-center justify-between rounded-xl px-5 py-4 transition-all duration-300"
            style={{
              background: useSensors ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
              border:     `1px solid ${useSensors ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
              boxShadow:  useSensors ? '0 0 20px rgba(74,222,128,0.06)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <Cpu size={15} style={{ color: '#4ADE80' }} />
              <span className="text-sm tracking-widest uppercase" style={{ color: '#E8E0D0' }}>
                Include Sensor Data
              </span>
            </div>
            <div
              className="w-10 h-5 rounded-full relative transition-colors duration-300"
              style={{ background: useSensors ? '#4ADE80' : 'rgba(255,255,255,0.1)' }}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full"
                style={{ background: '#0D0D0D' }}
                animate={{ left: useSensors ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>


          <AnimatePresence>
            {useSensors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border:     '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <SensorSliders values={sensors} onChange={setSensors} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Submit ── */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.97 } : {}}
          className="w-full py-5 rounded-full text-sm font-semibold tracking-widest uppercase flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: canSubmit ? '#4ADE80' : 'rgba(74,222,128,0.3)',
            color:      '#0D0D0D',
            boxShadow:  canSubmit ? '0 0 40px rgba(74,222,128,0.25)' : 'none',
          }}
        >
          {loading ? (
            <>
              <motion.div
                className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Analysing...
            </>
          ) : (
            <>
              <Zap size={15} />
              Run Diagnosis
            </>
          )}
        </motion.button>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl px-5 py-4 text-sm"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border:     '1px solid rgba(248,113,113,0.2)',
                color:      '#F87171',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result ── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* ← the one meaningful change: pass originalPreview */}
              <PredictionCard result={result} originalPreview={preview} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}