'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const founders = [
  {
    photo: '/eddie.webp',
    name: 'Eddie Ajalcriña',
    role: 'Co-Founder & CEO',
    bio: 'Estrategia de impacto y desarrollo de negocio en LATAM. Experiencia en ecosistemas de innovación y conexión con capital.',
    tags: ['Impact Strategy', 'Business Dev', 'LATAM Ecosystems'],
  },
  {
    photo: '/lorenzo.webp',
    name: 'Lorenzo Ortiz',
    role: 'Co-Founder & CTO',
    bio: 'Tecnología, producto y diseño de nuevos negocios. Background en finanzas avanzadas, desarrollo tech y escalamiento de startups.',
    tags: ['Product Dev', 'Ops & Tech', 'Startup Tools'],
  },
]

const partners = ['BID', 'MIT', 'SingularityU', 'ClimateKIC', 'Wyss Academy', 'Unión Europea', 'NESsT', 'CATAL1.5°T', 'Stanford University']

export default function AboutRedesignLab() {
  return (
    <section
      id="about"
      style={{
        position: 'relative',
        padding: 'clamp(5rem, 9vw, 7rem) 0',
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        className="orb orb-electric orb-sm"
        style={{ top: '20%', left: '-200px', opacity: 0.20 }}
        aria-hidden
      />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 clamp(1.25rem, 4vw, 3rem)',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '4rem',
        }}
      >
        <div
          className="about-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.4fr',
            gap: 'clamp(2rem, 5vw, 4rem)',
            alignItems: 'start',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="pill-electric" style={{ marginBottom: '1.25rem' }}>
              <span className="dot" /> Quiénes somos
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.9rem, 4vw, 3rem)',
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: 'var(--color-ink)',
                margin: '1rem 0 1.25rem',
              }}
            >
              Construido por{' '}
              <span className="text-ember">Redesign Lab</span>
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
                maxWidth: 460,
                margin: 0,
              }}
            >
              Construimos la infraestructura operativa que los founders necesitan para dejar de improvisar y enfocarse en lo que importa: crear soluciones que transformen la región.
            </p>
          </motion.div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {founders.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-card"
                style={{
                  padding: '1.75rem 1.25rem',
                  borderRadius: 18,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: 'none',
                  }}
                >
                  <Image
                    src={f.photo}
                    alt={f.name}
                    width={64}
                    height={64}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.05rem',
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                    marginBottom: '0.2rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {f.name}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#F0721D',
                    marginBottom: '0.75rem',
                  }}
                >
                  {f.role}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.82rem',
                    lineHeight: 1.55,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '1rem',
                  }}
                >
                  {f.bio}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center' }}>
                  {f.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        padding: '0.25rem 0.6rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: 999,
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Marquee partners */}
        <div
          style={{
            paddingTop: '2.5rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--color-text-muted)',
            }}
          >
            Alianzas que respaldan nuestra metodología
          </span>
          <div
            style={{
              width: '100%',
              overflow: 'hidden',
              maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '3.5rem',
                width: 'max-content',
                animation: 'marquee-scroll 40s linear infinite',
              }}
            >
              {[...partners, ...partners, ...partners].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.4rem',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    opacity: 0.5,
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        @media (max-width: 800px) {
          .about-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
