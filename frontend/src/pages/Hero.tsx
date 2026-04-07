import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Activity, Zap, Shield, BarChart2 } from 'lucide-react'
import { ParticleBackground } from '../components/ParticleBackground'
import { useScrollReveal } from '../hooks/useScrollReveal'

// ─── Masked text reveal ───────────────────────────────────────────────────────
const RevealText = ({
  children,
  delay = 0,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) => (
  <div style={{ overflow: 'hidden', ...style }}>
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  </div>
)

// ─── Scroll reveal wrapper ────────────────────────────────────────────────────
const ScrollReveal = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) => {
  const { ref, isVisible } = useScrollReveal()
  return (
    <motion.div
      ref={ref}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Feature row ─────────────────────────────────────────────────────────────
const FeatureRow = ({
  icon,
  title,
  desc,
  index,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  index: number
}) => {
  const { ref, isVisible } = useScrollReveal()
  return (
    <motion.div
      ref={ref}
      animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-6 py-8"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1"
        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
      >
        <span style={{ color: '#4ADE80' }}>{icon}</span>
      </div>
      <div className="flex flex-col gap-2">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ color: '#E8E0D0' }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: '#E8E0D0', opacity: 0.45 }}>
          {desc}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Animated counter ─────────────────────────────────────────────────────────
const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const { ref: revealRef, isVisible } = useScrollReveal()
  const countRef = useRef<HTMLSpanElement>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (isVisible && !hasRun.current && countRef.current) {
      hasRun.current = true
      const controls = animate(0, to, {
        duration: 2,
        ease: 'easeOut',
        onUpdate: (v) => {
          if (countRef.current) {
            countRef.current.textContent =
              Number.isInteger(to) ? Math.floor(v).toString() : v.toFixed(1)
          }
        },
      })
      return controls.stop
    }
  }, [isVisible, to])

  return (
    <div ref={revealRef} className="flex flex-col items-center gap-2">
      <div className="flex items-end gap-1">
        <span
          ref={countRef}
          className="text-5xl font-bold tabular-nums"
          style={{ color: '#E8E0D0' }}
        >
          0
        </span>
        <span className="text-2xl font-bold mb-2" style={{ color: '#4ADE80' }}>
          {suffix}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export const Hero = () => {
  const navigate = useNavigate()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Parallax transforms
  const bgX = useTransform(mouseX, [-1, 1], [-18, 18])
  const bgY = useTransform(mouseY, [-1, 1], [-10, 10])
  const fg1X = useTransform(mouseX, [-1, 1], [-8, 8])
  const fg1Y = useTransform(mouseY, [-1, 1], [-4, 4])

  const handleMouseMove = (e: React.MouseEvent) => {
    const { innerWidth, innerHeight } = window
    mouseX.set((e.clientX / innerWidth - 0.5) * 2)
    mouseY.set((e.clientY / innerHeight - 0.5) * 2)
  }

  return (
    <div style={{ background: '#0D0D0D' }} onMouseMove={handleMouseMove}>

      {/* ════════════════════════════════════════════════════
          SECTION 1 — CINEMATIC HERO
      ════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Particles */}
        <ParticleBackground />

        {/* Parallax background image */}
        <motion.div
          style={{
            x: bgX,
            y: bgY,
            position: 'absolute',
            inset: '-10%',
            backgroundImage: 'url(/images/hero-bg.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
            zIndex: 0,
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 70%, rgba(74,222,128,0.08) 0%, transparent 70%), linear-gradient(to bottom, transparent 60%, #0D0D0D 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl">

          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-10 text-xs tracking-[0.2em] uppercase"
            style={{
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.2)',
              color: '#4ADE80',
            }}
          >
            <Activity size={11} />
            AI-Powered Root Health Detection
          </motion.div>

          {/* Big headline with mask reveal */}
          <div className="flex flex-col items-center gap-0 mb-8">
            <RevealText
              delay={0.4}
              className="font-bold leading-none tracking-tight"
              style={{
                fontSize: 'clamp(4rem, 10vw, 9rem)',
                color: '#E8E0D0',
                letterSpacing: '-0.03em',
              }}
            >
              Know Your
            </RevealText>
            <RevealText
              delay={0.55}
              className="font-bold leading-none tracking-tight"
              style={{
                fontSize: 'clamp(4rem, 10vw, 9rem)',
                color: '#4ADE80',
                letterSpacing: '-0.03em',
                textShadow: '0 0 80px rgba(74,222,128,0.4)',
              }}
            >
              Roots.
            </RevealText>
          </div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="max-w-lg text-base leading-relaxed mb-12"
            style={{ color: '#E8E0D0', letterSpacing: '0.02em' }}
          >
            Detect Pythium root rot in hydroponic lettuce using image analysis
            and live sensor fusion — before it spreads.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 flex-wrap justify-center"
          >
            <button
              onClick={() => navigate('/predict')}
              className="flex items-center gap-3 px-8 py-4 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: '#4ADE80',
                color: '#0D0D0D',
                boxShadow: '0 0 40px rgba(74,222,128,0.35)',
              }}
            >
              Run Diagnosis
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 px-8 py-4 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                border: '1px solid rgba(232,224,208,0.2)',
                color: '#E8E0D0',
              }}
            >
              View Dashboard
            </button>
          </motion.div>
        </div>

        {/* Parallax foreground glow orb */}
        <motion.div
          style={{
            x: fg1X,
            y: fg1Y,
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <motion.div
            className="w-px h-14"
            style={{ background: 'linear-gradient(to bottom, #4ADE80, transparent)' }}
            animate={{ scaleY: [0, 1, 0], originY: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#E8E0D0', opacity: 0.25 }}>
            Scroll
          </span>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 2 — SPLIT IMAGE: HEALTHY vs DISEASED
      ════════════════════════════════════════════════════ */}
      <section className="relative py-32 px-6 md:px-16 overflow-hidden">
        <div className="max-w-6xl mx-auto">

          <ScrollReveal className="mb-16 flex flex-col gap-3">
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#4ADE80' }}>
              Detection
            </span>
            <h2
              className="font-bold leading-none"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                color: '#E8E0D0',
                letterSpacing: '-0.02em',
              }}
            >
              See the difference.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Healthy */}
            <ScrollReveal delay={0.1}>
              <div className="relative rounded-2xl overflow-hidden group" style={{ height: 420 }}>
                <motion.img
                  src="/images/roots-healthy.webp"
                  alt="Healthy roots"
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(13,13,13,0.9) 0%, transparent 60%)',
                  }}
                />
                <div className="absolute bottom-6 left-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px #4ADE80' }} />
                  <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#4ADE80' }}>
                    Healthy
                  </span>
                </div>
              </div>
            </ScrollReveal>

            {/* Diseased */}
            <ScrollReveal delay={0.2}>
              <div className="relative rounded-2xl overflow-hidden group" style={{ height: 420 }}>
                <motion.img
                  src="/images/roots-diseased.webp"
                  alt="Diseased roots"
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(13,13,13,0.9) 0%, transparent 60%)',
                  }}
                />
                <div className="absolute bottom-6 left-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400" style={{ boxShadow: '0 0 8px #F87171' }} />
                  <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#F87171' }}>
                    Diseased
                  </span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 3 — ANIMATED STATS
      ════════════════════════════════════════════════════ */}
      <section
        className="relative py-32 px-6 overflow-hidden"
        style={{
          backgroundImage: 'url(/images/stats-bg.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(13,13,13,0.88)' }}
        />
        <div className="relative z-10 max-w-4xl mx-auto">
          <ScrollReveal className="mb-20 text-center flex flex-col gap-3">
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#4ADE80' }}>
              Performance
            </span>
            <h2
              className="font-bold"
              style={{
                fontSize: 'clamp(2rem, 5vw, 4rem)',
                color: '#E8E0D0',
                letterSpacing: '-0.02em',
              }}
            >
              Built on real data.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { to: 94,   suffix: '%', label: 'Detection Accuracy' },
              { to: 3,    suffix: 's', label: 'Avg Inference Time' },
              { to: 2,    suffix: 'K+', label: 'Training Images'   },
              { to: 5,    suffix: '',  label: 'Sensor Inputs'      },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Counter to={stat.to} suffix={stat.suffix} />
                <span
                  className="text-xs tracking-[0.2em] uppercase"
                  style={{ color: '#E8E0D0', opacity: 0.4 }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 4 — FEATURE ROWS
      ════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 md:px-16">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal className="mb-16 flex flex-col gap-3">
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#4ADE80' }}>
              Capabilities
            </span>
            <h2
              className="font-bold"
              style={{
                fontSize: 'clamp(2rem, 5vw, 4rem)',
                color: '#E8E0D0',
                letterSpacing: '-0.02em',
              }}
            >
              How it works.
            </h2>
          </ScrollReveal>

          {[
            {
              icon: <Zap size={16} />,
              title: 'Image Classification',
              desc: 'Upload a photo of your root system. Our fine-tuned CNN model analyses texture, color, and structure to detect early signs of Pythium rot.',
            },
            {
              icon: <Activity size={16} />,
              title: 'Sensor Fusion',
              desc: 'Combine image analysis with real-time sensor readings — pH, temperature, dissolved oxygen, EC, and turbidity — for a fused confidence score.',
            },
            {
              icon: <Shield size={16} />,
              title: 'Early Detection',
              desc: 'Catch root rot before it spreads. Our model detects disease at early stages, giving you time to intervene and save your crop.',
            },
            {
              icon: <BarChart2 size={16} />,
              title: 'Prediction History',
              desc: 'Every scan is logged. Track disease trends over time, monitor confidence scores, and identify patterns in your hydroponic system.',
            },
          ].map((f, i) => (
            <FeatureRow key={i} index={i} {...f} />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 5 — FINAL CTA
      ════════════════════════════════════════════════════ */}
      <section
        className="relative py-40 px-6 overflow-hidden flex flex-col items-center text-center"
        style={{
          backgroundImage: 'url(/images/feature-bg.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(13,13,13,0.92)' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl">
          <ScrollReveal>
            <h2
              className="font-bold leading-tight"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                color: '#E8E0D0',
                letterSpacing: '-0.02em',
              }}
            >
              Ready to diagnose?
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-base leading-relaxed" style={{ color: '#E8E0D0', opacity: 0.45 }}>
              Upload your first image and get a diagnosis in seconds.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.25}>
            <button
              onClick={() => navigate('/predict')}
              className="flex items-center gap-3 px-10 py-5 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: '#4ADE80',
                color: '#0D0D0D',
                boxShadow: '0 0 50px rgba(74,222,128,0.3)',
              }}
            >
              Run Diagnosis
              <ArrowRight size={15} />
            </button>
          </ScrollReveal>
        </div>
      </section>

    </div>
  )
}