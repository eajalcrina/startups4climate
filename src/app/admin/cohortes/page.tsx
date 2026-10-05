'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus,
  Users,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { loadCohorts, type CohortRow } from '@/lib/admin-data/cohorts'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Activa', color: '#1F77F6', bg: 'rgba(31,119,246,0.08)' },
  planned: { label: 'Planificada', color: '#1F77F6', bg: 'rgba(59,130,246,0.08)' },
  completed: { label: 'Completada', color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  archived: { label: 'Archivada', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
}

export default function CohortesPage() {
  const { appUser, isDemo } = useAuth()
  const pathname = usePathname()
  const adminBase = pathname.startsWith('/demo-admin') ? '/demo-admin' : '/admin'
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reset loading/error when the org/demo context changes (adjusted during render)
  const fetchKey = `${isDemo}|${appUser?.org_id ?? ''}`
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey)
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey)
    if (isDemo || appUser?.org_id) {
      setLoading(true)
      setError(null)
    }
  }

  useEffect(() => {
    // Wait until auth has settled (real users need an org_id; demo users don't)
    if (!isDemo && !appUser?.org_id) return

    let cancelled = false

    loadCohorts({ isDemo, orgId: appUser?.org_id })
      .then((rows) => {
        if (!cancelled) setCohorts(rows)
      })
      .catch((err) => {
        console.error('[S4C Admin] Error loading cohorts:', err)
        if (!cancelled) setError('No se pudieron cargar las cohortes. Intenta recargar la página.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [appUser?.org_id, isDemo])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <Loader2 size={28} color="#1D4ED8" style={{ animation: 'spin 1s linear infinite' }} />
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
          Error al cargar cohortes
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: 400,
        }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)',
            background: '#1D4ED8', color: '#fff',
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
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

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
            marginBottom: '0.25rem',
          }}>
            Cohortes
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            Gestiona los grupos de startups de tu programa
          </p>
        </div>
        <Link
          href={`${adminBase}/cohortes/nueva`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 8,
            background: '#1D4ED8', color: '#fff',
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
            textDecoration: 'none', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#3B82F6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1D4ED8')}
        >
          <Plus size={16} />
          Crear nueva cohorte
        </Link>
      </div>

      {/* Cohorts list */}
      {cohorts.length === 0 ? (
        <div style={{
          ...cardStyle,
          padding: '4rem 2rem',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--color-bg-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <Users size={24} color="var(--color-text-muted)" />
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
            fontWeight: 600, color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
          }}>
            Aún no has creado ninguna cohorte
          </p>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)', marginBottom: '1.5rem',
            maxWidth: 400,
          }}>
            Crea tu primera cohorte para comenzar a agrupar y dar seguimiento a las startups de tu programa.
          </p>
          <Link
            href={`${adminBase}/cohortes/nueva`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: 8,
              background: '#1D4ED8', color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Plus size={16} />
            Crear primera cohorte
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cohorts.map((cohort, i) => {
            const status = STATUS_CONFIG[cohort.status] || STATUS_CONFIG.planned
            return (
              <Link
                key={cohort.id}
                href={`${adminBase}/cohortes/${cohort.id}`}
                style={{ textDecoration: 'none' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  style={{
                    ...cardStyle,
                    padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem', cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      marginBottom: '0.5rem', flexWrap: 'wrap',
                    }}>
                      <h3 style={{
                        fontFamily: 'var(--font-heading)', fontWeight: 600,
                        fontSize: 'var(--text-base)', color: 'var(--color-text-primary)',
                      }}>
                        {cohort.name}
                      </h3>
                      <span style={{
                        padding: '0.125rem 0.625rem', borderRadius: 'var(--radius-xl)',
                        background: status.bg, color: status.color,
                        fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                        fontWeight: 500,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '1.25rem',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                      }}>
                        <Users size={14} color="var(--color-text-muted)" />
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-secondary)',
                        }}>
                          {cohort.startup_count} startups
                        </span>
                      </div>
                      {cohort.start_date && cohort.end_date && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                        }}>
                          <Calendar size={14} color="var(--color-text-muted)" />
                          <span style={{
                            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)',
                          }}>
                            {new Date(cohort.start_date).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
                            {' - '}
                            {new Date(cohort.end_date).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--color-text-muted)" />
                </motion.div>
              </Link>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
