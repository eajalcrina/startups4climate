'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Eye, EyeOff, Lock, User, Building2, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { normalizeLoginIdentifier } from '@/lib/auth-identifier'

export default function AuthModal() {
  const router = useRouter()
  const { authModalOpen, authModalMode, closeAuthModal, login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(authModalMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', startup: '' })

  // Reset the form each time the modal opens (or its mode changes while open).
  // State is adjusted during render instead of in an effect.
  const [prevOpenState, setPrevOpenState] = useState({ authModalOpen, authModalMode })
  if (prevOpenState.authModalOpen !== authModalOpen || prevOpenState.authModalMode !== authModalMode) {
    setPrevOpenState({ authModalOpen, authModalMode })
    if (authModalOpen) {
      setMode(authModalMode)
      setError('')
      setSuccess(false)
      setResetSent(false)
      setForm({ email: '', password: '', name: '', startup: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'reset') {
      if (!form.email) {
        setError('Por favor ingresa tu usuario o email.')
        return
      }
      setLoading(true)
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          normalizeLoginIdentifier(form.email),
          { redirectTo: window.location.origin + '/auth/callback?type=recovery' },
        )
        if (resetError) {
          setError(resetError.message)
        } else {
          setResetSent(true)
        }
      } catch {
        setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
      }
      setLoading(false)
      return
    }

    if (!form.email || !form.password) {
      setError('Por favor completa todos los campos requeridos.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (mode === 'register' && (!form.name || !form.startup)) {
      setError('Por favor completa todos los campos.')
      return
    }

    setLoading(true)
    let result: { error?: string; role?: string }
    try {
      result =
        mode === 'login'
          ? await login(normalizeLoginIdentifier(form.email), form.password)
          : await register(form.email, form.password, form.name, form.startup)
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
      setLoading(false)
      return
    }
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      const isOrgAdmin = result.role === 'admin_org' || result.role === 'superadmin'
      // Use client-side navigation to preserve in-memory auth session.
      // Admin uses window.location.href because middleware still protects /admin.
      setTimeout(() => {
        closeAuthModal()
        setSuccess(false)
        if (isOrgAdmin) {
          router.push('/admin')
        } else if (mode === 'register') {
          router.push('/tools/completar-perfil')
        } else {
          router.push('/tools')
        }
      }, 600)
    }
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setError('')
  }

  if (!authModalOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={closeAuthModal}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--z-modal, 100)',
          backgroundColor: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: 'calc(100dvh - 2rem)',
            overflowY: 'auto',
            background: 'rgba(14, 14, 14, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              transition: 'all 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-primary)'
              e.currentTarget.style.color = 'var(--color-ink)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-muted)'
            }}
          >
            <X size={16} />
          </button>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '3.5rem', textAlign: 'center' }}
              >
                {/* S4C Logo-inspired loading animation */}
                <div style={{ margin: '0 auto 1.75rem', width: 80, height: 80, position: 'relative' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outer ring pulse */}
                    <motion.circle
                      cx="40" cy="40" r="36"
                      stroke="var(--color-border)"
                      strokeWidth="2"
                      fill="none"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: [0, 0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* S */}
                    <motion.text
                      x="14" y="52"
                      fontFamily="var(--font-heading)"
                      fontSize="28"
                      fontWeight="700"
                      fill="var(--color-ink)"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, type: 'spring', damping: 20, stiffness: 100 }}
                    >
                      S
                    </motion.text>
                    {/* 4 in coral */}
                    <motion.text
                      x="30" y="52"
                      fontFamily="var(--font-heading)"
                      fontSize="28"
                      fontWeight="700"
                      fill="#DA4E24"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, type: 'spring', damping: 20, stiffness: 100 }}
                    >
                      4
                    </motion.text>
                    {/* C */}
                    <motion.text
                      x="50" y="52"
                      fontFamily="var(--font-heading)"
                      fontSize="28"
                      fontWeight="700"
                      fill="var(--color-ink)"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, type: 'spring', damping: 20, stiffness: 100 }}
                    >
                      C
                    </motion.text>
                    {/* Animated progress arc */}
                    <motion.circle
                      cx="40" cy="40" r="36"
                      stroke="#DA4E24"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="226"
                      initial={{ strokeDashoffset: 226 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    />
                  </svg>
                </div>
                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, type: 'spring', damping: 20 }}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-heading-md)',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.03em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {mode === 'register' ? '¡Cuenta creada!' : '¡Bienvenido de vuelta!'}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)' }}
                >
                  Accediendo a tu plataforma...
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'register' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'register' ? -20 : 20 }}
                transition={{ duration: 0.25 }}
              >
                {/* S4C Logo header strip */}
                <div
                  style={{
                    padding: '2rem 2.5rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Startups<span style={{ color: 'var(--color-accent-primary)' }}>4</span>Climate
                  </span>
                </div>

                {/* Tabs: Login / Registro */}
                {mode !== 'reset' && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0',
                      padding: '0 2.5rem',
                      borderBottom: '1px solid var(--color-border)',
                      marginBottom: '2rem',
                    }}
                  >
                    {(['login', 'register'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setMode(tab)
                          setError('')
                        }}
                        style={{
                          background: 'none',
                          borderTop: 'none',
                          borderRight: 'none',
                          borderLeft: 'none',
                          borderBottom: mode === tab ? '2px solid var(--color-ink)' : '2px solid transparent',
                          padding: '0.875rem 0',
                          marginRight: '2rem',
                          marginBottom: '-1px',
                          fontFamily: 'var(--font-body)',
                          fontSize: 'var(--text-body)',
                          fontWeight: mode === tab ? 700 : 500,
                          color: mode === tab ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {tab === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ padding: '0 2.5rem 2.5rem' }}>
                  {/* Heading */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h2
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-display-md)',
                        fontWeight: 700,
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.04em',
                        lineHeight: 1.05,
                        marginBottom: '0.625rem',
                      }}
                    >
                      {mode === 'reset'
                        ? 'Recupera tu contraseña'
                        : mode === 'login'
                          ? 'Accede a tu plataforma'
                          : 'Crea tu cuenta gratis'}
                    </h2>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-body)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      {mode === 'reset'
                        ? 'Ingresa tu usuario o email y te enviaremos un enlace para restablecer tu contraseña.'
                        : mode === 'login'
                          ? 'Un solo acceso para founders y organizaciones.'
                          : <>Accede a la Plataforma <span style={{ color: 'var(--color-accent-primary)', fontWeight: 700 }}>S4C</span> sin costo.</>}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} aria-label="Formulario de acceso" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {mode === 'register' && (
                      <>
                        <Input
                          variant="underline"
                          inputSize="lg"
                          leftIcon={<User size={16} />}
                          placeholder="Tu nombre completo"
                          value={form.name}
                          onChange={set('name')}
                          autoComplete="name"
                          style={{ marginBottom: '1.25rem' }}
                        />
                        <Input
                          variant="underline"
                          inputSize="lg"
                          leftIcon={<Building2 size={16} />}
                          placeholder="Nombre de tu startup"
                          value={form.startup}
                          onChange={set('startup')}
                          autoComplete="organization"
                          style={{ marginBottom: '1.25rem' }}
                        />
                      </>
                    )}
                    <Input
                      variant="underline"
                      inputSize="lg"
                      leftIcon={<Mail size={16} />}
                      type={mode === 'register' ? 'email' : 'text'}
                      placeholder={mode === 'register' ? 'Email' : 'Usuario o email'}
                      value={form.email}
                      onChange={set('email')}
                      autoComplete={mode === 'register' ? 'email' : 'username'}
                      style={{ marginBottom: '1.25rem' }}
                    />
                    {mode !== 'reset' && (
                      <Input
                        variant="underline"
                        inputSize="lg"
                        leftIcon={<Lock size={16} />}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Contraseña (min. 6 caracteres)"
                        value={form.password}
                        onChange={set('password')}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              padding: 0,
                            }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                        style={{ marginBottom: '1.25rem' }}
                      />
                    )}

                    {mode === 'login' && (
                      <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('reset')
                            setError('')
                            setResetSent(false)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            padding: 0,
                          }}
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                    )}

                    {resetSent && mode === 'reset' && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          color: '#16A34A',
                          background: 'rgba(22,163,74,0.04)',
                          border: '1px solid rgba(22,163,74,0.12)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.625rem 0.875rem',
                          marginTop: '1rem',
                        }}
                      >
                        Te enviamos un enlace de recuperación a tu email.
                      </motion.p>
                    )}

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          color: '#DC2626',
                          background: 'rgba(220,38,38,0.04)',
                          border: '1px solid rgba(220,38,38,0.12)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.625rem 0.875rem',
                          marginTop: '1rem',
                        }}
                      >
                        {error}
                      </motion.p>
                    )}

                    {!(resetSent && mode === 'reset') && (
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        icon={!loading ? <ArrowRight size={18} /> : undefined}
                        iconPosition="right"
                        style={{
                          padding: '1rem 2rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-body-lg)',
                          fontWeight: 700,
                          marginTop: '1.75rem',
                        }}
                      >
                        {mode === 'reset'
                          ? 'Enviar enlace de recuperación'
                          : mode === 'login'
                            ? 'Acceder a la plataforma'
                            : 'Crear cuenta gratis'}
                      </Button>
                    )}
                  </form>

                  {/* Footer links */}
                  <div
                    style={{
                      marginTop: '1.5rem',
                      paddingTop: '1.25rem',
                      borderTop: '1px solid var(--color-border)',
                      textAlign: 'center',
                    }}
                  >
                    {mode === 'reset' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login')
                          setError('')
                          setResetSent(false)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: 'var(--color-ink)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                        }}
                      >
                        Volver al login
                      </button>
                    ) : (
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setMode(mode === 'login' ? 'register' : 'login')
                            setError('')
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: 'var(--color-ink)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                          }}
                        >
                          {mode === 'login' ? 'Regístrate gratis' : 'Iniciar sesión'}
                        </button>
                      </span>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

