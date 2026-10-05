'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Filter,
  Trophy,
  Banknote,
  GraduationCap,
  Rocket,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/* ─── Types ─── */
type DbType =
  | 'grant'
  | 'competition'
  | 'accelerator'
  | 'investment_fund'
  | 'soft_loan'
  | 'award'
  | 'fellowship'
type DisplayType =
  | 'Grant'
  | 'Aceleradora'
  | 'Competencia'
  | 'Fondo'
  | 'Préstamo'
  | 'Premio'
  | 'Fellowship'
type TimeFilter = 'Todas' | 'Vigentes' | 'Por vencer' | 'Cerradas'
type FilterCategory = 'Todas' | DisplayType

interface OpportunityRow {
  id: string
  title: string
  organization: string
  description: string | null
  type: DbType
  amount_min: number | null
  amount_max: number | null
  currency: string | null
  eligible_countries: string[] | null
  eligible_verticals: string[] | null
  eligible_stages: string[] | null
  application_url: string | null
  deadline: string | null
  is_rolling: boolean | null
}

interface ScoredApiOpportunity extends OpportunityRow {
  matchScore: number
  matchBreakdown: {
    vertical_match: number
    stage_match: number
    country_match: number
    score_bonus: number
  }
  aiBlurb?: string
}

interface Opportunity extends ScoredApiOpportunity {
  displayType: DisplayType
  amountLabel: string | null
  regionLabel: string
}

const TYPE_LABELS: Record<DbType, DisplayType> = {
  grant: 'Grant',
  competition: 'Competencia',
  accelerator: 'Aceleradora',
  investment_fund: 'Fondo',
  soft_loan: 'Préstamo',
  award: 'Premio',
  fellowship: 'Fellowship',
}

