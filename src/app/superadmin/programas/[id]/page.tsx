'use client'

import { use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Building2, CheckCircle2, Circle,
  Users, Leaf, Heart, TrendingUp, Briefcase,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getProgramById, formatUSD, programLeverage,
} from '@/lib/demo/superadmin-fixtures'

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

export default function ProgramaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { appUser } = useAuth()
  const program = getProgramById(id)

  if (!appUser) return null
  if (appUser.role !== 'superadmin') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', fontFamily: 'var(--font-body)',
        color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)',
      }}>
        Acceso restringido a Superadmin (MINPRO).
      </div>
    )
  }

  if (!program) {
    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: 800, margin: '0 auto' }}>
        <Link href="/superadmin/programas" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'var(--font-body)', fontSize: '0.85rem',
          color: '#DA4E24', textDecoration: 'none', marginBottom: '1rem',
        }}>
          <ArrowLeft size={16} /> Volver a programas
        </Link>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.95rem',
          color: 'var(--color-text-secondary)',
        }}>
          Programa no encontrado.
        </p>
      </div>
    )
  }

  const leverage = programLeverage(program)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
    >
      <Link href="/superadmin/programas" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        fontFamily: 'var(--font-body)', fontSize: '0.78rem',
        color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: '1rem',
      }}>
        <ArrowLeft size={14} /> Programas
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
          <Briefcase size={20} color="#DA4E24" />
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
            margin: 0,
          }}>
            {program.name}
          </h1>
          <StatusPill status={program.status} />
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.88rem',
          color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5,
        }}>
          {program.description}
        </p>
      </div>

      {/* Info bar */}
      <div style={{
        display: 'grid', gap: '0.65rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        marginBottom: '1.5rem',
      }}>
        <InfoItem icon={Building2} label="Org. ejecutora" value={program.executingOrg} />
        <InfoItem icon={MapPin} label="Región" value={program.region} />
        <InfoItem icon={Briefcase} label="Vertical" value={program.vertical} />
        <InfoItem
          icon={Calendar}
          label="Vigencia"
          value={`${new Date(program.startDate).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })} → ${new Date(program.endDate).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}`}
        />
      </div>

      {/* Platform KPIs */}
      <motion.div {...fadeUp} style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={18} color="var(--color-text-muted)" />
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            margin: 0,
          }}>
            KPIs de plataforma
          </h3>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.75rem', marginBottom: '1rem',
        }}>
          <Kpi label="Startups activas" value={program.startupsCount.toString()} color="#DA4E24" />
          <Kpi label="Tools completion" value={`${program.toolsCompletionPct}%`} color="#1F77F6" />
          <Kpi label="Retención founders" value={`${program.retentionRate}%`} color="#1F77F6" />
          <Kpi label="Funding levantado" value={formatUSD(program.fundingRaisedUSD)} color="#8B5CF6" />
          <Kpi label="MRR agregado" value={formatUSD(program.mrrAggregateUSD)} color="#16A34A" />
          <Kpi label="Funding / startup" value={formatUSD(leverage)} color="#EC4899" />
        </div>

        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: '0.35rem',
            fontFamily: 'var(--font-body)', fontSize: '0.78rem',
            color: 'var(--color-text-secondary)',
          }}>
            <span>Tools completion · founders del programa</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{program.toolsCompletionPct}%</span>
          </div>
          <div style={{
            height: 14, borderRadius: 7, background: 'var(--color-bg-muted)',
            overflow: 'hidden', position: 'relative',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${program.toolsCompletionPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 7,
                background: program.toolsCompletionPct >= 60 ? '#1F77F6' : '#F59E0B',
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Two columns: timeline + impact */}
      <div style={{
        display: 'grid', gap: '1rem',
        gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
        marginBottom: '1.5rem',
      }} className="prog-twocol">
        {/* Timeline */}
        <motion.div {...fadeUp} style={cardStyle}>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            marginBottom: '1rem',
          }}>
            Hitos del programa
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {program.milestones.map((m, i) => {
              const Icon = m.status === 'done' ? CheckCircle2 : Circle
              const color = m.status === 'done' ? '#1F77F6' : 'var(--color-text-muted)'
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)',
                  background: m.status === 'done' ? 'rgba(31,119,246,0.06)' : 'var(--color-bg-muted)',
                }}>
                  <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                      fontWeight: 600, color: 'var(--color-text-primary)',
                      marginBottom: '0.15rem',
                    }}>
                      {m.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                      color: 'var(--color-text-secondary)',
                    }}>
                      {new Date(m.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Impact */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} style={cardStyle}>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            marginBottom: '1rem',
          }}>
            Reporte de impacto
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <ImpactRow icon={Users} label="Empleos generados" value={program.jobsGenerated.toString()} color="#1F77F6" />
            <ImpactRow icon={Leaf} label="CO₂ evitado (tCO₂eq)" value={program.co2Avoided.toString()} color="#16A34A" />
            <ImpactRow icon={Heart} label="Mujeres founders" value={`${program.womenFoundersPct}%`} color="#EC4899" />
            <ImpactRow icon={MapPin} label="Founders rurales" value={`${program.ruralFoundersPct}%`} color="#F59E0B" />
            <ImpactRow icon={TrendingUp} label="Readiness avg" value={`${program.readinessAvg} / 100`} color="#1F77F6" />
          </div>
        </motion.div>
      </div>

      {/* Beneficiarias */}
      <motion.div {...fadeUp} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            margin: 0, marginBottom: '0.25rem',
          }}>
            Startups beneficiarias destacadas
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.78rem',
            color: 'var(--color-text-secondary)', margin: 0,
          }}>
            Top performers del programa con KPIs de tracción.
          </p>
        </div>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontFamily: 'var(--font-body)', fontSize: '0.8rem',
        }}>
          <thead>
            <tr>
              {['Startup', 'Vertical', 'Readiness', 'MRR (USD)'].map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '0.65rem 1.5rem',
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                  fontWeight: 600, color: 'var(--color-text-secondary)',
                  fontSize: '0.66rem', textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'var(--color-bg-muted)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {program.beneficiaries.map((b) => (
              <tr key={b.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{
                  padding: '0.7rem 1.5rem', fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}>
                  {b.name}
                </td>
                <td style={{ padding: '0.7rem 1.5rem', color: 'var(--color-text-secondary)' }}>
                  {b.vertical}
                </td>
                <td style={{ padding: '0.7rem 1.5rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {b.readiness}
                </td>
                <td style={{ padding: '0.7rem 1.5rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {b.mrrUSD > 0 ? formatUSD(b.mrrUSD) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <style jsx>{`
        @media (max-width: 880px) {
          :global(.prog-twocol) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </motion.div>
  )
}

function StatusPill({ status }: { status: 'active' | 'completed' | 'planned' | 'at_risk' }) {
  const map = {
    active: { label: 'Activo', bg: 'rgba(31,119,246,0.12)', color: '#1F77F6' },
    completed: { label: 'Completado', bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
    planned: { label: 'Planificado', bg: 'rgba(59,130,246,0.12)', color: '#1F77F6' },
    at_risk: { label: 'En riesgo', bg: 'rgba(218,78,36,0.12)', color: '#DA4E24' },
  }
  const s = map[status]
  return (
    <span style={{
      padding: '0.18rem 0.55rem', borderRadius: 999,
      fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function InfoItem({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
}) {
  return (
    <div style={{
      ...cardStyle, padding: '0.85rem 1rem',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        marginBottom: '0.3rem',
      }}>
        <Icon size={14} color="var(--color-text-muted)" />
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.66rem',
          fontWeight: 600, color: 'var(--color-text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '0.85rem',
        fontWeight: 600, color: 'var(--color-text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
      background: `${color}10`, border: `1px solid ${color}33`,
    }}>
      <div style={{
        fontFamily: 'var(--font-heading)', fontWeight: 700,
        fontSize: '1.2rem', color: 'var(--color-text-primary)',
        lineHeight: 1.1, marginBottom: '0.2rem',
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '0.66rem',
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </div>
    </div>
  )
}

function ImpactRow({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  color: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)',
      background: `${color}0F`,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={15} color={color} />
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.8rem',
          color: 'var(--color-text-primary)',
        }}>
          {label}
        </span>
      </span>
      <span style={{
        fontFamily: 'var(--font-heading)', fontWeight: 700,
        fontSize: '0.95rem', color: 'var(--color-text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  )
}
