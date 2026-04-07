import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Leaf } from 'lucide-react'

// ─── Nav Links Config ─────────────────────────────────────────────────────────
const LINKS = [
  { to: '/',          label: 'Home'      },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/predict',   label: 'Predict'   },
  { to: '/history',   label: 'History'   },
]

// ─── Component ────────────────────────────────────────────────────────────────
export const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
      style={{
        background: 'rgba(13, 13, 13, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(74, 222, 128, 0.08)',
      }}
    >
      {/* ── Logo ── */}
      <NavLink to="/" className="flex items-center gap-2 group">
        <Leaf
          size={20}
          className="text-green-400 group-hover:rotate-12 transition-transform duration-300"
        />
        <span
          className="text-sm font-semibold tracking-[0.2em] uppercase"
          style={{ color: '#E8E0D0' }}
        >
          Root<span style={{ color: '#4ADE80' }}>AI</span>
        </span>
      </NavLink>

      {/* ── Links ── */}
      <div className="flex items-center gap-8">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              [
                'text-xs tracking-[0.15em] uppercase transition-colors duration-300',
                isActive
                  ? 'text-green-400'
                  : 'text-stone-400 hover:text-stone-200',
              ].join(' ')
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </motion.nav>
  )
}