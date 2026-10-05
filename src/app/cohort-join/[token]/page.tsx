'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Building2, Calendar, Send, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Mode = 'loading' | 'invalid' | 'preview' | 'submitting' | 'success' | 'already_pending' | 'error' | 'no_startup'

interface CohortInfo {
  cohort_id: string
  cohort_name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  status: string
  org_id: string
  org_name: string
  org_logo: string | null
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString('es-419', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

export default function CohortJoinPage() {
  const params = useParams()
  const { user, openAuthModal } = useAuth()
  const token = params.token as string

  const [mode, setMode] = useState<Mode>('loading')
  const [cohort, setCohort] = useState<CohortInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // 1. Load cohort info via public RPC
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('lookup_cohort_by_share_token', { p_token: token })
      const payload = data as
        | { ok: true; cohort_id: string; cohort_name: string; description: string | null;
            start_date: string | null; end_date: string | null; status: string;
            org_id: string; org_name: string; org_logo: string | null }
        | { ok: false; error: string }
        | null

      if (error || !payload || !payload.ok) {
        setErrorMsg(
          (payload as { ok: false; error?: string } | null)?.error === 'cohort_not_open'
            ? 'Esta cohorte ya no está aceptando solicitudes.'
            : 'Este enlace no es válido o ha sido revocado.'
        )
        setMode('invalid')
        return
      }

      setCohort({
        cohort_id: payload.cohort_id,
        cohort_name: payload.cohort_name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: payload.status,
        org_id: payload.org_id,
        org_name: payload.org_name,
        org_logo: payload.org_logo,
      })
      setMode('preview')
    }
    load()
  }, [token])

  async function handleSubmit() {
    if (!user) {
      openAuthModal('register')
      return
    }
    setMode('submitting')
    const { data, error } = await supabase.rpc('submit_cohort_request_via_token', {
      p_token: token,
      p_message: message.trim() || null,
    })
    const payload = data as
      | { ok: true; request_id: string; status: string; reused: boolean }
      | { ok: false; error: string }
      | null

    if (error || !payload || !payload.ok) {
      const code = (payload as { ok: false; error?: string } | null)?.error
      if (code === 'no_startup') {
        setMode('no_startup')
        return
      }
      if (code === 'not_authenticated') {
        openAuthModal('register')
        setMode('preview')
        return
      }
      setErrorMsg('No se pudo enviar la solicitud. Intenta de nuevo.')
      setMode('error')
      return
    }

    setMode(payload.reused ? 'already_pending' : 'success')
  }

  // Auto-submit on mount if user is already logged in (and we know the cohort)
  // Only after explicit click. Don't auto-spam.

  if (mode === 'loading') {
    return (
      <div style={pageWrap}>
        <Loader2 size={32} color="var(--color-accent-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (mode === 'invalid' || mode === 'error') {
    return (
      <div style={pageWrap}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <XCircle size={48} color="#DC2626" style={{ marginBottom: 16 }} />
          <h1 style={titleStyle}>Enlace no válido</h1>
          <p style={subtitleStyle}>{errorMsg}</p>
          <Link href="/" style={ctaSecondary}>Ir al inicio</Link>
        </motion.div>
      </div>
    )
  }

  if (mode === 'no_startup') {
    return (
      <div style={pageWrap}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <Building2 size={40} color="var(--color-accent-primary)" style={{ marginBottom: 16 }} />
          <h1 style={titleStyle}>Completa tu startup primero</h1>
          <p style={subtitleStyle}>
            Para postular a <strong>{cohort?.cohort_name}</strong> necesitas tener registrada una startup en tu cuenta.
          </p>
          <Link href="/tools/completar-perfil" style={ctaPrimary}>
            Completar perfil <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    )
  }

  if (mode === 'success' || mode === 'already_pending') {
    return (
      <div style={pageWrap}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <CheckCircle size={48} color="#10B981" style={{ marginBottom: 16 }} />
          <h1 style={titleStyle}>
            {mode === 'already_pending' ? 'Tu solicitud ya está en revisión' : '¡Solicitud enviada!'}
          </h1>
          <p style={subtitleStyle}>
            {cohort?.org_name} revisará tu postulación a <strong>{cohort?.cohort_name}</strong>.
            Te notificarán por email cuando haya respuesta.
          </p>
          <Link href="/tools" style={ctaPrimary}>Ir a mi plataforma <ArrowRight size={16} /></Link>
        </motion.div>
      </div>
    )
  }

  // mode === 'preview' or 'submitting'
  return (
    <div style={pageWrap}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
        {cohort?.org_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cohort.org_logo} alt={cohort.org_name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', marginBottom: 12 }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(218,78,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Building2 size={28} color="var(--color-accent-primary)" />
          </div>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          {cohort?.org_name}
        </p>
        <h1 style={{ ...titleStyle, marginTop: 4 }}>{cohort?.cohort_name}</h1>

        {cohort?.description && (
          <p style={subtitleStyle}>{cohort.description}</p>
        )}

        {(cohort?.start_date || cohort?.end_date) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            <Calendar size={14} />
            <span>
              {[formatDate(cohort.start_date), formatDate(cohort.end_date)].filter(Boolean).join(' — ')}
            </span>
          </div>
        )}

        {!user && (
          <p style={{ ...subtitleStyle, color: 'var(--color-text-muted)', fontSize: 13 }}>
            Necesitas una cuenta para postular. Es gratis.
          </p>
        )}

        {user && (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="¿Algo que la organización deba saber sobre tu startup? (opcional)"
            rows={3}
            style={{
              width: '100%', padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)', color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)', fontSize: 13, resize: 'vertical',
              marginBottom: 16, outline: 'none',
            }}
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={mode === 'submitting'}
          style={{ ...ctaPrimary, width: '100%', justifyContent: 'center', cursor: mode === 'submitting' ? 'wait' : 'pointer', opacity: mode === 'submitting' ? 0.7 : 1 }}
        >
          {mode === 'submitting' ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              Enviando…
            </>
          ) : user ? (
            <>
              <Send size={16} /> Postular a esta cohorte
            </>
          ) : (
            <>
              Crear cuenta y postular <ArrowRight size={16} />
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}

const pageWrap: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  background: 'var(--color-bg-primary)',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  padding: '2rem',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  margin: '0 0 8px',
  lineHeight: 1.2,
}

const subtitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  color: 'var(--color-text-secondary)',
  margin: '0 0 16px',
  lineHeight: 1.5,
}

const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0.75rem 1.25rem',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-accent-primary)',
  color: '#fff',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
}

const ctaSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0.5rem 1rem',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'underline',
}
