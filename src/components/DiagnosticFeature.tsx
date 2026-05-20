'use client'

import { motion } from 'framer-motion'

const features = [
  {
    title: 'Evaluación metodológica',
    desc: 'Diseñado bajo marcos de referencia globales. En menos de 5 minutos sabrás la posición de tu startup.',
  },
  {
    title: 'Análisis multidimensional',
    desc: 'Evaluamos producto, tracción comercial, solidez de equipo y preparación documental para inversión.',
  },
  {
    title: 'Hojas de ruta accionables',
    desc: 'Al finalizar desbloqueas de manera dinámica las herramientas y plantillas que corresponden a tu fase.',
  },
]

export default function DiagnosticFeature() {
  return (
    <section
      id="diagnostico-info"
      style={{
        position: 'relative',
        padding: 'clamp(4.5rem, 9vw, 7.5rem) 0',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 clamp(1.25rem, 4vw, 3rem)',
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 'clamp(3rem, 6vw, 6rem)',
          alignItems: 'center',
        }}
        className="diag-grid"
      >
        {/* Left Column: Heading and description */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              fontWeight: 600,
              color: 'var(--color-accent-primary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '1rem',
            }}
          >
            [ 02 / LA METODOLOGÍA ]
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.035em',
              margin: '0 0 1.25rem 0',
              color: 'var(--color-ink)',
            }}
          >
            Diagnóstico de <span className="text-ember">Startup Readiness</span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.95rem, 1.2vw, 1.1rem)',
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)',
              margin: 0,
              maxWidth: 540,
            }}
          >
            Nuestra autoevaluación estructurada califica el estado actual de tu proyecto y genera instantáneamente un plan de trabajo adaptativo para robustecer tu propuesta de valor y tesis de impacto.
          </p>
        </motion.div>

        {/* Right Column: List of items separated by lines */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {features.map((f, i) => {
            const numStr = `0${i + 1}`
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'flex-start',
                  paddingTop: '1.75rem',
                  paddingBottom: '1.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Micro numerical identifier */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginTop: '0.2rem',
                  }}
                >
                  {numStr}
                </span>
                
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.15rem',
                      fontWeight: 500,
                      letterSpacing: '-0.02em',
                      marginBottom: '0.45rem',
                      color: 'var(--color-ink)',
                      lineHeight: 1.2,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .diag-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </section>
  )
}
