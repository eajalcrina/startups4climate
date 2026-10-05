'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Wrench, Power, CreditCard, Megaphone, Server,
  Check, AlertCircle, Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface SettingFeedback {
  type: 'success' | 'error'
  message: string
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-accent-primary)',
  color: '#fff',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

export default function PlataformaPage() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)

  // Settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [defaultPlan, setDefaultPlan] = useState('starter')
  const [bannerText, setBannerText] = useState('')
  const [bannerActive, setBannerActive] = useState(false)

  // Saving state per setting
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savingBanner, setSavingBanner] = useState(false)

  // Feedback per setting
  const [maintenanceFeedback, setMaintenanceFeedback] = useState<SettingFeedback | null>(null)
  const [planFeedback, setPlanFeedback] = useState<SettingFeedback | null>(null)
  const [bannerFeedback, setBannerFeedback] = useState<SettingFeedback | null>(null)

  // System info
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalOrgs, setTotalOrgs] = useState(0)
  const [totalStartups, setTotalStartups] = useState(0)

  const isSuperadmin = appUser?.role === 'superadmin'

  const loadSettings = useCallback(async () => {
    setLoading(true)

    // Load platform settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('key, value')

    if (settings) {
      for (const s of settings) {
        switch (s.key) {
          case 'maintenance_mode':
            setMaintenanceMode(s.value === true || s.value === 'true')
            break
          case 'default_plan':
            setDefaultPlan(typeof s.value === 'string' ? s.value : 'starter')
            break
          case 'announcement_banner':
            if (typeof s.value === 'object' && s.value !== null) {
              const val = s.value as { text?: string; active?: boolean }
              setBannerText(val.text || '')
              setBannerActive(val.active || false)
            }
            break
        }
      }
    }

    // Load system info counts
    const [usersRes, orgsRes, startupsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('startups').select('*', { count: 'exact', head: true }),
    ])

    setTotalUsers(usersRes.count || 0)
    setTotalOrgs(orgsRes.count || 0)
    setTotalStartups(startupsRes.count || 0)

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSuperadmin) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: loading starts true (setLoading(true) is a no-op), the rest is set after awaits
    loadSettings()
  }, [isSuperadmin, loadSettings])

  const clearFeedback = (setter: (v: SettingFeedback | null) => void) => {
    setTimeout(() => setter(null), 3000)
  }

  const saveSetting = async (
    key: string,
    value: unknown,
    setSaving: (v: boolean) => void,
    setFeedback: (v: SettingFeedback | null) => void,
  ) => {
    setSaving(true)
    setFeedback(null)

    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      setFeedback({ type: 'error', message: 'Error al guardar' })
    } else {
      setFeedback({ type: 'success', message: 'Guardado correctamente' })
    }
    clearFeedback(setFeedback)
    setSaving(false)
  }

  const handleSaveMaintenance = () => {
    saveSetting('maintenance_mode', maintenanceMode, setSavingMaintenance, setMaintenanceFeedback)
  }

  const handleSavePlan = () => {
    saveSetting('default_plan', defaultPlan, setSavingPlan, setPlanFeedback)
  }

  const handleSaveBanner = () => {
    saveSetting('announcement_banner', { text: bannerText, active: bannerActive }, setSavingBanner, setBannerFeedback)
  }

  const renderFeedback = (feedback: SettingFeedback | null) => {
    if (!feedback) return null
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 500,
          color: feedback.type === 'success' ? '#16A34A' : '#DC2626',
        }}
      >
        {feedback.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
        {feedback.message}
      </motion.div>
    )
  }

  if (!isSuperadmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
          Acceso restringido a superadmins.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 32, height: 32,
            border: '3px solid var(--color-border)',
            borderTopColor: '#1F77F6',
            borderRadius: '50%',
          }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Wrench size={20} color="#1F77F6" />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
            Plataforma
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Configuración global de la plataforma
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Maintenance mode */}
        <motion.div {...fadeUp} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: maintenanceMode ? 'rgba(239,68,68,0.08)' : 'rgba(31,119,246,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Power size={20} color={maintenanceMode ? '#DC2626' : '#1F77F6'} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                Modo mantenimiento
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Cuando está activo, los usuarios verán una página de mantenimiento al acceder a la plataforma.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Toggle switch */}
                <button
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  style={{
                    width: 48, height: 26, borderRadius: 13, padding: 2,
                    border: 'none', cursor: 'pointer',
                    background: maintenanceMode ? '#DC2626' : 'var(--color-border)',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    transition: 'transform 0.2s',
                    transform: maintenanceMode ? 'translateX(22px)' : 'translateX(0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </button>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: maintenanceMode ? '#DC2626' : 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {maintenanceMode ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={handleSaveMaintenance} disabled={savingMaintenance} style={{ ...btnPrimary, opacity: savingMaintenance ? 0.5 : 1 }}>
                  {savingMaintenance ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Guardar
                </button>
                {renderFeedback(maintenanceFeedback)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Default plan */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'rgba(59,130,246,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CreditCard size={20} color="#1F77F6" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                Plan por defecto
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Plan que se asigna automáticamente a nuevas organizaciones registradas.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <select value={defaultPlan} onChange={(e) => setDefaultPlan(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 200 }}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <button onClick={handleSavePlan} disabled={savingPlan} style={{ ...btnPrimary, opacity: savingPlan ? 0.5 : 1 }}>
                  {savingPlan ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Guardar
                </button>
                {renderFeedback(planFeedback)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Announcement banner */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'rgba(234,179,8,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Megaphone size={20} color="#CA8A04" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                Banner de anuncio
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Muestra un banner con un mensaje importante en la parte superior de la plataforma.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="Texto del banner, ej: Mantenimiento programado para el viernes..."
                  style={inputStyle}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setBannerActive(!bannerActive)}
                      style={{
                        width: 48, height: 26, borderRadius: 13, padding: 2,
                        border: 'none', cursor: 'pointer',
                        background: bannerActive ? '#1F77F6' : 'var(--color-border)',
                        transition: 'background 0.2s',
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: '#fff',
                        transition: 'transform 0.2s',
                        transform: bannerActive ? 'translateX(22px)' : 'translateX(0)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }} />
                    </button>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: bannerActive ? '#1F77F6' : 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {bannerActive ? 'Visible' : 'Oculto'}
                    </span>
                  </div>
                  <button onClick={handleSaveBanner} disabled={savingBanner} style={{ ...btnPrimary, opacity: savingBanner ? 0.5 : 1 }}>
                    {savingBanner ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Guardar
                  </button>
                  {renderFeedback(bannerFeedback)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System info */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.24 }} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Server size={18} color="var(--color-text-muted)" />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
              Información del sistema
            </h3>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { label: 'Usuarios totales', value: totalUsers, color: '#1F77F6' },
              { label: 'Organizaciones', value: totalOrgs, color: '#1F77F6' },
              { label: 'Startups', value: totalStartups, color: '#8B5CF6' },
              { label: 'Región DB', value: 'us-east-1', color: '#6B7280', isText: true },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                  color: 'var(--color-text-secondary)', marginBottom: '0.375rem',
                  textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 'isText' in item && item.isText ? '0.875rem' : '1.5rem',
                  color: item.color,
                  lineHeight: 1.2,
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </motion.div>
  )
}
