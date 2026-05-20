'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Activity } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/* ─── Math details for Hexagonal Readiness Radar ─── */
const DIMENSIONS = [
  { name: 'Madurez', sub: 'Producto' },
  { name: 'Validación', sub: 'Comercial' },
  { name: 'Equipo', sub: 'Estructura' },
  { name: 'Data Room', sub: 'Inversores' },
  { name: 'Finanzas', sub: 'Runway' },
  { name: 'Impacto', sub: 'Métricas CO2' },
]

const STAGES_DATA = [
  {
    name: 'Ideación (Pre-incubación)',
    scores: [0.35, 0.25, 0.40, 0.15, 0.20, 0.45],
    color: '#DA4E24',
    bg: 'rgba(218,78,36,0.06)',
    border: 'rgba(218,78,36,0.3)',
  },
  {
    name: 'Crecimiento (Aceleración)',
    scores: [0.85, 0.75, 0.80, 0.70, 0.65, 0.90],
    color: '#1F77F6',
    bg: 'rgba(31,119,246,0.06)',
    border: 'rgba(31,119,246,0.3)',
  },
]

// Hexagon math around center (150, 150)
const cx = 150
const cy = 150

const getCoordinates = (index: number, val: number) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 6
  const r = val * 95 // max radius 95
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function ReadinessRadar() {
  const [profileIndex, setProfileIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProfileIndex((prev) => (prev === 0 ? 1 : 0))
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  const current = STAGES_DATA[profileIndex]
  
  // Calculate points string for polygon
  const points = current.scores
    .map((val, idx) => {
      const { x, y } = getCoordinates(idx, val)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.75rem',
        borderRadius: 20,
        background: 'rgba(10, 10, 10, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 30px 60px -15px rgba(0,0,0,0.8)',
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          width: '100%',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        <Activity size={16} color={current.color} style={{ transition: 'color 0.8s ease' }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Readiness Radar
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.72rem',
            color: current.color,
            background: current.bg,
            border: `1px solid ${current.border}`,
            padding: '0.15rem 0.5rem',
            borderRadius: 6,
            fontWeight: 600,
            transition: 'all 0.8s ease',
          }}
        >
          Demo
        </span>
      </div>

      <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative' }}>
        <svg viewBox="0 0 300 300" style={{ width: '100%', height: '100%' }}>
          {/* Concentric grid rings */}
          {[0.25, 0.5, 0.75, 1.0].map((scaleLevel, ringIdx) => {
            const ringPoints = Array.from({ length: 6 })
              .map((_, idx) => {
                const { x, y } = getCoordinates(idx, scaleLevel)
                return `${x},${y}`
              })
              .join(' ')

            return (
              <polygon
                key={ringIdx}
                points={ringPoints}
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            )
          })}

          {/* Radial grid axis lines */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const { x, y } = getCoordinates(idx, 1.0)
            return (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            )
          })}

          {/* Radar Score Polygon shape */}
          <defs>
            <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#DA4E24" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1F77F6" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <motion.polygon
            animate={{ points: points }}
            transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
            fill="url(#radarGrad)"
            stroke={current.color}
            strokeWidth="2"
            style={{ transition: 'stroke 0.8s ease' }}
          />

          {/* Interactive dots representing current scores */}
          {current.scores.map((val, idx) => {
            const { x, y } = getCoordinates(idx, val)
            return (
              <motion.circle
                key={idx}
                animate={{ cx: x, cy: y }}
                transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                r="4.5"
                fill="#FFF"
                stroke={current.color}
                strokeWidth="2"
                style={{ transition: 'stroke 0.8s ease', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
              />
            )
          })}

          {/* Dimension Labels */}
          {DIMENSIONS.map((dim, idx) => {
            const { x, y } = getCoordinates(idx, 1.20)
            // Adjust label text anchors based on position
            let textAnchor: "start" | "end" | "middle" = 'middle'
            if (x > cx + 20) textAnchor = 'start'
            if (x < cx - 20) textAnchor = 'end'

            let dyOffset = '0.35em'
            if (y < cy - 20) dyOffset = '-0.2em'
            if (y > cy + 20) dyOffset = '1em'

            return (
              <g key={idx}>
                <text
                  x={x}
                  y={y}
                  dy={dyOffset}
                  textAnchor={textAnchor}
                  fill="rgba(255,255,255,0.9)"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {dim.name}
                </text>
                <text
                  x={x}
                  y={y}
                  dy={`calc(${dyOffset} + 11px)`}
                  textAnchor={textAnchor}
                  fill="rgba(255,255,255,0.4)"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '7.5px',
                  }}
                >
                  {dim.sub}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Under-graph profile badge */}
      <div
        style={{
          marginTop: '1.25rem',
          width: '100%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10,
          padding: '0.65rem 0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.74rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          Perfil actual
        </span>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            transition: 'color 0.8s ease',
          }}
        >
          {current.name}
        </span>
      </div>
    </div>
  )
}

export default function Hero() {
  const { user, openAuthModal } = useAuth()
  const router = useRouter()

  const reveal = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
  }

  const stagger = {
    initial: {},
    animate: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
  }

  return (
    <section
      className="hero-stage"
      style={{
        position: 'relative',
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Orbs firma — ember (cobre) abajo-izq, electric (azul) abajo-der */}
      <div
        className="orb orb-ember orb-lg"
        style={{ bottom: '-380px', left: '-300px' }}
        aria-hidden
      />
      <div
        className="orb orb-electric orb-lg"
        style={{ bottom: '-380px', right: '-300px' }}
        aria-hidden
      />

      {/* Container principal de la grilla */}
      <div
        style={{
          maxWidth: 1400,
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: 'clamp(1.25rem, 4vw, 3rem)',
          paddingRight: 'clamp(1.25rem, 4vw, 3rem)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 'clamp(2rem, 5vw, 4.5rem)',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Text & CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            {/* Eyebrow */}
            <motion.div
              variants={reveal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(218,78,36,0.08)',
                border: '1px solid rgba(218,78,36,0.22)',
                marginBottom: '1.5rem',
              }}
            >
              <Sparkles size={11} color="#DA4E24" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'var(--color-accent-primary)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Toolkit & Diagnóstico v2.1
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={reveal}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2rem, 4vw, 3.6rem)',
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: '-0.035em',
                color: 'var(--color-ink)',
                margin: '0 0 1.25rem 0',
                textWrap: 'balance',
              }}
            >
              La infraestructura metodológica para{' '}
              <span className="text-ember">startups de impacto</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={reveal}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(1rem, 1.2vw, 1.15rem)',
                fontWeight: 400,
                lineHeight: 1.55,
                color: 'var(--color-text-secondary)',
                maxWidth: 580,
                margin: '0 0 2rem 0',
                letterSpacing: '-0.01em',
              }}
            >
              Evalúa tu nivel de preparación, accede a herramientas interactivas de negocio y conéctate con mentores especializados. Sin rodeos. Diseñado en América Latina.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={reveal}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '2.5rem',
              }}
            >
              <button
                onClick={() => user ? router.push('/tools') : openAuthModal('register')}
                className="btn-ember"
              >
                {user ? 'Ir a mi plataforma' : 'Comenzar diagnóstico'}
                <ArrowRight size={18} />
              </button>
              <Link href="/organizaciones" className="btn-ghost">
                Para organizaciones
              </Link>
            </motion.div>

            {/* Stats row directly aligned below */}
            <motion.div
              variants={reveal}
              style={{
                display: 'flex',
                gap: 'clamp(1.5rem, 3vw, 3rem)',
                flexWrap: 'wrap',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '1.75rem',
                width: '100%',
              }}
            >
              {[
                { v: '+30', l: 'Herramientas interactivas' },
                { v: '+200', l: 'Diagnósticos completados' },
                { v: 'Gratis', l: 'Para founders' },
              ].map((s) => (
                <div key={s.l}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.74rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.35rem',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Visual Mockup (Radar Chart) */}
          <motion.div
            variants={reveal}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <ReadinessRadar />
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
          .hero-grid > div {
            align-items: center !important;
            text-align: center !important;
          }
          .hero-grid > div > div {
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  )
}
