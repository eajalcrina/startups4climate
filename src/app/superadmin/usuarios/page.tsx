'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Search, ChevronDown, ChevronUp, Save,
  Shield, Loader2, ShieldCheck, ShieldOff, MapPin,
  UserCheck, Clock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface UserRow {
  id: string
  full_name: string
  email: string
  role: string
  org_id: string | null
  startup_name: string | null
  stage: string | null
  created_at: string
  org_name?: string
  // Demo-only enrichment
  region?: string
  lastLoginRel?: string
  mfa?: boolean
  status?: 'active' | 'pending' | 'suspended'
}

interface OrgOption {
  id: string
  name: string
}

const PAGE_SIZE = 50

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto' as const,
}

const ROLE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  founder: { bg: 'rgba(59,130,246,0.1)', text: '#1F77F6', label: 'Founder' },
  admin_org: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6', label: 'Admin Org' },
  superadmin: { bg: 'rgba(220,38,38,0.1)', text: '#DC2626', label: 'Superadmin' },
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(31,119,246,0.10)', text: '#1F77F6', label: 'Activo' },
  pending: { bg: 'rgba(245,158,11,0.10)', text: '#F59E0B', label: 'Pendiente' },
  suspended: { bg: 'rgba(220,38,38,0.10)', text: '#DC2626', label: 'Suspendido' },
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

/* ─────────────── Page component ─────────────── */

