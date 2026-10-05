'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LifeBuoy, Plus, Search, ChevronDown, ChevronUp,
  Send, X, AlertCircle, Clock, CheckCircle2, XCircle,
  MessageSquare, Lock, Activity, Timer,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface Ticket {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  reporter_id: string
  org_id: string | null
  created_at: string
  reporter_name?: string
  org_name?: string
  // Demo enrichment
  publicCode?: string
  owner?: string
  slaLabel?: string
  slaState?: 'ok' | 'warn' | 'breach'
}

interface TicketMessage {
  id: string
  ticket_id: string
  author_id: string
  content: string
  is_internal: boolean
  created_at: string
  author_name?: string
}

interface Organization {
  id: string
  name: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'rgba(59,130,246,0.1)', text: '#1F77F6', label: 'Abierto' },
  in_progress: { bg: 'rgba(234,179,8,0.1)', text: '#CA8A04', label: 'En progreso' },
  resolved: { bg: 'rgba(34,197,94,0.1)', text: '#16A34A', label: 'Resuelto' },
  closed: { bg: 'rgba(107,114,128,0.1)', text: '#6B7280', label: 'Cerrado' },
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'rgba(107,114,128,0.1)', text: '#6B7280', label: 'Baja' },
  medium: { bg: 'rgba(59,130,246,0.1)', text: '#1F77F6', label: 'Media' },
  high: { bg: 'rgba(249,115,22,0.1)', text: '#EA580C', label: 'Alta' },
  critical: { bg: 'rgba(239,68,68,0.1)', text: '#DC2626', label: 'Critica' },
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  auth: { label: 'Auth', color: '#1F77F6' },
  billing: { label: 'Billing', color: '#8B5CF6' },
  bug: { label: 'Bug', color: '#DC2626' },
  data: { label: 'Datos', color: '#1F77F6' },
  ai: { label: 'AI', color: '#EC4899' },
  ui: { label: 'UI', color: '#F59E0B' },
  integraciones: { label: 'Integraciones', color: '#16A34A' },
  feature_request: { label: 'Feature', color: '#06B6D4' },
  account: { label: 'Cuenta', color: '#1F77F6' },
  other: { label: 'Otro', color: '#94A3B8' },
}

