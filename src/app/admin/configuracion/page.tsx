'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Save,
  Building2,
  CreditCard,
  Globe,
  Loader2,
  Upload,
  Users,
  Target,
  Phone,
  AtSign,
  KeyRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { loadOrgProfile } from '@/lib/admin-data/configuracion'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  institutional: 'Institutional',
}

const ORG_TYPES = ['Universidad', 'Incubadora', 'Aceleradora', 'Gobierno', 'Fondo', 'Corporativo']
const COHORT_FREQUENCIES = ['Trimestral', 'Semestral', 'Anual', 'Continua']
const VERTICAL_FOCUS_OPTIONS = [
  'ClimaTech',
  'AgriTech',
  'Energía',
  'Movilidad',
  'Economía Circular',
  'Biomateriales',
  'Agua',
  'Carbono',
  'FoodTech',
]

const LATAM_COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua',
  'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana',
  'Uruguay', 'Venezuela',
]

const PERU_REGIONS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad',
  'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco',
  'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
  'Resto LATAM',
]

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2.25rem',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: '0.375rem',
  display: 'block',
}

const chipBase: React.CSSProperties = {
  padding: '0.3125rem 0.625rem',
  borderRadius: 999,
  fontFamily: 'var(--font-body)',
  fontSize: '0.6875rem',
  fontWeight: 500,
  cursor: 'pointer',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  color: 'var(--color-text-secondary)',
  transition: 'all 0.15s ease',
  userSelect: 'none' as const,
}

const chipActive: React.CSSProperties = {
  ...chipBase,
  background: '#1D4ED8',
  color: '#fff',
  borderColor: '#1D4ED8',
}

