'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface InvitationData {
  id: string
  org_id: string
  cohort_id: string | null
  email: string
  status: string
  expires_at: string
  invitation_type: string | null
  org_name?: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9375rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { appUser, login, register } = useAuth()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'check' | 'register' | 'login' | 'accepting' | 'done' | 'error'>('check')

  // Register form
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [startupName, setStartupName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load invitation
  useEffect(() => {
    async function loadInvitation() {
      setLoading(true)

      // Server-side lookup via SECURITY DEFINER RPC (works for anon too)
      const { data: rpcData, error: fetchError } = await supabase
        .rpc('lookup_invitation', { p_token: token })

      const payload = rpcData as {
        ok: boolean
        error?: string
        email?: string
        status?: string
        expires_at?: string
        invitation_type?: string
        org_id?: string
        cohort_id?: string | null
        org_name?: string
      } | null

      if (fetchError || !payload || !payload.ok) {
        setError('Invitación no encontrada o enlace inválido.')
        setMode('error')
        setLoading(false)
        return
      }

      if (payload.status !== 'pending') {
        setError('Esta invitación ya fue utilizada o revocada.')
        setMode('error')
        setLoading(false)
        return
      }

      if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
        setError('Esta invitación ha expirado.')
        setMode('error')
        setLoading(false)
        return
      }

      setInvitation({
        id: '', // not exposed; not needed client-side
        org_id: payload.org_id!,
        cohort_id: payload.cohort_id ?? null,
        email: payload.email!,
        status: payload.status!,
        expires_at: payload.expires_at!,
        invitation_type: payload.invitation_type ?? null,
        org_name: payload.org_name,
      })
      setLoading(false)
    }

    loadInvitation()
  }, [token])

  const isAdminOrgInvite = invitation?.invitation_type === 'admin_org'

  // The RPC resolves the user from the session; no user id is needed here.
  const acceptInvitation = useCallback(async () => {
    if (!invitation) return
    setMode('accepting')

    // All validation + profile update + cohort link + invitation mark
    // happens atomically server-side via SECURITY DEFINER RPC.
    const { data, error: rpcErr } = await supabase.rpc('accept_invitation', { p_token: token })
    const payload = data as { ok: boolean; error?: string; invitation_type?: string } | null

    if (rpcErr || !payload || !payload.ok) {
      console.error('[S4C Sync] accept_invitation failed:', rpcErr || payload?.error)
      setError('No se pudo aceptar la invitación. ' + (payload?.error || 'Intenta de nuevo.'))
      setMode('error')
      return
    }

    setMode('done')
    setTimeout(() => router.push(isAdminOrgInvite ? '/admin' : '/tools'), 2000)
  }, [invitation, token, router, isAdminOrgInvite])

  // If user is already logged in, try to accept automatically
  useEffect(() => {
    if (!appUser || !invitation || mode !== 'check') return

    if (appUser.email.toLowerCase() === invitation.email.toLowerCase()) {
      acceptInvitation()
    } else {
      setMode('register')
    }
    // `mode` is only a guard: auto-accept must fire on auth/invitation changes, not on mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser, invitation])

  // If invitation loaded and no user, show register form
  useEffect(() => {
    if (!loading && invitation && !appUser && mode === 'check') {
      setMode('register')
    }
  }, [loading, invitation, appUser, mode])


  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation || !fullName.trim() || !password) return

    setSubmitting(true)
    setError(null)

    try {
      const defaultStartup = isAdminOrgInvite ? '' : (startupName.trim() || 'Mi Startup')
      await register(invitation.email, password, fullName.trim(), defaultStartup)

      // Wait for auth to settle
      await new Promise((r) => setTimeout(r, 1500))

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Error al crear la cuenta. Intenta de nuevo.')
        setSubmitting(false)
        return
      }

      // Create startup row only for founder invitations
      if (!isAdminOrgInvite && startupName.trim()) {
        const { error: startupErr } = await supabase.from('startups').upsert({
          founder_id: user.id,
          name: startupName.trim(),
          vertical: 'impact',
          country: 'PE',
        }, { onConflict: 'founder_id' })
        if (startupErr) console.error('[S4C Sync] invite startup upsert failed:', startupErr)
      }

      await acceptInvitation()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse.')
      setSubmitting(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation || !password) return

    setSubmitting(true)
    setError(null)

    try {
      await login(invitation.email, password)
      await new Promise((r) => setTimeout(r, 1000))
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await acceptInvitation()
      } else {
        setError('Error al iniciar sesión.')
        setSubmitting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg-primary)',
      }}>
        <Loader2 size={32} color="var(--color-accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />

      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg-primary)', padding: '2rem 1rem',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: 440, width: '100%',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: '1.375rem', color: 'var(--color-text-primary)',
          }}>
            Startups4Climate
          </h1>
        </div>

        {mode === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={48} color="#DC2626" style={{ marginBottom: '1rem' }} />
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: '0.5rem',
            }}>
              Invitación no válida
            </p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}>
              {error}
            </p>
          </div>
        )}

        {mode === 'accepting' && (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={40} color="var(--color-accent-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              color: 'var(--color-text-primary)',
            }}>
              Aceptando invitación...
            </p>
          </div>
        )}

        {mode === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color="#1F77F6" style={{ marginBottom: '1rem' }} />
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: '0.5rem',
            }}>
              ¡Te has unido a {invitation?.org_name}!
            </p>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}>
              Redirigiendo a la plataforma...
            </p>
          </div>
        )}

        {mode === 'register' && invitation && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <Mail size={32} color="var(--color-accent-primary)" style={{ marginBottom: '0.75rem' }} />
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '1rem',
                color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: '0.25rem',
              }}>
                {isAdminOrgInvite
                  ? `Te invitaron como administrador de ${invitation.org_name}`
                  : `Te invitaron a ${invitation.org_name}`}
              </p>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                color: 'var(--color-text-muted)',
              }}>
                {invitation.email}
              </p>
            </div>

            {error && (
              <div style={{
                padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.375rem' }}>
                  Tu nombre completo *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="María García"
                  required
                  style={inputStyle}
                />
              </div>
              {!isAdminOrgInvite && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.375rem' }}>
                    Nombre de tu startup
                  </label>
                  <input
                    type="text"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="EcoTech Solutions"
                    style={inputStyle}
                  />
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.375rem' }}>
                  Contraseña *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-accent-primary)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Creando cuenta...' : 'Crear cuenta y unirme'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => setMode('login')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                  color: 'var(--color-accent-primary)', textDecoration: 'underline',
                }}
              >
                Ya tengo cuenta, iniciar sesión
              </button>
            </div>
          </>
        )}

        {mode === 'login' && invitation && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '1rem',
                color: 'var(--color-text-primary)', fontWeight: 500,
              }}>
                Iniciar sesión
              </p>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                color: 'var(--color-text-muted)',
              }}>
                {invitation.email}
              </p>
            </div>

            {error && (
              <div style={{
                padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.375rem' }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-accent-primary)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Entrando...' : 'Iniciar sesión y unirme'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => { setMode('register'); setError(null) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                  color: 'var(--color-accent-primary)', textDecoration: 'underline',
                }}
              >
                No tengo cuenta, registrarme
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