export default function UsuariosPage() {
  const { appUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editOrgId, setEditOrgId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const loadUsers = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true)

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role, org_id, startup_name, stage, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    if (searchQuery.trim()) {
      query = query.or(`full_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`)
    }

    const { data, count } = await query

    const orgIds = [...new Set((data || []).map((u) => u.org_id).filter(Boolean))]
    let orgMap: Record<string, string> = {}
    if (orgIds.length > 0) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds as string[])
      orgMap = (orgData || []).reduce((acc, o) => {
        acc[o.id] = o.name
        return acc
      }, {} as Record<string, string>)
    }

    const rows: UserRow[] = (data || []).map((u) => ({
      ...u,
      org_name: u.org_id ? orgMap[u.org_id] || 'Sin nombre' : undefined,
    }))

    if (reset) setUsers(rows)
    else setUsers((prev) => [...prev, ...rows])

    setTotalCount(count || 0)
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
  }, [roleFilter, searchQuery])

  // Load all orgs for the assign dropdown
  useEffect(() => {
    async function loadOrgs() {
      const { data } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name')
      setOrgs(data || [])
    }
    loadOrgs()
  }, [])

  // Reset pagination/expansion when filters change (adjusted during render)
  const filterKey = `${roleFilter}|${statusFilter}|${searchQuery}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    setPage(0)
    setExpandedId(null)
  }

  // Reload on filter change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch: loader flips `loading` on, then sets results after its awaits
    loadUsers(0, true)
  }, [roleFilter, statusFilter, searchQuery, loadUsers])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadUsers(nextPage, false)
  }

  const handleRowClick = (user: UserRow) => {
    if (expandedId === user.id) {
      setExpandedId(null)
    } else {
      setExpandedId(user.id)
      setEditRole(user.role)
      setEditOrgId(user.org_id)
      setSaveSuccess(null)
    }
  }

  const handleSave = async (userId: string) => {
    setSaving(true)
    setSaveSuccess(null)

    const updates: Record<string, unknown> = { role: editRole }
    updates.org_id = editOrgId || null

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) {
      setSaveSuccess('error')
    } else {
      setSaveSuccess(userId)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: editRole,
                org_id: editOrgId,
                org_name: editOrgId
                  ? orgs.find((o) => o.id === editOrgId)?.name || 'Sin nombre'
                  : undefined,
              }
            : u
        )
      )
      setTimeout(() => setSaveSuccess(null), 3000)
    }
    setSaving(false)
  }

  // KPI strip — real counts
  const [roleCounts, setRoleCounts] = useState({ founders: 0, admins: 0, superadmins: 0 })
  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'founder'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin_org'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'superadmin'),
    ]).then(([f, a, s]) => {
      setRoleCounts({ founders: f.count ?? 0, admins: a.count ?? 0, superadmins: s.count ?? 0 })
    })
  }, [])

  const kpis = useMemo(() => [
    { icon: Users, label: 'Total usuarios', value: totalCount, color: '#1F77F6' },
    { icon: UserCheck, label: 'Founders', value: roleCounts.founders, color: '#16A34A' },
    { icon: ShieldCheck, label: 'Admins de org', value: roleCounts.admins, color: '#8B5CF6' },
    { icon: Clock, label: 'Superadmins', value: roleCounts.superadmins, color: '#F59E0B' },
  ], [totalCount, roleCounts])

  if (appUser?.role !== 'superadmin') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', fontFamily: 'var(--font-body)',
        color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)',
      }}>
        No tienes acceso a esta sección.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1280, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Users size={20} color="#1F77F6" />
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
          }}>
            Usuarios
          </h1>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          Gestión de todos los usuarios de la plataforma — founders, admins y superadmins.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid', gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        marginBottom: '1.25rem',
      }}>
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <motion.div
              key={k.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              style={{
                ...cardStyle, padding: '1rem',
                background: `${k.color}0F`,
                borderColor: `${k.color}33`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Icon size={16} color={k.color} />
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: '1.4rem', color: 'var(--color-text-primary)',
                lineHeight: 1.1, marginBottom: '0.2rem',
              }}>
                {k.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.66rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {k.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Filters & count */}
      <motion.div {...fadeUp} style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: '0.75rem', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--color-text-muted)" style={{
                position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
              }} />
              <input
                type="text"
                placeholder="Buscar por nombre, email o startup…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '2rem', minWidth: 280 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>

            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">Todos los roles</option>
              <option value="founder">Founder</option>
              <option value="admin_org">Admin Org</option>
              <option value="superadmin">Superadmin</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="pending">Pendientes</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)', fontWeight: 500,
          }}>
            {users.length} de {totalCount}
          </span>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.1 }}
        style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}
      >
        {loading && users.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 200,
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 28, height: 28,
                border: '3px solid var(--color-border)',
                borderTopColor: '#1F77F6', borderRadius: '50%',
              }}
            />
          </div>
        ) : users.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 200, padding: '2rem',
            textAlign: 'center',
          }}>
            <Users size={24} color="var(--color-text-muted)" style={{ marginBottom: '0.75rem' }} />
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}>
              No se encontraron usuarios
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
            }}>
              <thead>
                <tr>
                  {['Usuario', 'Rol', 'Organización', 'Región', 'Estado', 'MFA', 'Último acceso'].map((h) => (
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
                  <th style={{
                    width: 32, padding: '0.75rem 0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                  }} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const badge = ROLE_BADGES[user.role] || ROLE_BADGES.founder
                  const statusBadge = STATUS_BADGES[user.status || 'active']
                  const isExpanded = expandedId === user.id
                  const initials = (user.full_name || user.email).split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        onClick={() => handleRowClick(user)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(31,119,246,0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: `${badge.text}22`, color: badge.text,
                              fontFamily: 'var(--font-heading)', fontWeight: 700,
                              fontSize: '0.72rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                {user.full_name || 'Sin nombre'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.1875rem 0.5rem', borderRadius: 999,
                            fontSize: 'var(--text-xs)', fontWeight: 500,
                            background: badge.bg, color: badge.text,
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          color: 'var(--color-text-secondary)', whiteSpace: 'nowrap',
                        }}>
                          <div>{user.org_name || '-'}</div>
                          {user.startup_name && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                              {user.startup_name}
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem', whiteSpace: 'nowrap',
                          color: 'var(--color-text-secondary)',
                        }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={12} color="var(--color-text-muted)" />
                            {user.region || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.1875rem 0.5rem', borderRadius: 999,
                            fontSize: 'var(--text-xs)', fontWeight: 500,
                            background: statusBadge.bg, color: statusBadge.text,
                          }}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {user.mfa
                            ? <ShieldCheck size={14} color="#1F77F6" />
                            : <ShieldOff size={14} color="var(--color-text-muted)" />}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          color: 'var(--color-text-secondary)', whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {user.lastLoginRel || new Date(user.created_at).toLocaleDateString('es-PE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {isExpanded
                            ? <ChevronUp size={14} color="var(--color-text-muted)" />
                            : <ChevronDown size={14} color="var(--color-text-muted)" />}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ duration: 0.2 }}
                              style={{
                                padding: '1rem 1.5rem',
                                background: 'rgba(31,119,246,0.02)',
                                borderTop: '1px solid var(--color-border)',
                              }}
                            >
                              <div style={{
                                display: 'flex', flexWrap: 'wrap',
                                gap: '1.25rem', alignItems: 'flex-end',
                              }}>
                                {/* Change role */}
                                <div>
                                  <label style={{
                                    fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
                                    fontWeight: 600, color: 'var(--color-text-primary)',
                                    marginBottom: '0.25rem', display: 'block',
                                  }}>
                                    <Shield size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                                    Cambiar rol
                                  </label>
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    style={{ ...selectStyle, minWidth: 160 }}
                                  >
                                    <option value="founder">Founder</option>
                                    <option value="admin_org">Admin Org</option>
                                    <option value="superadmin">Superadmin</option>
                                  </select>
                                </div>

                                {/* Assign org */}
                                <div>
                                    <label style={{
                                      fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
                                      fontWeight: 600, color: 'var(--color-text-primary)',
                                      marginBottom: '0.25rem', display: 'block',
                                    }}>
                                      Asignar organización
                                    </label>
                                    <select
                                      value={editOrgId || ''}
                                      onChange={(e) => setEditOrgId(e.target.value || null)}
                                      style={{ ...selectStyle, minWidth: 200 }}
                                    >
                                      <option value="">Sin organización</option>
                                      {orgs.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                      ))}
                                    </select>
                                </div>

                                {/* Save button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSave(user.id)
                                  }}
                                  disabled={saving}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 1rem', borderRadius: 8,
                                    background: 'var(--color-accent-primary)',
                                    color: '#fff', border: 'none', cursor: 'pointer',
                                    fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                                    fontWeight: 600, transition: 'background 0.15s',
                                    opacity: saving ? 0.7 : 1,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-hover)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-accent-primary)')}
                                >
                                  {saving
                                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    : <Save size={14} />}
                                  Guardar cambios
                                </button>

                                {saveSuccess === user.id && (
                                  <motion.span
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    style={{
                                      fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                                      fontWeight: 500, color: '#1F77F6',
                                    }}
                                  >
                                    Cambios guardados
                                  </motion.span>
                                )}

                                {saveSuccess === 'error' && (
                                  <span style={{
                                    fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                                    color: '#DC2626',
                                  }}>
                                    Error al guardar
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: '1rem', borderTop: '1px solid var(--color-border)',
          }}>
            <button
              onClick={handleLoadMore}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                fontWeight: 500, color: 'var(--color-text-primary)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              Cargar más usuarios
            </button>
          </div>
        )}

        {loading && users.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '1rem',
            borderTop: '1px solid var(--color-border)',
          }}>
            <Loader2 size={20} color="#1F77F6" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