export default function ConfiguracionPage() {
  const { appUser, isDemo } = useAuth()
  const [loading, setLoading] = useState(true)

  // Core
  const [orgName, setOrgName] = useState('')
  const [website, setWebsite] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [plan, setPlan] = useState('starter')
  const [maxStartups, setMaxStartups] = useState(25)
  const [contractEnd, setContractEnd] = useState<string | null>(null)
  const [startupCount, setStartupCount] = useState(0)

  // Extended (meta) fields
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [orgType, setOrgType] = useState('')
  const [verticalFocus, setVerticalFocus] = useState<string[]>([])
  const [cohortFrequency, setCohortFrequency] = useState('')
  const [mainContactName, setMainContactName] = useState('')
  const [mainContactRole, setMainContactRole] = useState('')
  const [mainContactPhone, setMainContactPhone] = useState('')
  const [socialLinkedIn, setSocialLinkedIn] = useState('')
  const [socialTwitter, setSocialTwitter] = useState('')
  const [description, setDescription] = useState('')
  const [programGoals, setProgramGoals] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // "Cambiar contraseña" section state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (isDemo) {
      setPwError('El cambio de contraseña está deshabilitado en modo demo.')
      return
    }
    if (!appUser?.email) {
      setPwError('No se pudo identificar tu sesión. Vuelve a iniciar sesión.')
      return
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Completa todos los campos.')
      return
    }
    if (newPassword.length < 8) {
      setPwError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('La nueva contraseña y su confirmación no coinciden.')
      return
    }
    if (newPassword === currentPassword) {
      setPwError('La nueva contraseña debe ser distinta a la actual.')
      return
    }

    setPwSaving(true)
    // Re-authenticate to verify the current password before allowing the change.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: appUser.email,
      password: currentPassword,
    })
    if (signInError) {
      setPwError('La contraseña actual es incorrecta.')
      setPwSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      console.error('[S4C Admin] Password update error:', updateError)
      setPwError('No se pudo actualizar la contraseña. Intenta de nuevo.')
      setPwSaving(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPwSuccess(true)
    setPwSaving(false)
    setTimeout(() => setPwSuccess(false), 4000)
  }

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
    if (!isDemo && !appUser?.org_id) return

    loadOrgProfile({ isDemo, orgId: appUser?.org_id })
      .then((profile) => {
        if (!profile) return
        setOrgName(profile.name)
        setWebsite(profile.website)
        setLogoUrl(profile.logo_url)
        setBillingEmail(profile.billing_email)
        setPlan(profile.plan)
        setMaxStartups(profile.max_startups)
        setContractEnd(profile.contract_end)
        setStartupCount(profile.startup_count)
        setCountry(profile.country)
        setRegion(profile.region)
        setOrgType(profile.orgType)
        setVerticalFocus(profile.verticalFocus)
        setCohortFrequency(profile.cohortFrequency)
        setMainContactName(profile.mainContactName)
        setMainContactRole(profile.mainContactRole)
        setMainContactPhone(profile.mainContactPhone)
        setSocialLinkedIn(profile.socialLinkedIn)
        setSocialTwitter(profile.socialTwitter)
        setDescription(profile.description)
        setProgramGoals(profile.programGoals)
      })
      .catch((err) => {
        console.error('[S4C Admin] Error loading org settings:', err)
        setError('No se pudieron cargar los datos de la organización.')
      })
      .finally(() => setLoading(false))
  }, [appUser?.org_id, isDemo])

  const toggleVertical = (v: string) => {
    setVerticalFocus((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !appUser?.org_id) return

    if (isDemo) {
      setError('La subida de logos está deshabilitada en modo demo.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos PNG, JPG o SVG.')
      return
    }

    setUploading(true)
    setError(null)

    const fileExt = file.name.split('.').pop()
    const filePath = `org-logos/${appUser.org_id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError('Error al subir el logo. Intenta de nuevo.')
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    setLogoUrl(publicUrlData.publicUrl)
    setUploading(false)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appUser?.org_id) return

    if (isDemo) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      return
    }

    setSaving(true)
    setError(null)

    const meta = {
      country,
      region,
      orgType,
      verticalFocus,
      cohortFrequency,
      mainContactName,
      mainContactRole,
      mainContactPhone,
      socialLinkedIn,
      socialTwitter,
      description,
      programGoals,
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        name: orgName.trim(),
        website: website.trim() || null,
        logo_url: logoUrl.trim() || null,
        billing_email: billingEmail.trim() || null,
        meta,
      })
      .eq('id', appUser.org_id)

    if (updateError) {
      console.error('[S4C Admin] Error saving org:', updateError)
      setError('Error al guardar los cambios. Intenta de nuevo.')
      setSaving(false)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} color="#1D4ED8" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ padding: '2rem 1.5rem', maxWidth: 760, margin: '0 auto' }}
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

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: '1.25rem', color: 'var(--color-text-primary)',
          marginBottom: '0.25rem',
        }}>
          Configuración
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
        }}>
          Administra los datos de tu organización, equipo y plan
        </p>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#DC2626', fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Organization info */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <Building2 size={18} color="#1D4ED8" />
            <h2 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: '1rem', color: 'var(--color-text-primary)',
            }}>
              Organización
            </h2>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nombre de la organización</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Nombre de tu organización"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>País</label>
              <select
                style={selectStyle}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Selecciona país</option>
                {LATAM_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Región</label>
              <select
                style={selectStyle}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Selecciona región</option>
                {PERU_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Tipo de organización</label>
              <select
                style={selectStyle}
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option value="">Selecciona tipo</option>
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Frecuencia de cohortes</label>
              <select
                style={selectStyle}
                value={cohortFrequency}
                onChange={(e) => setCohortFrequency(e.target.value)}
              >
                <option value="">Selecciona frecuencia</option>
                {COHORT_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              <Target size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Verticales de enfoque
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {VERTICAL_FOCUS_OPTIONS.map((v) => (
                <span
                  key={v}
                  onClick={() => toggleVertical(v)}
                  style={verticalFocus.includes(v) ? chipActive : chipBase}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo de la organización"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Building2 size={32} color="var(--color-text-muted)" strokeWidth={1.5} />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 500,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    opacity: uploading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1D4ED8'; e.currentTarget.style.background = 'rgba(31,119,246,0.04)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-card)' }}
                >
                  {uploading ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploading ? 'Subiendo...' : 'Subir logo'}
                </button>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                }}>
                  O ingresa una URL manualmente
                </span>
              </div>
            </div>

            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.75rem',
              color: 'var(--color-text-muted)', marginTop: '0.25rem',
            }}>
              PNG, JPG o SVG recomendado
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              <Globe size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Sitio web
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://miorganización.com"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu organización en 2-3 oraciones"
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div>
            <label style={labelStyle}>Objetivos del programa con S4C</label>
            <textarea
              value={programGoals}
              onChange={(e) => setProgramGoals(e.target.value)}
              placeholder="¿Qué buscan lograr este año con S4C?"
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>
        </div>

        {/* Contact + social */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <Users size={18} color="#1D4ED8" />
            <h2 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: '1rem', color: 'var(--color-text-primary)',
            }}>
              Contacto principal y redes
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Nombre del contacto</label>
              <input
                type="text"
                value={mainContactName}
                onChange={(e) => setMainContactName(e.target.value)}
                placeholder="Ej: María Fernández"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Cargo</label>
              <input
                type="text"
                value={mainContactRole}
                onChange={(e) => setMainContactRole(e.target.value)}
                placeholder="Ej: Director de Innovación"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              <Phone size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Teléfono de contacto
            </label>
            <input
              type="tel"
              value={mainContactPhone}
              onChange={(e) => setMainContactPhone(e.target.value)}
              placeholder="+51 999 999 999"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>
                <Globe size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                LinkedIn
              </label>
              <input
                type="url"
                value={socialLinkedIn}
                onChange={(e) => setSocialLinkedIn(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <AtSign size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                Twitter / X
              </label>
              <input
                type="url"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                placeholder="https://twitter.com/..."
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>
        </div>

        {/* Plan info */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <CreditCard size={18} color="#1D4ED8" />
            <h2 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: '1rem', color: 'var(--color-text-primary)',
            }}>
              Plan y facturación
            </h2>
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(31,119,246,0.04)',
            border: '1px solid rgba(31,119,246,0.12)',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 700,
                  fontSize: '1rem', color: 'var(--color-text-primary)',
                  marginBottom: '0.125rem',
                }}>
                  Plan {PLAN_LABELS[plan] || plan}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                }}>
                  Hasta {maxStartups} startups
                </div>
              </div>
              <span style={{
                padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-xl)',
                background: 'rgba(31,119,246,0.08)', color: '#1F77F6',
                fontFamily: 'var(--font-body)', fontSize: '0.6875rem', fontWeight: 500,
              }}>
                Activo
              </span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.625rem',
                  color: 'var(--color-text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: '0.125rem',
                }}>
                  Startups usadas
                </div>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 600,
                  fontSize: '0.9375rem', color: 'var(--color-text-primary)',
                }}>
                  {startupCount} / {maxStartups}
                </div>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.625rem',
                  color: 'var(--color-text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: '0.125rem',
                }}>
                  Fin del contrato
                </div>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 600,
                  fontSize: '0.9375rem', color: 'var(--color-text-primary)',
                }}>
                  {contractEnd
                    ? new Date(contractEnd).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Sin definir'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email de facturación</label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="facturación@miorganización.com"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1D4ED8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>
        </div>

        {/* Save */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: '0.75rem',
        }}>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                fontWeight: 500, color: '#1F77F6',
              }}
            >
              Cambios guardados
            </motion.span>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: 8,
              background: '#1D4ED8',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
              transition: 'background 0.15s',
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3B82F6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1D4ED8')}
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Cambiar contraseña — sección de cuenta personal */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{ ...cardStyle, marginTop: '1.5rem', maxWidth: 720 }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem',
        }}>
          <KeyRound size={18} color="var(--color-text-muted)" />
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: 'var(--text-md)', color: 'var(--color-text-primary)', margin: 0,
          }}>
            Cambiar contraseña
          </h2>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)', margin: '0 0 1.25rem 0',
        }}>
          Actualiza la contraseña con la que ingresas a tu cuenta.
        </p>

        <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={pwSaving || isDemo}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={pwSaving || isDemo}
              style={inputStyle}
            />
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
              color: 'var(--color-text-muted)', margin: '0.375rem 0 0 0',
            }}>
              Mínimo 8 caracteres. Usa una combinación de letras, números y símbolos.
            </p>
          </div>
          <div>
            <label style={labelStyle}>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={pwSaving || isDemo}
              style={inputStyle}
            />
          </div>

          {pwError && (
            <div style={{
              padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)',
              background: 'rgba(220,38,38,0.08)', color: '#DC2626',
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            }}>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div style={{
              padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)',
              background: 'rgba(16,185,129,0.08)', color: '#10B981',
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            }}>
              Contraseña actualizada correctamente.
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={pwSaving || isDemo}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: 8,
                background: '#1D4ED8', color: '#fff',
                border: 'none', cursor: pwSaving || isDemo ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
                transition: 'background 0.15s',
                opacity: pwSaving || isDemo ? 0.6 : 1,
              }}
            >
              {pwSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={14} />}
              {pwSaving ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </motion.section>
    </motion.div>
  )
}
