'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, Users, TrendingUp, BarChart3,
  Plus, FileText, ChevronRight, Rocket,
  GraduationCap, Calendar, Download
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui'
import {
  DEMO_ORG, DEMO_VERTICAL_DISTRIBUTION, DEMO_STAGE_DISTRIBUTION,
} from '@/lib/demo/admin-fixtures'
import {
  loadDashboard,
  type DashboardCohortRow as CohortRow,
  type DashboardStartupRow as StartupRow,
  type DashboardMetrics as OrgMetrics,
} from '@/lib/admin-data/dashboard'

// Card styling handled by <Card> component from @/components/ui

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(31,119,246,0.1)', text: '#1F77F6' },
  planned: { bg: 'rgba(59,130,246,0.1)', text: '#1F77F6' },
  completed: { bg: 'rgba(107,114,128,0.1)', text: '#6B7280' },
}

export default function AdminDashboard() {
  return <AdminOrgDashboard />
}

function AdminOrgDashboard() {
  const { appUser, isDemo } = useAuth()
  const pathname = usePathname()
  const adminBase = pathname.startsWith('/demo-admin') ? '/demo-admin' : '/admin'
  const [metrics, setMetrics] = useState<OrgMetrics>({
    totalStartups: 0,
    activeCohorts: 0,
    avgScore: 0,
    avgToolsCompleted: 0,
  })
  const [startups, setStartups] = useState<StartupRow[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  // Real users without an org have nothing to load
  const canLoad = isDemo || !!appUser?.org_id
  const [loading, setLoading] = useState(canLoad)
  const [error, setError] = useState<string | null>(null)
  const [orgLogo, setOrgLogo] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)

  // Reset loading/error whenever the auth context changes (adjusted during
  // render, not in the effect). No org yet (real user) → nothing to load.
  const [prevDeps, setPrevDeps] = useState({ appUser, isDemo })
  if (prevDeps.appUser !== appUser || prevDeps.isDemo !== isDemo) {
    setPrevDeps({ appUser, isDemo })
    setLoading(canLoad)
    if (canLoad) setError(null)
  }

  useEffect(() => {
    if (!canLoad) return

    let cancelled = false

    loadDashboard({ isDemo, orgId: appUser?.org_id })
      .then((data) => {
        if (cancelled) return
        setOrgName(data.orgName)
        setOrgLogo(data.orgLogo)
        setCohorts(data.cohorts)
        setStartups(data.startups)
        setMetrics(data.metrics)
      })
      .catch((err) => {
        console.error('[S4C Admin] Error loading dashboard:', err)
        if (!cancelled) setError('No se pudieron cargar los datos. Intenta recargar la página.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [appUser, isDemo, canLoad])

  const METRIC_CARDS = [
    {
      label: 'Total startups',
      value: metrics.totalStartups,
      icon: Rocket,
      color: '#1F77F6',
      bg: 'rgba(31,119,246,0.08)',
    },
    {
      label: 'Cohortes activas',
      value: metrics.activeCohorts,
      icon: GraduationCap,
      color: '#1F77F6',
      bg: 'rgba(59,130,246,0.08)',
    },
    {
      label: 'Score promedio',
      value: metrics.avgScore,
      icon: TrendingUp,
      color: '#2A222B',
      bg: 'rgba(42,34,43,0.08)',
    },
    {
      label: 'Herramientas promedio',
      value: metrics.avgToolsCompleted,
      icon: BarChart3,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.08)',
    },
  ]

  const QUICK_ACTIONS = [
    {
      label: 'Crear cohorte',
      href: '/admin/cohortes/nueva',
      icon: Plus,
      color: '#1F77F6',
    },
    {
      label: 'Generar reporte',
      href: '/admin/reportes',
      icon: FileText,
      color: '#1F77F6',
    },
    {
      label: 'Descargar datos',
      href: '/admin/reportes',
      icon: Download,
      color: '#8B5CF6',
    },
  ]

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 32,
            height: 32,
            border: '3px solid var(--color-border)',
            borderTopColor: '#1F77F6',
            borderRadius: '50%',
          }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#FEF2F2', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: '1rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠</span>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
          fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem',
        }}>
          Error al cargar el dashboard
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: 400,
        }}>
          {error}
        </p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload() }}
          style={{
            padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent-primary)', color: '#fff',
            border: 'none', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
    >
      {isDemo && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 999,
            background: 'var(--color-warning-light)',
            border: '1px solid var(--color-warning-border)',
            color: 'var(--color-warning)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            marginBottom: '1rem',
          }}
        >
          Modo demo — los datos son ilustrativos
        </div>
      )}

      {/* Welcome header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          {orgLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- org logo is an arbitrary admin-provided URL (no next/image remotePatterns)
            <img
              src={orgLogo}
              alt={orgName || ''}
              style={{
                width: 44, height: 44, borderRadius: 10,
                objectFit: 'contain', background: '#fff',
                border: '1px solid var(--color-border)',
                flexShrink: 0,
              }}
            />
          ) : (
            <Building2 size={20} color="#1F77F6" />
          )}
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 'var(--text-xl)',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              {appUser?.full_name
                ? `Bienvenido, ${appUser.full_name}`
                : 'Dashboard'}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {orgName || 'Resumen general de tu programa de incubación'}
            </p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {METRIC_CARDS.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
            >
              <Card padding="none" style={{ padding: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      background: m.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color={m.color} />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1,
                    marginBottom: '0.25rem',
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {m.label}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Demo-only enriched insights */}
      {isDemo && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.18 }}
          style={{ marginBottom: '1.5rem' }}
        >
          <Card padding="none" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'grid', gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              marginBottom: '1.25rem',
            }}>
              {[
                { label: 'Financiamiento gestionado', value: 'USD 1.2M', bg: 'rgba(218,78,36,0.08)', color: '#DA4E24' },
                { label: 'Tools completion rate', value: `${DEMO_ORG.toolsCompletionRate}%`, bg: 'rgba(31,119,246,0.08)', color: '#1F77F6' },
                { label: 'NPS promedio', value: DEMO_ORG.averageNps, bg: 'rgba(59,130,246,0.08)', color: '#1F77F6' },
                { label: 'Mentores activos', value: DEMO_ORG.mentors, bg: 'rgba(139,92,246,0.08)', color: '#8B5CF6' },
              ].map((k) => (
                <div key={k.label} style={{
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
                  background: k.bg,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: '1.3rem', color: 'var(--color-text-primary)',
                    lineHeight: 1.1, marginBottom: '0.2rem',
                  }}>
                    {k.value}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.66rem',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {k.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid', gap: '1.25rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}>
              <div>
                <h4 style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                  fontWeight: 700, color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: '0.55rem',
                }}>
                  Distribución por vertical
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {DEMO_VERTICAL_DISTRIBUTION.map((v) => {
                    const total = DEMO_VERTICAL_DISTRIBUTION.reduce((s, x) => s + x.count, 0)
                    const pct = (v.count / total) * 100
                    return (
                      <div key={v.key}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                          color: 'var(--color-text-primary)',
                          marginBottom: '0.2rem',
                        }}>
                          <span>{v.label}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{v.count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-muted)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: v.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h4 style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                  fontWeight: 700, color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: '0.55rem',
                }}>
                  Distribución por etapa
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {DEMO_STAGE_DISTRIBUTION.map((s) => {
                    const total = DEMO_STAGE_DISTRIBUTION.reduce((sum, x) => sum + x.count, 0)
                    const pct = (s.count / total) * 100
                    return (
                      <div key={s.key}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                          color: 'var(--color-text-primary)',
                          marginBottom: '0.2rem',
                        }}>
                          <span>{s.label}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{s.count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-muted)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Cohorts section */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.25 }}
        style={{ marginBottom: '1.5rem' }}
      >
        <Card padding="none" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GraduationCap size={18} color="var(--color-text-muted)" />
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: 'var(--text-md)',
                color: 'var(--color-text-primary)',
              }}
            >
              Cohortes
            </h3>
          </div>
          <Link
            href={`${adminBase}/cohortes/nueva`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: '#1F77F6',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <Plus size={14} />
            Nueva cohorte
          </Link>
        </div>

        {cohorts.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 140,
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--color-bg-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <GraduationCap size={20} color="var(--color-text-muted)" />
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                marginBottom: '0.25rem',
              }}
            >
              No hay cohortes aún
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-2xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              Crea tu primera cohorte para comenzar a organizar startups
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cohorts.map((cohort) => {
              const statusStyle = STATUS_COLORS[cohort.status] || STATUS_COLORS.planned
              return (
                <div
                  key={cohort.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        fontSize: 'var(--text-base)',
                        color: 'var(--color-text-primary)',
                        marginBottom: '0.125rem',
                      }}
                    >
                      {cohort.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={12} />
                        {cohort.startup_count} startups
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {cohort.start_date
                          ? new Date(cohort.start_date).toLocaleDateString('es-CL', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Sin fecha'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: 999,
                        fontSize: 'var(--text-xs)',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 500,
                        background: statusStyle.bg,
                        color: statusStyle.text,
                      }}
                    >
                      {cohort.status === 'active'
                        ? 'Activa'
                        : cohort.status === 'planned'
                          ? 'Planificada'
                          : 'Completada'}
                    </span>
                    <ChevronRight size={16} color="var(--color-text-muted)" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </Card>
      </motion.div>

      {/* Startups table */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.3 }}
        style={{ marginBottom: '1.5rem' }}
      >
        <Card padding="none" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Rocket size={18} color="var(--color-text-muted)" />
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: 'var(--text-md)',
                color: 'var(--color-text-primary)',
              }}
            >
              Startups
            </h3>
          </div>
          {startups.length > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-2xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {startups.length} registrada{startups.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {startups.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 140,
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--color-bg-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <Rocket size={20} color="var(--color-text-muted)" />
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                marginBottom: '0.25rem',
              }}
            >
              No hay startups registradas aún
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-2xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              Las startups aparecerán aquí cuando se unan a una cohorte
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <thead>
                <tr>
                  {['Startup', 'Fundador/a', 'Vertical', 'Etapa', 'Score', 'Herramientas'].map(
                    (header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: 'left',
                          padding: '0.625rem 0.75rem',
                          borderBottom: '1px solid var(--color-border)',
                          fontWeight: 600,
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--text-xs)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {startups.map((startup) => (
                  <tr
                    key={startup.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td
                      style={{
                        padding: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(31,119,246,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 'var(--text-2xs)',
                            fontWeight: 700,
                            color: '#1F77F6',
                          }}
                        >
                          {startup.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        {startup.name}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {startup.founder_name}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {startup.vertical || '-'}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          padding: '0.1875rem 0.5rem',
                          borderRadius: 999,
                          fontSize: 'var(--text-xs)',
                          fontWeight: 500,
                          background: 'rgba(31,119,246,0.08)',
                          color: '#1F77F6',
                        }}
                      >
                        {startup.stage || 'Sin etapa'}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--color-text-primary)',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {startup.diagnostic_score != null
                        ? startup.diagnostic_score.toFixed(1)
                        : '-'}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--color-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {startup.tools_completed != null
                        ? startup.tools_completed
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.35 }}
      >
        <Card padding="none" style={{ padding: '1.5rem' }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: 'var(--text-md)',
              color: 'var(--color-text-primary)',
              marginBottom: '1rem',
            }}
          >
            Acciones rápidas
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = action.color
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${action.color}22`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Icon size={16} color={action.color} />
                  {action.label}
                </Link>
              )
            })}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