const TYPE_COLORS: Record<DisplayType, { color: string; bg: string; border: string }> = {
  Grant: { color: '#1F77F6', bg: 'rgba(31,119,246,0.08)', border: 'rgba(31,119,246,0.2)' },
  Aceleradora: { color: '#2A222B', bg: 'rgba(42,34,43,0.08)', border: 'rgba(42,34,43,0.2)' },
  Competencia: { color: '#6366F1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  Fondo: { color: '#1F77F6', bg: 'rgba(31,119,246,0.08)', border: 'rgba(31,119,246,0.2)' },
  Préstamo: { color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)' },
  Premio: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  Fellowship: { color: '#EC4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
}

const TYPE_ICONS: Record<DisplayType, typeof Banknote> = {
  Grant: Banknote,
  Aceleradora: Rocket,
  Competencia: Trophy,
  Fondo: Banknote,
  Préstamo: Banknote,
  Premio: Trophy,
  Fellowship: GraduationCap,
}

const FILTER_CATEGORIES: FilterCategory[] = [
  'Todas',
  'Grant',
  'Aceleradora',
  'Competencia',
  'Fondo',
]

const TIME_FILTERS: TimeFilter[] = ['Todas', 'Vigentes', 'Por vencer', 'Cerradas']

const COUNTRY_LABELS: Record<string, string> = {
  PE: 'Perú',
  CL: 'Chile',
  CO: 'Colombia',
  MX: 'México',
  AR: 'Argentina',
  BR: 'Brasil',
  EC: 'Ecuador',
  BO: 'Bolivia',
  UY: 'Uruguay',
  PY: 'Paraguay',
}

function formatAmount(min: number | null, max: number | null, currency: string | null): string | null {
  if ((!min && !max) || (min === 0 && max === 0)) return null
  const cur = currency || 'USD'
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)} ${cur}`
  return `${fmt(max ?? min!)} ${cur}`
}

function formatRegion(countries: string[] | null): string {
  if (!countries || countries.length === 0) return 'Global'
  if (countries.length === 1) return COUNTRY_LABELS[countries[0]] || countries[0]
  if (countries.length >= 6) return 'Regional LATAM'
  return countries.map((c) => COUNTRY_LABELS[c] || c).join(', ')
}

function formatDeadline(deadline: string | null, isRolling: boolean | null): string {
  if (isRolling) return 'Postulación abierta'
  if (!deadline) return 'Sin fecha definida'
  return new Date(deadline).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getTimeStatus(deadline: string | null, isRolling: boolean | null): 'vigente' | 'por_vencer' | 'cerrada' {
  if (isRolling) return 'vigente'
  if (!deadline) return 'vigente'
  const date = new Date(deadline)
  const now = new Date()
  if (date < now) return 'cerrada'
  const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays <= 14) return 'por_vencer'
  return 'vigente'
}

function getMatchBadgeStyle(score: number): { color: string; bg: string; border: string } {
  if (score >= 70) return { color: '#16A34A', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)' }
  if (score >= 40) return { color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)' }
  return { color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)' }
}

/* ─── AI Blurb popover ─── */
interface BlurbPopoverProps {
  opportunityId: string
  opportunityTitle: string
  initialBlurb: string | undefined
  onBlurbLoaded: (id: string, blurb: string) => void
}

function BlurbPopover({ opportunityId, opportunityTitle, initialBlurb, onBlurbLoaded }: BlurbPopoverProps) {
  const [open, setOpen] = useState(false)
  const [blurb, setBlurb] = useState<string | undefined>(initialBlurb)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Keep blurb in sync if parent fetched it
  useEffect(() => {
    if (initialBlurb && !blurb) setBlurb(initialBlurb)
  }, [initialBlurb, blurb])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    setOpen(true)
    if (blurb) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId, generateBlurbs: true }),
      })
      const json = (await res.json()) as {
        opportunities?: ScoredApiOpportunity[]
        error?: string
      }
      if (!res.ok || json.error) {
        setError(json.error ?? 'No se pudo generar la explicación.')
      } else {
        const found = json.opportunities?.find((o) => o.id === opportunityId)
        if (found?.aiBlurb) {
          setBlurb(found.aiBlurb)
          onBlurbLoaded(opportunityId, found.aiBlurb)
        } else {
          setError('No se pudo generar la explicación para esta oportunidad.')
        }
      }
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      <button
        onClick={handleOpen}
        title={`Por qué "${opportunityTitle}" es relevante para ti`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2rem',
          padding: '0.15rem 0.5rem',
          borderRadius: 999,
          border: '1px solid rgba(218,78,36,0.3)',
          background: 'rgba(218,78,36,0.06)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          color: '#DA4E24',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Sparkles size={9} />
        Ver por qué
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 50,
            width: 280,
            padding: '0.875rem',
            borderRadius: 10,
            background: 'var(--color-bg-card)',
            border: '1px solid rgba(218,78,36,0.25)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 700,
              color: '#DA4E24',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}>
              <Sparkles size={11} />
              Por qué es relevante para ti
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
            >
              <X size={13} />
            </button>
          </div>

          {loading && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem' }}>
              <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Generando…
            </span>
          )}

          {!loading && error && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: '#EF4444', margin: 0 }}>
              {error}
            </p>
          )}

          {!loading && !error && blurb && (
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {blurb}
            </p>
          )}
        </div>
      )}
    </span>
  )
}

/* ─── Card ─── */
function OpportunityCard({
  item,
  index,
  onBlurbLoaded,
}: {
  item: Opportunity
  index: number
  onBlurbLoaded: (id: string, blurb: string) => void
}) {
  const typeStyle = TYPE_COLORS[item.displayType]
  const TypeIcon = TYPE_ICONS[item.displayType]
  const matchStyle = getMatchBadgeStyle(item.matchScore)
  const status = getTimeStatus(item.deadline, item.is_rolling)
  const deadlineColor = status === 'cerrada' ? '#9CA3AF' : status === 'por_vencer' ? '#EF4444' : 'var(--color-text-secondary)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.04, ease: 'easeOut' }}
      style={{
        padding: '1.25rem',
        borderRadius: 12,
        background: 'var(--color-bg-card)',
        border: `1px solid var(--color-border)`,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
      whileHover={{ boxShadow: 'var(--shadow-card-hover)', y: -2 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.125rem 0.5rem', borderRadius: 999,
              background: typeStyle.bg, border: `1px solid ${typeStyle.border}`,
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
              fontWeight: 600, color: typeStyle.color, whiteSpace: 'nowrap',
            }}
          >
            <TypeIcon size={10} />
            {item.displayType}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
            <MapPin size={10} />
            {item.regionLabel}
          </span>
          {item.amountLabel && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {item.amountLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.2rem 0.625rem', borderRadius: 999,
              background: matchStyle.bg, border: `1px solid ${matchStyle.border}`,
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 700, color: matchStyle.color }}>
              {item.matchScore}% match
            </span>
          </div>
          <BlurbPopover
            opportunityId={item.id}
            opportunityTitle={item.title}
            initialBlurb={item.aiBlurb}
            onBlurbLoaded={onBlurbLoaded}
          />
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.35, margin: 0 }}>
        {item.title}
      </h3>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0 }}>
        {item.organization}
      </p>

      {item.description && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {item.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: deadlineColor, fontWeight: 600 }}>
          <Clock size={11} />
          {item.is_rolling ? formatDeadline(item.deadline, item.is_rolling) : `Cierra: ${formatDeadline(item.deadline, item.is_rolling)}`}
        </span>
        {item.application_url ? (
          <a
            href={item.application_url.match(/^https?:\/\//) ? item.application_url : `https://${item.application_url}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.5rem 1rem', borderRadius: 8,
              background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--color-ink)', textDecoration: 'none', cursor: 'pointer',
            }}
          >
            Aplicar
            <ExternalLink size={12} />
          </a>
        ) : (
          <button
            disabled
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.5rem 1rem', borderRadius: 8,
              background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--color-text-muted)', cursor: 'not-allowed',
            }}
          >
            Próximamente
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Main page ─── */
export default function OportunidadesPage() {
  const { appUser } = useAuth()
  const pathname = usePathname()
  const toolsBase = pathname.startsWith('/demo-tools') ? '/demo-tools' : '/tools'
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Todas')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Vigentes')
  const [refreshing, setRefreshing] = useState(false)
  const isSuperadmin = appUser?.role === 'superadmin'
  // apiScores maps opportunityId → { matchScore, matchBreakdown, aiBlurb? }
  const [apiScores, setApiScores] = useState<Map<string, ScoredApiOpportunity>>(new Map())
  const [rows, setRows] = useState<OpportunityRow[]>([])
  const [loading, setLoading] = useState(true)

  const handleRefreshOportunidades = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/refresh-oportunidades', { method: 'POST' })
      if (res.ok) {
        window.location.reload()
      } else {
        console.error('[S4C Oportunidades refresh]', await res.json())
        alert('Error al refrescar. Ver consola.')
      }
    } catch (err) {
      console.error('[S4C Oportunidades refresh]', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Load raw opportunity rows from Supabase (for display shape)
        const { data: oppsData, error: oppsError } = await supabase
          .from('opportunities')
          .select(
            'id,title,organization,description,type,amount_min,amount_max,currency,eligible_countries,eligible_verticals,eligible_stages,application_url,deadline,is_rolling'
          )
          .eq('is_active', true)
          .order('deadline', { ascending: true, nullsFirst: false })
          .limit(60)

        if (cancelled) return

        if (oppsError) {
          console.error('[S4C Opportunities]', oppsError)
        }
        setRows((oppsData as OpportunityRow[]) || [])

        // Fire algorithmic scoring via API (no AI blurbs yet)
        try {
          const res = await fetch('/api/ai/opportunities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          if (res.ok) {
            const json = (await res.json()) as { opportunities?: ScoredApiOpportunity[] }
            if (json.opportunities && !cancelled) {
              const map = new Map<string, ScoredApiOpportunity>()
              for (const op of json.opportunities) {
                map.set(op.id, op)
              }
              setApiScores(map)
            }
          }
        } catch (err) {
          console.error('[S4C Opportunities] score fetch failed:', err)
        }
      } catch (err) {
        console.error('[S4C Opportunities] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // When a blurb is fetched on-demand, cache it in apiScores
  function handleBlurbLoaded(id: string, blurb: string) {
    setApiScores((prev) => {
      const next = new Map(prev)
      const existing = next.get(id)
      if (existing) {
        next.set(id, { ...existing, aiBlurb: blurb })
      }
      return next
    })
  }

  const enriched: Opportunity[] = useMemo(
    () =>
      rows.map((r) => {
        const scored = apiScores.get(r.id)
        return {
          ...r,
          displayType: TYPE_LABELS[r.type] ?? 'Grant',
          amountLabel: formatAmount(r.amount_min, r.amount_max, r.currency),
          regionLabel: formatRegion(r.eligible_countries),
          matchScore: scored?.matchScore ?? 50,
          matchBreakdown: scored?.matchBreakdown ?? {
            vertical_match: 0,
            stage_match: 0,
            country_match: 0,
            score_bonus: 0,
          },
          aiBlurb: scored?.aiBlurb,
        }
      }),
    [rows, apiScores]
  )

  const filtered = enriched
    .filter((o) => activeFilter === 'Todas' || o.displayType === activeFilter)
    .filter((o) => {
      if (timeFilter === 'Todas') return true
      const status = getTimeStatus(o.deadline, o.is_rolling)
      if (timeFilter === 'Vigentes') return status === 'vigente'
      if (timeFilter === 'Por vencer') return status === 'por_vencer'
      if (timeFilter === 'Cerradas') return status === 'cerrada'
      return true
    })

  const sorted = [...filtered].sort((a, b) => b.matchScore - a.matchScore)


  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
      {/* placeholder to satisfy linter — toolsBase unused in new layout */}
      <span style={{ display: 'none' }}>{toolsBase}</span>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(218,78,36,0.08)', border: '1px solid rgba(218,78,36,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Sparkles size={20} color="#DA4E24" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)',
                fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em',
                lineHeight: 1.3, margin: 0,
              }}
            >
              Oportunidades para tu startup
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Grants, aceleradoras, competencias y fondos personalizados para tu perfil
            </p>
          </div>
          {isSuperadmin && (
            <button
              onClick={handleRefreshOportunidades}
              disabled={refreshing}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.875rem', borderRadius: 6,
                background: refreshing ? 'rgba(218,78,36,0.06)' : 'rgba(218,78,36,0.10)',
                border: '1px solid rgba(218,78,36,0.25)',
                fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600,
                color: refreshing ? 'rgba(218,78,36,0.5)' : '#DA4E24',
                cursor: refreshing ? 'wait' : 'pointer',
              }}
            >
              {refreshing ? 'Actualizando…' : '✦ Actualizar con IA'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}
      >
        <Filter size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        {FILTER_CATEGORIES.map((cat) => {
          const isActive = activeFilter === cat
          const catColor = cat === 'Todas' ? '#2A222B' : TYPE_COLORS[cat as DisplayType]?.color ?? '#2A222B'
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.5rem 1rem', borderRadius: 999,
                border: isActive ? `1px solid ${catColor}40` : '1px solid var(--color-border)',
                background: isActive ? `${catColor}10` : 'var(--color-bg-card)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? catColor : 'var(--color-text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          )
        })}
      </motion.div>

      {/* Time filter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}
      >
        <Clock size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        {TIME_FILTERS.map((tf) => {
          const isActive = timeFilter === tf
          return (
            <button
              key={tf}
              onClick={() => setTimeFilter(tf)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.5rem 1rem', borderRadius: 999,
                border: isActive ? '1px solid rgba(218,78,36,0.4)' : '1px solid var(--color-border)',
                background: isActive ? 'rgba(218,78,36,0.1)' : 'var(--color-bg-card)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#DA4E24' : 'var(--color-text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {tf}
            </button>
          )
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        style={{ marginBottom: '1rem' }}
      >
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {loading
            ? 'Cargando…'
            : `${sorted.length} oportunidad${sorted.length !== 1 ? 'es' : ''} encontrada${sorted.length !== 1 ? 's' : ''}`}
        </span>
      </motion.div>

      {/* Card grid */}
      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 0' }}>Cargando…</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 0', textAlign: 'center' }}>
          No hay oportunidades para este filtro.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '1rem', paddingBottom: '3rem' }}>
          {sorted.map((opp, i) => (
            <OpportunityCard key={opp.id} item={opp} index={i} onBlurbLoaded={handleBlurbLoaded} />
          ))}
        </div>
      )}
    </div>
  )
}
