'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, GraduationCap, Loader2,
  Save, UserPlus, AlertTriangle, Check, X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSuperadmin } from '@/context/SuperadminContext'
import { supabase } from '@/lib/supabase'

interface OrgData {
  id: string
  name: string
  type: string | null
  country: string | null
  plan: string | null
  max_startups: number | null
  billing_email: string | null
  website: string | null
  is_active: boolean
  created_at: string
}

interface AdminUser {
  id: string
  full_name: string
  email: string
}

interface CohortRow {
  id: string
  name: string
  status: string
  created_at: string
}

const ORG_TYPES = [
  { value: 'university', label: 'Universidad' },
  { value: 'incubator', label: 'Incubadora' },
  { value: 'accelerator', label: 'Aceleradora' },
  { value: 'government', label: 'Gobierno' },
  { value: 'ngo', label: 'ONG' },
  { value: 'other', label: 'Otro' },
]

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Activa', color: '#1F77F6', bg: 'rgba(31,119,246,0.08)' },
  planned: { label: 'Planificada', color: '#1F77F6', bg: 'rgba(59,130,246,0.08)' },
  completed: { label: 'Completada', color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
  padding: '1.5rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: '0.375rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export default function OrganizacionDetailPage() {
  const { appUser } = useAuth()
  const { isSuperadmin } = useSuperadmin()
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<OrgData | null>(null)
  const [form, setForm] = useState({
    name: '', type: 'university', country: '', plan: 'starter',
    max_startups: 25, billing_email: '', website: '',
  })
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [stats, setStats] = useState({ totalStartups: 0, totalCohorts: 0, activeCohorts: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Assign admin state
  const [adminEmail, setAdminEmail] = useState('')
  const [assigningAdmin, setAssigningAdmin] = useState(false)

  // Deactivation
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const loadData = useCallback(async () => {
    if (!orgId) return

    // Load org
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle()

    if (orgError || !orgData) {
      setLoading(false)
      setMessage({ type: 'error', text: 'No se pudo cargar la organización.' })
      return
    }

    setOrg(orgData)
    setForm({
      name: orgData.name || '',
      type: orgData.type || 'university',
      country: orgData.country || '',
      plan: orgData.plan || 'starter',
      max_startups: orgData.max_startups ?? 25,
      billing_email: orgData.billing_email || '',
      website: orgData.website || '',
    })

    // Load admins
    const { data: adminData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('org_id', orgId)
      .eq('role', 'admin_org')

    setAdmins(adminData || [])

    // Load cohorts
    const { data: cohortData } = await supabase
      .from('cohorts')
      .select('id, name, status, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)

    setCohorts(cohortData || [])

    // Count startups via profiles
    const { count: startupCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'founder')

    const allCohorts = cohortData || []
    setStats({
      totalStartups: startupCount || 0,
      totalCohorts: allCohorts.length,
      activeCohorts: allCohorts.filter((c) => c.status === 'active').length,
    })

    setLoading(false)
  }, [orgId])

  useEffect(() => {
    if (appUser && appUser.role !== 'superadmin') {
      router.replace('/admin')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: the async loader only sets state after its awaits
    loadData()
  }, [appUser, router, loadData])

  if (!isSuperadmin) return null

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'El nombre es requerido.' })
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('organizations')
      .update({
        name: form.name.trim(),
        type: form.type,
        country: form.country.trim() || null,
        plan: form.plan,
        max_startups: form.max_startups,
        billing_email: form.billing_email.trim() || null,
        website: form.website.trim() || null,
      })
      .eq('id', orgId)

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: `Error al guardar: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: 'Cambios guardados correctamente.' })
    }
  }

  async function handleAssignAdmin() {
    if (!adminEmail.trim()) return
    setAssigningAdmin(true)
    setMessage(null)

    // Find user by email
    const { data: profiles, error: findError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', adminEmail.trim().toLowerCase())
      .limit(1)

    if (findError || !profiles || profiles.length === 0) {
      setMessage({ type: 'error', text: 'No se encontro un usuario con ese email.' })
      setAssigningAdmin(false)
      return
    }

    const profile = profiles[0]

    // Update role and org_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin_org', org_id: orgId })
      .eq('id', profile.id)

    if (updateError) {
      setMessage({ type: 'error', text: `Error al asignar admin: ${updateError.message}` })
      setAssigningAdmin(false)
      return
    }

    setAdmins((prev) => [...prev, { id: profile.id, full_name: profile.full_name, email: profile.email }])
    setAdminEmail('')
    setMessage({ type: 'success', text: `${profile.full_name || profile.email} fue asignado como admin.` })
    setAssigningAdmin(false)
  }

  async function handleDeactivate() {
    setDeactivating(true)
    setMessage(null)

    const { error } = await supabase
      .from('organizations')
      .update({ is_active: false })
      .eq('id', orgId)

    setDeactivating(false)

    if (error) {
      setMessage({ type: 'error', text: `Error al desactivar: ${error.message}` })
    } else {
      setOrg((prev) => prev ? { ...prev, is_active: false } : prev)
      setShowDeactivate(false)
      setMessage({ type: 'success', text: 'Organización desactivada.' })
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <Loader2 size={28} color="var(--color-accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />

      </div>
    )
  }

  if (!org) {
    return (
      <div style={{
        padding: '4rem 2rem', textAlign: 'center',
        fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)',
      }}>
        Organización no encontrada.
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Total startups', value: stats.totalStartups, icon: Users, color: '#1F77F6', bg: 'rgba(31,119,246,0.08)' },
    { label: 'Total cohortes', value: stats.totalCohorts, icon: GraduationCap, color: '#1F77F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Cohortes activas', value: stats.activeCohorts, icon: GraduationCap, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ padding: '2rem 1.5rem', maxWidth: 960, margin: '0 auto' }}
    >
      {/* Back link */}
      <Link
        href="/superadmin/organizaciones"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)', textDecoration: 'none',
          marginBottom: '1.5rem', transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
      >
        <ArrowLeft size={14} />
        Volver a organizaciones
      </Link>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-sm)',
          background: 'rgba(31,119,246,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: '1.125rem', color: '#1F77F6',
        }}>
          {org.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: '1.25rem', color: 'var(--color-text-primary)',
          }}>
            {org.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              padding: '0.125rem 0.5rem', borderRadius: 999,
              fontSize: '0.6875rem', fontWeight: 500,
              background: org.is_active !== false ? 'rgba(31,119,246,0.08)' : 'rgba(239,68,68,0.08)',
              color: org.is_active !== false ? '#1F77F6' : '#EF4444',
            }}>
              {org.is_active !== false ? 'Activa' : 'Desactivada'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: message.type === 'success' ? 'rgba(31,119,246,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${message.type === 'success' ? 'rgba(31,119,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
          color: message.type === 'success' ? '#1F77F6' : '#EF4444',
        }}>
          {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {STAT_CARDS.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} style={cardStyle}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                  background: s.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={16} color={s.color} />
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: '1.5rem', color: 'var(--color-text-primary)',
                lineHeight: 1, marginBottom: '0.25rem',
              }}>
                {s.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
              }}>
                {s.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Editable form */}
      <form onSubmit={handleSave}>
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: '1rem', color: 'var(--color-text-primary)',
            marginBottom: '1.25rem',
          }}>
            Información de la organización
          </h2>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Nombre</label>
              <input
                type="text" value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.type} onChange={(e) => updateField('type', e.target.value)} style={inputStyle}>
                {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pais</label>
              <input
                type="text" value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Plan</label>
              <select value={form.plan} onChange={(e) => updateField('plan', e.target.value)} style={inputStyle}>
                {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Max startups</label>
              <input
                type="number" value={form.max_startups}
                onChange={(e) => updateField('max_startups', parseInt(e.target.value) || 0)}
                min={1} style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Email de facturación</label>
              <input
                type="email" value={form.billing_email}
                onChange={(e) => updateField('billing_email', e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Sitio web</label>
              <input
                type="url" value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              type="submit" disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: 8,
                background: saving ? 'var(--color-text-muted)' : 'var(--color-accent-primary)',
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
                transition: 'background 0.15s',
              }}
            >
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>

      {/* Admins section */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 600,
          fontSize: '1rem', color: 'var(--color-text-primary)',
          marginBottom: '1rem',
        }}>
          Administradores
        </h2>

        {admins.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            color: 'var(--color-text-muted)', marginBottom: '1rem',
          }}>
            Esta organización no tiene administradores asignados.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {admins.map((admin) => (
              <div key={admin.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(59,130,246,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 700,
                  color: '#1F77F6', flexShrink: 0,
                }}>
                  {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                    fontWeight: 600, color: 'var(--color-text-primary)',
                  }}>
                    {admin.full_name || 'Sin nombre'}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                  }}>
                    {admin.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assign admin */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '1rem',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--color-text-primary)', marginBottom: '0.5rem',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            <UserPlus size={14} />
            Asignar admin
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            <input
              type="email"
              placeholder="Email del usuario..."
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAssignAdmin()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAssignAdmin}
              disabled={assigningAdmin || !adminEmail.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)',
                background: assigningAdmin || !adminEmail.trim()
                  ? 'var(--color-text-muted)' : 'var(--color-accent-primary)',
                color: '#fff', border: 'none',
                cursor: assigningAdmin || !adminEmail.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
                whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}
            >
              {assigningAdmin && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Asignar
            </button>
          </div>
        </div>
      </div>

      {/* Cohorts section */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 600,
          fontSize: '1rem', color: 'var(--color-text-primary)',
          marginBottom: '1rem',
        }}>
          Cohortes recientes
        </h2>

        {cohorts.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}>
            Esta organización no tiene cohortes registradas.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cohorts.map((cohort) => {
              const status = STATUS_CONFIG[cohort.status] || STATUS_CONFIG.planned
              return (
                <div key={cohort.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                      fontWeight: 600, color: 'var(--color-text-primary)',
                    }}>
                      {cohort.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                      color: 'var(--color-text-secondary)',
                    }}>
                      {new Date(cohort.created_at).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: 999,
                    fontSize: '0.6875rem', fontWeight: 500,
                    background: status.bg, color: status.color,
                  }}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {org.is_active !== false && (
        <div style={{
          ...cardStyle,
          borderColor: 'rgba(239,68,68,0.3)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: '1rem', color: '#EF4444',
            marginBottom: '0.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <AlertTriangle size={16} />
            Zona de peligro
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)', marginBottom: '1rem',
          }}>
            Desactivar esta organización impedirá el acceso de sus usuarios al panel de administración.
          </p>

          {!showDeactivate ? (
            <button
              type="button"
              onClick={() => setShowDeactivate(true)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)',
                background: 'transparent', border: '1px solid #EF4444',
                color: '#EF4444', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Desactivar organización
            </button>
          ) : (
            <div style={{
              padding: '1rem', borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                color: 'var(--color-text-primary)', marginBottom: '0.75rem',
                fontWeight: 600,
              }}>
                Estas seguro de que deseas desactivar &quot;{org.name}&quot;?
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                    background: '#EF4444', color: '#fff', border: 'none',
                    cursor: deactivating ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
                  }}
                >
                  {deactivating && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {deactivating ? 'Desactivando...' : 'Confirmar desactivación'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeactivate(false)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                    background: 'transparent', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </motion.div>
  )
}
