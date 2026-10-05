'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, User, CheckCircle2, Mail, Phone, Globe, Link2, Share2, Copy, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { STAGE_META } from '@/lib/tools-data'
import { supabase } from '@/lib/supabase'

const ROLE_OPTIONS = [
  'CEO / Founder',
  'CTO',
  'COO',
  'CMO',
  'CPO',
  'Otro',
]

const VERTICAL_OPTIONS = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'edtech', label: 'Edtech' },
  { value: 'agritech_foodtech', label: 'Agritech / Foodtech' },
  { value: 'cleantech_climatech', label: 'Cleantech / Climatech' },
  { value: 'biotech_deeptech', label: 'Biotech / Deeptech' },
  { value: 'logistics_mobility', label: 'Logística / Movilidad' },
  { value: 'saas_enterprise', label: 'SaaS / Enterprise' },
  { value: 'social_impact', label: 'Impacto Social' },
  { value: 'other', label: 'Otro' },
]

const LATAM_COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua',
  'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela',
]

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  '1': { label: 'Pre-incubación', color: STAGE_META[1].color, bg: STAGE_META[1].bg },
  '2': { label: 'Incubación', color: STAGE_META[2].color, bg: STAGE_META[2].bg },
  '3': { label: 'Aceleración', color: STAGE_META[3].color, bg: STAGE_META[3].bg },
  '4': { label: 'Escalamiento', color: STAGE_META[4].color, bg: STAGE_META[4].bg },
}

/* Typeform-style input: border-bottom only */
function TFInput({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string
  icon?: React.ReactNode
  type?: string
  value: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  readOnly?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.625rem',
          borderBottom: `2px solid ${focused && !readOnly ? 'var(--color-ink)' : 'var(--color-border)'}`,
          transition: 'border-color 0.2s ease',
          paddingBottom: '0.125rem',
        }}
      >
        {icon && (
          <span style={{ flexShrink: 0, paddingBottom: '0.75rem', opacity: focused ? 1 : 0.4, transition: 'opacity 0.2s', color: 'var(--color-text-secondary)' }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            padding: '0.375rem 0 0.75rem',
            border: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-heading-md)',
            color: readOnly ? 'var(--color-text-muted)' : 'var(--color-ink)',
            outline: 'none',
            letterSpacing: '-0.01em',
            cursor: readOnly ? 'not-allowed' : 'text',
          }}
        />
      </div>
    </div>
  )
}

function TFSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[] | string[]
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  const normalizedOptions = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </label>
      <div
        style={{
          borderBottom: `2px solid ${focused ? 'var(--color-ink)' : 'var(--color-border)'}`,
          transition: 'border-color 0.2s ease',
          paddingBottom: '0.125rem',
        }}
      >
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '0.375rem 2rem 0.75rem 0',
            border: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-heading-md)',
            color: value ? 'var(--color-ink)' : 'var(--color-text-muted)',
            outline: 'none',
            letterSpacing: '-0.01em',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%2394a3b8' d='M2 4l5 6 5-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.25rem center',
            cursor: 'pointer',
          }}
        >
          <option value="">{placeholder}</option>
          {normalizedOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function PerfilPage() {
  const { user, appUser, updateProfile } = useAuth()

  const [nombre, setNombre] = useState('')
  const [gender, setGender] = useState<'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir' | ''>('')
  const [startupName, setStartupName] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [vertical, setVertical] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [website, setWebsite] = useState('')
  const [role, setRole] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [radarNewsletter, setRadarNewsletter] = useState(false)
  const [oppsNewsletter, setOppsNewsletter] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      setNombre(user.name || '')
      setStartupName(user.startup || '')
    }
    if (appUser?.gender) setGender(appUser.gender)

    async function loadStartupData() {
      if (!appUser) return

      // Demo users (non-UUID ids) can't be queried against Postgres — bail out
      // and let the localStorage fallback below populate the form.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_RE.test(appUser.id)) {
        // fall through to localStorage fallback
        if (typeof window !== 'undefined') {
          try {
            const extraKey = `s4c_${appUser.id}_profile_extra`
            const extra = JSON.parse(localStorage.getItem(extraKey) || '{}')
            if (extra.role) setRole(extra.role)
            if (extra.linkedin) setLinkedin(extra.linkedin)
            if (extra.descripcion) setDescripcion(extra.descripcion)
            if (extra.vertical) setVertical(extra.vertical)
            if (extra.country) setCountry(extra.country)
            if (extra.phone) setPhone(extra.phone)
            if (extra.website) setWebsite(extra.website)
            if (extra.teamSize) setTeamSize(String(extra.teamSize))
            if (extra.radarNewsletter) setRadarNewsletter(extra.radarNewsletter)
            if (extra.oppsNewsletter) setOppsNewsletter(extra.oppsNewsletter)
          } catch { /* ignore */ }
        }
        return
      }

      try {
        const { data: startup } = await supabase
          .from('startups')
          .select('*')
          .eq('founder_id', appUser.id)
          .maybeSingle()

        if (startup) {
          if (startup.name) setStartupName(startup.name)
          if (startup.description) setDescripcion(startup.description)
          if (startup.vertical) setVertical(startup.vertical)
          if (startup.country) setCountry(startup.country)
          if (startup.website) setWebsite(startup.website)
          if (startup.team_size) setTeamSize(String(startup.team_size))
          if (startup.is_public) setIsPublic(true)
          if (startup.public_share_token) {
            setShareUrl(`${window.location.origin}/passport/${startup.public_share_token}`)
          }
          if (typeof window !== 'undefined') {
            try {
              const extraKey = `s4c_${appUser.id}_profile_extra`
              const extra = JSON.parse(localStorage.getItem(extraKey) || '{}')
              if (extra.role) setRole(extra.role)
              if (extra.linkedin) setLinkedin(extra.linkedin)
              if (extra.phone) setPhone(extra.phone)
              if (extra.radarNewsletter) setRadarNewsletter(extra.radarNewsletter)
              if (extra.oppsNewsletter) setOppsNewsletter(extra.oppsNewsletter)
            } catch { /* ignore */ }
          }
          return
        }
      } catch { /* Supabase query failed — fall through to localStorage */ }

      if (typeof window !== 'undefined') {
        try {
          const extraKey = `s4c_${appUser.id}_profile_extra`
          const extra = JSON.parse(localStorage.getItem(extraKey) || '{}')
          if (extra.role) setRole(extra.role)
          if (extra.linkedin) setLinkedin(extra.linkedin)
          if (extra.descripcion) setDescripcion(extra.descripcion)
          if (extra.vertical) setVertical(extra.vertical)
          if (extra.country) setCountry(extra.country)
          if (extra.phone) setPhone(extra.phone)
          if (extra.website) setWebsite(extra.website)
          if (extra.teamSize) setTeamSize(String(extra.teamSize))
          if (extra.radarNewsletter) setRadarNewsletter(extra.radarNewsletter)
          if (extra.oppsNewsletter) setOppsNewsletter(extra.oppsNewsletter)
        } catch { /* ignore */ }
      }
    }

    loadStartupData()
  }, [user, appUser])

  const handleToggleShare = async (enabled: boolean) => {
    setShareLoading(true)
    try {
      const res = await fetch('/api/passport/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error')
      setIsPublic(!!data.is_public)
      if (data.share_url) setShareUrl(data.share_url)
    } catch (err) {
      console.error('[S4C Perfil] share toggle failed', err)
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopyShare = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    await updateProfile({ full_name: nombre, startup_name: startupName, gender: gender || null })

    const extraData = { role, linkedin, descripcion, vertical, country, phone, website, teamSize, radarNewsletter, oppsNewsletter }
    const extraKey = `s4c_${appUser?.id ?? user.id}_profile_extra`
    localStorage.setItem(extraKey, JSON.stringify(extraData))

    if (appUser) {
      // Demo users don't persist to Supabase — localStorage above already captured state
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (UUID_RE.test(appUser.id)) {
        try {
          const { error: startupError } = await supabase.from('startups').upsert(
            {
              founder_id: appUser.id,
              name: startupName,
              description: descripcion,
              vertical,
              country,
              website,
              team_size: teamSize ? Number(teamSize) : null,
            },
            { onConflict: 'founder_id' }
          )
          if (startupError) console.warn('Failed to upsert startups table:', startupError.message)
        } catch (err) {
          console.warn('Error upserting startups table:', err)
        }
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!user) return null

  const stageNum = user.stage || '1'
  const stageInfo = STAGE_LABELS[stageNum] || STAGE_LABELS['1']
  const initials = nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg-primary)',
        padding: '2.5rem 1.75rem',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Back link */}
        <Link
          href="/tools"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            marginBottom: '2rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          <ArrowLeft size={15} />
          Volver al dashboard
        </Link>

        {/* 2-col grid: sidebar + form */}
        <div
          className="perfil-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '2.5rem',
            alignItems: 'start',
          }}
        >
          {/* ── LEFT SIDEBAR (sticky) ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{
              position: 'sticky',
              top: 'calc(44px + 1.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Avatar card */}
            <div
              style={{
                background: 'var(--color-paper)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-float)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'center',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '3px solid var(--color-paper)',
                  boxShadow: 'var(--shadow-float)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-paper)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {initials}
                </span>
              </div>

              {/* Stage badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: stageInfo.bg,
                  border: `1px solid ${stageInfo.color}30`,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: stageInfo.color, flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: stageInfo.color,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                }}>
                  {stageInfo.label}
                </span>
              </div>

              {/* Name + startup */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-heading-md)',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  marginBottom: '0.25rem',
                }}>
                  {nombre || 'Tu nombre'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '-0.01em',
                }}>
                  {startupName || 'Tu startup'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-2xs)',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.25rem',
                  wordBreak: 'break-all' as const,
                }}>
                  {user.email}
                </div>
              </div>

              {/* Score if present */}
              {user.diagnosticScore != null && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  width: '100%',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.5rem, 2vw, 2rem)',
                    fontWeight: 700,
                    color: stageInfo.color,
                    letterSpacing: '-0.04em',
                  }}>{user.diagnosticScore}</span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                  }}>Score diagnóstico</span>
                </div>
              )}
            </div>

            {/* Pasaporte público */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-paper)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-float)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(31,119,246,0.08)', border: '1px solid rgba(31,119,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Share2 size={14} color="#1F77F6" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                    Pasaporte público
                  </div>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: shareLoading ? 'wait' : 'pointer', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: isPublic ? '#1F77F6' : 'var(--color-text-muted)' }}>
                    {shareLoading ? '...' : isPublic ? 'ON' : 'OFF'}
                  </span>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    disabled={shareLoading}
                    onChange={(e) => handleToggleShare(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#1F77F6', cursor: shareLoading ? 'wait' : 'pointer' }}
                  />
                </label>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: isPublic && shareUrl ? '0.75rem' : 0 }}>
                URL pública read-only con tu pitch y métricas.
              </div>
              {isPublic && shareUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.625rem', borderRadius: 6, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <input
                    readOnly value={shareUrl}
                    style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-primary)', outline: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button onClick={handleCopyShare} title="Copiar" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.25rem 0.5rem', borderRadius: 5, background: copied ? 'rgba(31,119,246,0.1)' : 'var(--color-bg-card)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: copied ? '#1F77F6' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
                    <Copy size={10} /> {copied ? '✓' : 'Copiar'}
                  </button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer" title="Abrir" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.4rem', borderRadius: 5, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── RIGHT: FORM ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.07 }}
          >
        {/* Profile form card */}
        <div
          style={{
            background: 'var(--color-paper)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-float)',
          }}
        >
          {/* Section: Personal */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              Datos personales
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <TFInput
                label="Nombre completo"
                icon={<User size={16} />}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
              />

              <TFSelect
                label="Género"
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                options={[
                  { value: 'masculino',        label: 'Masculino' },
                  { value: 'femenino',         label: 'Femenino' },
                  { value: 'otro',             label: 'Otro' },
                  { value: 'prefiero_no_decir',label: 'Prefiero no decir' },
                ]}
                placeholder="Selecciona tu género"
              />

              <TFInput
                label="Email"
                icon={<Mail size={16} />}
                type="email"
                value={user.email}
                readOnly
              />

              <TFSelect
                label="Rol en la startup"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={ROLE_OPTIONS}
                placeholder="Selecciona tu rol"
              />

              <TFInput
                label="Teléfono"
                icon={<Phone size={16} />}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
              />

              <TFInput
                label="LinkedIn URL"
                icon={<Link2 size={16} />}
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/tu-perfil"
              />
            </div>
          </div>

          {/* Section: Startup */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              Tu startup
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <TFInput
                label="Nombre de la startup"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                placeholder="Nombre de tu startup"
              />

              {/* Description */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.25rem',
                  }}
                >
                  Descripción
                </label>
                <div style={{ borderBottom: '2px solid var(--color-border)', paddingBottom: '0.125rem' }}>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Cuéntanos brevemente sobre tu startup y lo que estás construyendo..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0 0.75rem',
                      border: 'none',
                      background: 'transparent',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-body-lg)',
                      color: 'var(--color-ink)',
                      outline: 'none',
                      resize: 'vertical' as const,
                      letterSpacing: '-0.01em',
                      minHeight: 80,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
                  gap: '1.75rem',
                }}
              >
                <TFSelect
                  label="Vertical"
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                  options={VERTICAL_OPTIONS}
                  placeholder="Selecciona tu vertical"
                />

                <TFSelect
                  label="País"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  options={LATAM_COUNTRIES}
                  placeholder="Selecciona tu país"
                />
              </div>

              <TFInput
                label="Sitio web"
                icon={<Globe size={16} />}
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://tustartup.com"
              />

              <TFInput
                label="Tamaño del equipo"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                type="number"
                placeholder="Número de personas"
              />

            </div>
          </div>

          {/* Section: Suscripciones */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              Suscripciones
            </div>

            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}
            >
              {[
                {
                  key: 'radar',
                  label: 'Newsletter RADAR',
                  desc: 'Recibe novedades del ecosistema de innovación',
                  checked: radarNewsletter,
                  toggle: () => setRadarNewsletter((v) => !v),
                },
                {
                  key: 'opps',
                  label: 'Newsletter Oportunidades',
                  desc: 'Recibe convocatorias y fondos para tu startup',
                  checked: oppsNewsletter,
                  toggle: () => setOppsNewsletter((v) => !v),
                },
              ].map((item, i) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.125rem 1.25rem',
                    cursor: 'pointer',
                    borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        marginBottom: '0.125rem',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.toggle}
                    style={{ width: 20, height: 20, accentColor: 'var(--color-accent-secondary)', cursor: 'pointer', flexShrink: 0 }}
                  />
                </label>
              ))}
            </div>
          </div>


          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 2rem',
                borderRadius: 'var(--radius-full)',
                background: saving ? 'var(--color-text-secondary)' : 'var(--color-ink)',
                color: 'var(--color-paper)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-body-lg)',
                fontWeight: 700,
                border: 'none',
                cursor: saving ? 'wait' : 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'var(--color-accent-primary)' }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = 'var(--color-ink)' }}
            >
              <Save size={17} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {saved && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-accent-secondary)',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                <CheckCircle2 size={16} />
                Guardado
              </motion.div>
            )}
          </div>
        </div>{/* /form card */}
          </motion.div>{/* /right column */}
        </div>{/* /perfil-grid */}
      </div>
    </div>
  )
}
