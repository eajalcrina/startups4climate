'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, Plus, Search, Loader2, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSuperadmin } from '@/context/SuperadminContext'
import { supabase } from '@/lib/supabase'
import { DEMO_EXECUTOR_ORGS } from '@/lib/demo/superadmin-fixtures'

interface OrgRow {
  id: string
  name: string
  type: string | null
  country: string | null
  plan: string | null
  is_active: boolean
  created_at: string
  startups_count: number
}

const TYPE_LABELS: Record<string, string> = {
  university: 'Universidad',
  incubator: 'Incubadora',
  accelerator: 'Aceleradora',
  hub: 'Hub',
  government: 'Gobierno',
  ngo: 'ONG',
  other: 'Otro',
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
}

export default function OrganizacionesPage() {
  const { appUser, isDemo } = useAuth()
  const { isSuperadmin } = useSuperadmin()
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (appUser && appUser.role !== 'superadmin') {
      router.replace('/admin')
      return
    }

    if (isDemo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- demo fixtures applied once auth resolves; live path sets state after awaits
      setOrgs(
        DEMO_EXECUTOR_ORGS.map((o, i) => ({
          id: o.id,
          name: o.name,
          type: o.type,
          country: 'Perú',
          plan: o.startupsCount >= 35 ? 'enterprise' : o.startupsCount >= 22 ? 'professional' : 'starter',
          is_active: true,
          created_at: new Date(2025, i, 15).toISOString(),
          startups_count: o.startupsCount,
        }))
      )
      setLoading(false)
      return
    }

    async function loadOrgs() {
      setLoading(true)

      const { data: orgsData, error } = await supabase
        .from('organizations')
        .select('id, name, type, country, plan, is_active, created_at')
        .order('created_at', { ascending: false })

      if (error || !orgsData) {
        setOrgs([])
        setLoading(false)
        return
      }

      // Count startups per org via profiles
      const orgIds = orgsData.map((o) => o.id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('org_id')
        .in('org_id', orgIds)
        .eq('role', 'founder')

      const countMap: Record<string, number> = {}
      profiles?.forEach((p) => {
        if (p.org_id) {
          countMap[p.org_id] = (countMap[p.org_id] || 0) + 1
        }
      })

      setOrgs(
        orgsData.map((o) => ({
          ...o,
          is_active: o.is_active !== false,
          startups_count: countMap[o.id] || 0,
        }))
      )
      setLoading(false)
    }

    loadOrgs()
  }, [appUser, router, isDemo])

  if (!isSuperadmin) return null

  const filtered = search.trim()
    ? orgs.filter((o) =>
        o.name.toLowerCase().includes(search.toLowerCase())
      )
    : orgs

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
            marginBottom: '0.25rem',
          }}>
            Organizaciones
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            Gestiona todas las organizaciones de la plataforma
          </p>
        </div>
        <Link
          href="/superadmin/organizaciones/nueva"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 8,
            background: 'var(--color-accent-primary)', color: '#fff',
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
            textDecoration: 'none', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-accent-primary)')}
        >
          <Plus size={16} />
          Nueva organización
        </Link>
      </div>

      {/* Search */}
      <div style={{
        position: 'relative', marginBottom: '1.5rem', maxWidth: 400,
      }}>
        <Search size={16} color="var(--color-text-muted)" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        }} />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.25rem',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
            background: 'var(--color-bg-card)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          ...cardStyle,
          padding: '4rem 2rem', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--color-bg-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <Building2 size={24} color="var(--color-text-muted)" />
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
            color: 'var(--color-text-primary)', marginBottom: '0.5rem',
          }}>
            {search ? 'No se encontraron organizaciones' : 'No hay organizaciones registradas'}
          </p>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)', maxWidth: 400,
          }}>
            {search
              ? 'Intenta con otro término de búsqueda.'
              : 'Crea la primera organización para comenzar a gestionar la plataforma.'}
          </p>
        </div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
            }}>
              <thead>
                <tr>
                  {['Nombre', 'Tipo', 'País', 'Plan', 'Startups', 'Estado', 'Fecha creación'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--color-border)',
                      fontWeight: 600, color: 'var(--color-text-secondary)',
                      fontSize: 'var(--text-2xs)', textTransform: 'uppercase',
                      letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, i) => {
                  const isActive = org.is_active !== false
                  const statusColor = isActive ? '#1F77F6' : '#EF4444'
                  const statusBg = isActive ? 'rgba(31,119,246,0.08)' : 'rgba(239,68,68,0.08)'
                  const statusLabel = isActive ? 'Activa' : 'Desactivada'

                  return (
                    <motion.tr
                      key={org.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                      onClick={() => router.push(`/superadmin/organizaciones/${org.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{
                        padding: '0.75rem 1rem', fontWeight: 600,
                        color: 'var(--color-text-primary)', whiteSpace: 'nowrap',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                            background: 'rgba(31,119,246,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 'var(--text-2xs)', fontWeight: 700, color: '#1F77F6',
                          }}>
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          {org.name}
                          <ChevronRight size={14} color="var(--color-text-muted)" />
                        </div>
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem', color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}>
                        {TYPE_LABELS[org.type || ''] || org.type || '-'}
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem', color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}>
                        {org.country || '-'}
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem', whiteSpace: 'nowrap',
                      }}>
                        {org.plan ? (
                          <span style={{
                            padding: '0.1875rem 0.5rem', borderRadius: 999,
                            fontSize: 'var(--text-xs)', fontWeight: 500,
                            background: 'rgba(59,130,246,0.08)', color: '#1F77F6',
                          }}>
                            {PLAN_LABELS[org.plan] || org.plan}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem', color: 'var(--color-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {org.startups_count}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.1875rem 0.5rem', borderRadius: 999,
                          fontSize: 'var(--text-xs)', fontWeight: 500,
                          background: statusBg, color: statusColor,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem', color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {new Date(org.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}
