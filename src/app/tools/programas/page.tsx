'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  Send,
  Users,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface CohortWithOrg {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  access_mode: string
  status: string
  org_id: string
  organizations: { name: string } | null
}

interface CohortRequest {
  id: string
  cohort_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  cohorts: { id: string; name: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#F0721D', bg: 'rgba(240,114,29,0.08)' },
  approved: { label: 'Aprobada', color: '#1F77F6', bg: 'rgba(31,119,246,0.08)' },
  rejected: { label: 'Rechazada', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
}

export default function ProgramasPage() {
  const { user, appUser } = useAuth()
  const [cohorts, setCohorts] = useState<CohortWithOrg[]>([])
  const [myRequests, setMyRequests] = useState<CohortRequest[]>([])
  const [orgName, setOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // Load open, active cohorts
      const { data: cohortData } = await supabase
        .from('cohorts')
        .select('id, name, description, start_date, end_date, access_mode, status, org_id, organizations(name)')
        .eq('access_mode', 'open')
        .eq('status', 'active')
        .order('start_date', { ascending: true })

      const mapped = (cohortData || []).map((c) => ({
        ...c,
        organizations: Array.isArray(c.organizations) ? c.organizations[0] : c.organizations,
      }))
      setCohorts(mapped as CohortWithOrg[])

      // Load founder's existing requests (skip for demo users — no Supabase session)
      if (UUID_RE.test(user.id)) {
        const res = await fetch('/api/cohort-requests')
        if (res.ok) {
          const data = await res.json()
          setMyRequests(data.requests || [])
        }
      }

      // If founder has org, load org name
      if (appUser?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', appUser.org_id)
          .maybeSingle()
        if (org?.name) setOrgName(org.name)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user, appUser?.org_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRequest = async (cohortId: string) => {
    if (!user || !UUID_RE.test(user.id)) {
      setError('Crea una cuenta real para solicitar acceso a programas.')
      return
    }
    setSubmitting(cohortId)
    setError(null)
    try {
      const res = await fetch('/api/cohort-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort_id: cohortId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al enviar solicitud')
        setSubmitting(null)
        return
      }
      setSuccessId(cohortId)
      setSubmitting(null)
      // Refresh requests (safe — handleRequest guard already ensures real user)
      const res2 = await fetch('/api/cohort-requests')
      if (res2.ok) {
        const data2 = await res2.json()
        setMyRequests(data2.requests || [])
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setSubmitting(null)
    }
  }

  const requestedCohortIds = new Set(myRequests.map((r) => r.cohort_id))

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('es-419', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2
          size={28}
          color="var(--color-text-muted)"
          style={{ animation: 'spin 1s linear infinite' }}
        />

      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/tools"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            textDecoration: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            marginBottom: '1rem',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={14} />
          Volver al dashboard
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '0.5rem',
          }}
        >
          Programas disponibles
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          Explora las cohortes abiertas de incubadoras y programas de innovación.
          Solicita tu ingreso y lleva tu startup al siguiente nivel.
        </p>
      </div>

      {/* Already belongs to org */}
      {appUser?.org_id && orgName && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 12,
            background: 'rgba(31,119,246,0.06)',
            border: '1px solid rgba(31,119,246,0.15)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle2 size={18} color="#1F77F6" style={{ flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: '0.125rem',
              }}
            >
              Ya perteneces a {orgName}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Tu startup está vinculada a este programa. Puedes explorar otras cohortes abiertas a continuación.
            </div>
          </div>
        </motion.div>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 10,
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.15)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: '#DC2626',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cohort cards */}
      {cohorts.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            borderRadius: 16,
            background: 'var(--color-paper)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <Users size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.25rem',
            }}
          >
            No hay programas abiertos en este momento
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Vuelve a revisar pronto, las organizaciones abren nuevas cohortes frecuentemente.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {cohorts.map((cohort, i) => {
            const alreadyRequested = requestedCohortIds.has(cohort.id)
            const justSucceeded = successId === cohort.id
            const isSubmitting = submitting === cohort.id
            const orgLabel = cohort.organizations?.name || 'Programa'

            return (
              <motion.div
                key={cohort.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: 14,
                  background: 'var(--color-paper)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {/* Org badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.1875rem 0.5rem',
                        borderRadius: 6,
                        background: 'rgba(31,119,246,0.06)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <Building2 size={10} color="#1F77F6" />
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: '#1F77F6',
                        }}
                      >
                        {orgLabel}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.02em',
                        marginBottom: '0.375rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {cohort.name}
                    </h3>

                    {cohort.description && (
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.5,
                          marginBottom: '0.75rem',
                          maxWidth: 440,
                        }}
                      >
                        {cohort.description}
                      </p>
                    )}

                    {/* Dates */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {cohort.start_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} color="var(--color-text-muted)" />
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.75rem',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            Inicio: {formatDate(cohort.start_date)}
                          </span>
                        </div>
                      )}
                      {cohort.end_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} color="var(--color-text-muted)" />
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.75rem',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            Fin: {formatDate(cohort.end_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {justSucceeded ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.5rem 1rem',
                          borderRadius: 8,
                          background: 'rgba(31,119,246,0.08)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#1F77F6',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Solicitud enviada
                      </div>
                    ) : alreadyRequested ? (
                      <div
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: 8,
                          background: 'rgba(240,114,29,0.08)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          color: '#F0721D',
                        }}
                      >
                        Solicitud enviada
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequest(cohort.id)}
                        disabled={isSubmitting}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.5rem 1.125rem',
                          borderRadius: 8,
                          background: 'var(--color-accent-primary)',
                          border: 'none',
                          color: '#fff',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.7 : 1,
                          transition: 'background 0.15s, transform 0.15s',
                          letterSpacing: '-0.01em',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubmitting) e.currentTarget.style.background = 'var(--color-accent-hover)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubmitting) e.currentTarget.style.background = 'var(--color-accent-primary)'
                        }}
                      >
                        {isSubmitting ? (
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Send size={13} />
                        )}
                        Solicitar ingreso
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* My requests section */}
      {myRequests.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              marginBottom: '0.875rem',
            }}
          >
            Mis solicitudes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {myRequests.map((req) => {
              const status = STATUS_LABELS[req.status] || STATUS_LABELS.pending
              return (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: 'var(--color-paper)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        marginBottom: '0.125rem',
                      }}
                    >
                      {req.cohorts?.name || 'Cohorte'}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Solicitado el {formatDate(req.created_at)}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: 6,
                      background: status.bg,
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: status.color,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
