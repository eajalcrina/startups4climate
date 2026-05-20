'use client'

import { motion } from 'framer-motion'

const problems = [
  {
    title: 'Founders sin infraestructura',
    description:
      'América Latina cuenta con talento excepcional, pero carece de herramientas metodológicas estandarizadas y accesibles para escalar startups de impacto.',
  },
  {
    title: 'Incubadoras sin tecnología',
    description:
      'Cohortes gestionadas de forma fragmentada. Sin visibilidad unificada del progreso real, el acompañamiento estratégico pierde precisión y escala.',
  },
  {
    title: 'Capital sin visibilidad',
    description:
      'Los fondos de capital de riesgo e inversores corporativos carecen de data room estandarizados para evaluar la madurez de los proyectos a escala.',
  },
]

export default function ProblemSection() {
  return (
    <section
      id="problema"
      style={{
        position: 'relative',
        padding: 'clamp(4.5rem, 9vw, 7.5rem) 0',
        background: 'var(--color-bg-primary)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
        }}
      >
        {/* Editorial Header Grid */}
        <div
          className="problem-header-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.18fr 0.82fr',
            gap: 'clamp(2rem, 5vw, 4rem)',
            marginBottom: '3.5rem',
            alignItems: 'end',
          }}
        >
          <div>
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
              [ 01 / EL CONTEXTO ]
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: '-0.035em',
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              Tres brechas críticas que frenan el escalamiento en la región
            </h2>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(0.92rem, 1.1vw, 1.05rem)',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              Latinoamérica cuenta con talento e iniciativas de impacto formidables, pero carece de la infraestructura digital que formalice, certifique y acelere la preparación de los proyectos ante el capital de riesgo.
            </p>
          </div>
        </div>

        {/* Swiss Column Grid */}
        <div
          className="problem-columns-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {problems.map((p, i) => {
            const indexStr = `0${i + 1}`
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="problem-col"
                style={{
                  paddingTop: '2.5rem',
                  paddingBottom: '2.5rem',
                  paddingLeft: i === 0 ? '0' : 'clamp(1.5rem, 3vw, 3.5rem)',
                  paddingRight: i === 2 ? '0' : 'clamp(1.5rem, 3vw, 3.5rem)',
                  borderRight: i < 2 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Index number in Mluvka */}
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.4rem',
                    fontWeight: 500,
                    color: 'var(--color-accent-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {indexStr}
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 500,
                    letterSpacing: '-0.025em',
                    color: 'var(--color-ink)',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {p.title}
                </h3>

                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                  }}
                >
                  {p.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .problem-header-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
            margin-bottom: 2.5rem !important;
          }
          .problem-columns-grid {
            grid-template-columns: 1fr !important;
          }
          .problem-col {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 2rem !important;
            padding-bottom: 2rem !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .problem-col:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </section>
  )
}