const CATEGORIES = [
  { value: 'auth', label: 'Auth' },
  { value: 'billing', label: 'Billing' },
  { value: 'bug', label: 'Bug' },
  { value: 'data', label: 'Datos' },
  { value: 'ai', label: 'AI' },
  { value: 'ui', label: 'UI' },
  { value: 'integraciones', label: 'Integraciones' },
  { value: 'feature_request', label: 'Solicitud de funcionalidad' },
  { value: 'other', label: 'Otro' },
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
  padding: '0.625rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
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

/* ─────────────── DEMO TICKETS (32) ─────────────── */
type DemoTicket = Omit<Ticket, 'reporter_id' | 'org_id'> & {
  reporter_name: string
  org_name: string
  owner: string
  publicCode: string
  slaLabel: string
  slaState: 'ok' | 'warn' | 'breach'
}

const DEMO_TICKETS: DemoTicket[] = [
  { id: 'inc-001', publicCode: '#INC-2026-0142', title: 'Solicitud: agregar campo "región" a perfil founder', description: 'Admin org pide poder filtrar founders por región dentro del cohort.', status: 'open', priority: 'low', category: 'feature_request', reporter_name: 'Patricia Quintanilla', org_name: 'Demo Incubadora', owner: 'Sin asignar', created_at: '2026-04-15T10:00:00-05:00', slaLabel: 'Vence en 6 d', slaState: 'ok' },
  { id: 'inc-002', publicCode: '#INC-2026-0141', title: 'Solicitud: dark mode toggle en navbar', description: 'Founders quieren poder alternar entre light/dark sin abrir configuración de perfil.', status: 'open', priority: 'low', category: 'feature_request', reporter_name: 'Karina Loayza', org_name: 'Universidad Wiener', owner: 'Sin asignar', created_at: '2026-04-14T14:30:00-05:00', slaLabel: 'Vence en 1 sem', slaState: 'ok' },
  { id: 'inc-003', publicCode: '#INC-2026-0140', title: 'Tabla de cohorts no ordena por fecha de inicio', description: 'Click en columna "Fecha inicio" no dispara ordenamiento. Mejora menor de UX.', status: 'resolved', priority: 'low', category: 'ui', reporter_name: 'Carlos Pinedo', org_name: 'UNAMAD', owner: 'Eddie Ajalcriña', created_at: '2026-04-13T09:50:00-05:00', slaLabel: 'Resuelto en 1 d', slaState: 'ok' },
]

export default function IncidenciasPage() {
  const { appUser, isDemo } = useAuth()
  // Reference time for relative KPIs, captured once on mount (keeps render pure)
  const [now] = useState(() => Date.now())
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [orgs, setOrgs] = useState<Organization[]>([])

  // Filters
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')

  // New ticket form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newCategory, setNewCategory] = useState('other')
  const [newOrgId, setNewOrgId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Message form
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Status update
  const [statusUpdate, setStatusUpdate] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const isSuperadmin = appUser?.role === 'superadmin'

  const loadDemoTickets = useCallback(() => {
    setTickets(DEMO_TICKETS.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      reporter_id: '',
      org_id: null,
      created_at: t.created_at,
      reporter_name: t.reporter_name,
      org_name: t.org_name,
      owner: t.owner,
      publicCode: t.publicCode,
      slaLabel: t.slaLabel,
      slaState: t.slaState,
    })))
    setLoading(false)
  }, [])

  const loadTickets = useCallback(async () => {
    const { data: ticketData } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (!ticketData) {
      setTickets([])
      setLoading(false)
      return
    }

    const reporterIds = [...new Set(ticketData.map((t) => t.reporter_id).filter(Boolean))]
    const orgIds = [...new Set(ticketData.map((t) => t.org_id).filter(Boolean))]

    let profileMap: Record<string, string> = {}
    if (reporterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reporterIds)
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name || 'Sin nombre']))
      }
    }

    let orgMap: Record<string, string> = {}
    if (orgIds.length > 0) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds)
      if (orgData) {
        orgMap = Object.fromEntries(orgData.map((o) => [o.id, o.name]))
      }
    }

    setTickets(
      ticketData.map((t) => ({
        ...t,
        reporter_name: profileMap[t.reporter_id] || 'Desconocido',
        org_name: t.org_id ? orgMap[t.org_id] || '-' : '-',
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSuperadmin) return
    if (isDemo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- demo fixtures applied once auth resolves; the live path sets state after awaits
      loadDemoTickets()
      return
    }
    loadTickets()

    supabase
      .from('organizations')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setOrgs(data)
      })
  }, [isSuperadmin, isDemo, loadTickets, loadDemoTickets])

  const loadMessages = useCallback(async (ticketId: string) => {
    if (isDemo) {
      setMessages([
        { id: 'dm-1', ticket_id: ticketId, author_id: '', content: 'He revisado los logs — confirmo el patrón. Escalando a infra.', is_internal: true, created_at: new Date(Date.now() - 6 * 3600_000).toISOString(), author_name: 'Lorenzo Ortiz' },
        { id: 'dm-2', ticket_id: ticketId, author_id: '', content: 'Gracias por reportar, estamos en ello. Te avisamos cuando esté resuelto.', is_internal: false, created_at: new Date(Date.now() - 4 * 3600_000).toISOString(), author_name: 'Eddie Ajalcriña' },
      ])
      return
    }
    setLoadingMessages(true)
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map((m) => m.author_id).filter(Boolean))]
      let authorMap: Record<string, string> = {}
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds)
        if (profiles) {
          authorMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name || 'Sin nombre']))
        }
      }
      setMessages(
        data.map((m) => ({
          ...m,
          author_name: authorMap[m.author_id] || 'Desconocido',
        }))
      )
    } else {
      setMessages([])
    }
    setLoadingMessages(false)
  }, [isDemo])

  const handleExpand = (ticket: Ticket) => {
    if (expandedId === ticket.id) {
      setExpandedId(null)
      setMessages([])
      return
    }
    setExpandedId(ticket.id)
    setStatusUpdate(ticket.status)
    setNewMessage('')
    setIsInternal(false)
    loadMessages(ticket.id)
  }

  const handleSubmitTicket = async () => {
    if (!newTitle.trim() || !appUser) return
    setSubmitting(true)

    const { error } = await supabase.from('support_tickets').insert({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      category: newCategory,
      org_id: newOrgId || null,
      reporter_id: appUser.id,
      status: 'open',
    })

    if (!error) {
      setNewTitle('')
      setNewDesc('')
      setNewPriority('medium')
      setNewCategory('other')
      setNewOrgId('')
      setShowForm(false)
      loadTickets()
    }
    setSubmitting(false)
  }

  const handleStatusSave = async (ticketId: string) => {
    if (isDemo) return
    setSavingStatus(true)
    await supabase
      .from('support_tickets')
      .update({ status: statusUpdate })
      .eq('id', ticketId)
    await loadTickets()
    setSavingStatus(false)
  }

  const handleSendMessage = async (ticketId: string) => {
    if (!newMessage.trim() || !appUser || isDemo) {
      if (isDemo && newMessage.trim()) {
        setMessages((prev) => [...prev, {
          id: `dm-${Date.now()}`, ticket_id: ticketId, author_id: appUser?.id || '',
          content: newMessage.trim(), is_internal: isInternal,
          created_at: new Date().toISOString(),
          author_name: appUser?.full_name || 'Tú',
        }])
        setNewMessage('')
        setIsInternal(false)
      }
      return
    }
    setSendingMessage(true)

    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      author_id: appUser.id,
      content: newMessage.trim(),
      is_internal: isInternal,
    })

    if (!error) {
      setNewMessage('')
      setIsInternal(false)
      loadMessages(ticketId)
    }
    setSendingMessage(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filtered = tickets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        (t.reporter_name || '').toLowerCase().includes(q) ||
        (t.org_name || '').toLowerCase().includes(q) ||
        (t.publicCode || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // KPI strip
  const kpis = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length
    const critical = tickets.filter((t) => t.priority === 'critical' && (t.status === 'open' || t.status === 'in_progress')).length
    const breached = tickets.filter((t) => t.slaState === 'breach').length
    const resolved7d = tickets.filter((t) => {
      if (t.status !== 'resolved' && t.status !== 'closed') return false
      const days = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return days <= 7
    }).length
    return [
      { icon: AlertCircle, label: 'Abiertas', value: open + inProgress, color: '#1F77F6' },
      { icon: AlertCircle, label: 'Críticas activas', value: critical, color: '#DC2626' },
      { icon: Timer, label: 'SLA vencidos', value: breached, color: '#EA580C' },
      { icon: CheckCircle2, label: 'Resueltas 7 d', value: resolved7d, color: '#16A34A' },
      { icon: Activity, label: 'MTTR', value: '5h 42m', color: '#8B5CF6' },
    ]
  }, [tickets, now])

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
      style={{ padding: '2rem 1.5rem', maxWidth: 1280, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <LifeBuoy size={20} color="#1F77F6" />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              Incidencias
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Gestiona tickets de soporte, SLA y reportes de problemas en plataforma.
          </p>
        </div>
        {!isDemo && (
          <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Nueva incidencia'}
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid', gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        marginBottom: '1.25rem',
      }}>
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <motion.div
              key={k.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.04 }}
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

      {/* New ticket form (real mode only) */}
      <AnimatePresence>
        {showForm && !isDemo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '1.5rem' }}
          >
            <div style={cardStyle}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                Nueva incidencia
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                    Título *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Describe brevemente el problema"
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                    Descripción
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Detalla el problema, pasos para reproducir, etc."
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                    Prioridad
                  </label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={selectStyle}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Critica</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                    Categoría
                  </label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={selectStyle}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                    Organización (opcional)
                  </label>
                  <select value={newOrgId} onChange={(e) => setNewOrgId(e.target.value)} style={selectStyle}>
                    <option value="">Sin organización</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSubmitTicket}
                  disabled={!newTitle.trim() || submitting}
                  style={{ ...btnPrimary, opacity: !newTitle.trim() || submitting ? 0.5 : 1 }}
                >
                  <Send size={14} />
                  {submitting ? 'Creando...' : 'Crear incidencia'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div {...fadeUp} style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 240 }}>
            <Search size={16} color="var(--color-text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título, reportador u org…"
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }}>
            <option value="all">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En progreso</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }}>
            <option value="all">Todas las prioridades</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Tickets table */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <LifeBuoy size={20} color="var(--color-text-muted)" />
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              No hay incidencias que coincidan con los filtros
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  {['Código', 'Título', 'Reportador', 'Categoría', 'Prioridad', 'Estado', 'Owner', 'SLA'].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: 'left', padding: '0.625rem 0.75rem',
                        borderBottom: '1px solid var(--color-border)',
                        fontWeight: 600, color: 'var(--color-text-secondary)',
                        fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                  <th style={{ width: 40, borderBottom: '1px solid var(--color-border)' }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => {
                  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium
                  const catCfg = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.other
                  const isExpanded = expandedId === ticket.id
                  const slaColor = ticket.slaState === 'breach' ? '#DC2626' : ticket.slaState === 'warn' ? '#F59E0B' : '#16A34A'

                  return (
                    <React.Fragment key={ticket.id}>
                      <tr
                        onClick={() => handleExpand(ticket)}
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-muted)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {ticket.publicCode || ticket.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', maxWidth: 360 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {ticket.priority === 'critical' && <AlertCircle size={13} color="#DC2626" />}
                            {ticket.priority === 'high' && <AlertCircle size={13} color="#EA580C" />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.title}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>{ticket.reporter_name}</div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)' }}>{ticket.org_name}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.15rem 0.4rem', borderRadius: 4,
                            fontSize: '0.66rem', fontWeight: 600,
                            background: `${catCfg.color}1A`, color: catCfg.color,
                          }}>
                            {catCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{
                            padding: '0.1875rem 0.5rem', borderRadius: 999,
                            fontSize: '0.6875rem', fontWeight: 500,
                            background: priorityCfg.bg, color: priorityCfg.text,
                          }}>
                            {priorityCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.1875rem 0.5rem', borderRadius: 999,
                            fontSize: '0.6875rem', fontWeight: 500,
                            background: statusCfg.bg, color: statusCfg.text,
                          }}>
                            {ticket.status === 'open' && <Clock size={10} />}
                            {ticket.status === 'in_progress' && <Clock size={10} />}
                            {ticket.status === 'resolved' && <CheckCircle2 size={10} />}
                            {ticket.status === 'closed' && <XCircle size={10} />}
                            {statusCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                          {ticket.owner || 'Sin asignar'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                          {ticket.slaLabel ? (
                            <span style={{
                              fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                              color: slaColor, fontWeight: 600,
                            }}>
                              {ticket.slaLabel}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                              {formatDate(ticket.created_at)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {isExpanded ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--color-border)' }}>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              style={{ overflow: 'hidden', padding: '1rem 1.5rem 1.5rem', background: 'var(--color-bg-muted)' }}
                            >
                              {ticket.description && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                                    Descripción
                                  </h4>
                                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {ticket.description}
                                  </p>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                  Cambiar estado:
                                </label>
                                <select
                                  value={statusUpdate}
                                  onChange={(e) => setStatusUpdate(e.target.value)}
                                  style={{ ...selectStyle, width: 'auto', minWidth: 160 }}
                                >
                                  <option value="open">Abierto</option>
                                  <option value="in_progress">En progreso</option>
                                  <option value="resolved">Resuelto</option>
                                  <option value="closed">Cerrado</option>
                                </select>
                                <button
                                  onClick={() => handleStatusSave(ticket.id)}
                                  disabled={savingStatus || statusUpdate === ticket.status || isDemo}
                                  style={{
                                    ...btnPrimary,
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    opacity: savingStatus || statusUpdate === ticket.status || isDemo ? 0.5 : 1,
                                  }}
                                >
                                  {savingStatus ? 'Guardando...' : 'Guardar'}
                                </button>
                                {isDemo && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    (Demo: cambios no persisten)
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <MessageSquare size={14} />
                                  Mensajes
                                </h4>

                                {loadingMessages ? (
                                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                    Cargando mensajes...
                                  </p>
                                ) : messages.length === 0 ? (
                                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    No hay mensajes aún.
                                  </p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
                                    {messages.map((msg) => (
                                      <div
                                        key={msg.id}
                                        style={{
                                          padding: '0.75rem 1rem',
                                          borderRadius: 'var(--radius-md)',
                                          background: msg.is_internal ? 'rgba(234,179,8,0.06)' : 'var(--color-bg-card)',
                                          border: `1px solid ${msg.is_internal ? 'rgba(234,179,8,0.2)' : 'var(--color-border)'}`,
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                              {msg.author_name}
                                            </span>
                                            {msg.is_internal && (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1875rem', fontFamily: 'var(--font-body)', fontSize: '0.625rem', color: '#CA8A04', fontWeight: 600 }}>
                                                <Lock size={9} />
                                                Nota interna
                                              </span>
                                            )}
                                          </div>
                                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                            {formatDate(msg.created_at)}
                                          </span>
                                        </div>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                          {msg.content}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                  <div style={{ flex: 1 }}>
                                    <textarea
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      placeholder="Escribe un mensaje..."
                                      rows={2}
                                      style={{ ...inputStyle, resize: 'vertical' }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={(e) => setIsInternal(e.target.checked)}
                                        style={{ accentColor: '#CA8A04' }}
                                      />
                                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                        Nota interna
                                      </span>
                                    </label>
                                  </div>
                                  <button
                                    onClick={() => handleSendMessage(ticket.id)}
                                    disabled={!newMessage.trim() || sendingMessage}
                                    style={{
                                      ...btnPrimary,
                                      padding: '0.625rem',
                                      opacity: !newMessage.trim() || sendingMessage ? 0.5 : 1,
                                    }}
                                  >
                                    <Send size={16} />
                                  </button>
                                </div>
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
      </motion.div>
    </motion.div>
  )
}
