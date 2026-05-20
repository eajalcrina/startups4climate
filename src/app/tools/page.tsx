'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  FlaskConical,
  Rocket,
  Building2,
  TrendingUp,
  Download,
  Lock,
  Lightbulb,
  Filter,
  X,
  Layers,
  Award,
  FileText,
  Target,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Button,
  Card,
  ProgressRing,
  SectionHeader,
  InsightBox,
  Chip,
} from '@/components/ui'
import {
  TOOLS,
  TOOLS_BY_STAGE,
  STAGE_META,
  CATEGORIES,
  type ToolDef,
  type ToolCategory,
} from '@/lib/tools-data'
import { Users } from 'lucide-react'
import { getProgress, hydrateProgressFromSupabase, type ProgressMap } from '@/lib/progress'
import { generateGlobalReport as generateGlobalReportUtil } from '@/lib/global-report'

/* ─── Stage icon mapping ─── */
const STAGE_ICONS = {
  0: Lightbulb,
  1: FlaskConical,
  2: Rocket,
  3: Building2,
  4: TrendingUp,
} as const

/* ─── Category color mapping (kept for ToolCard) ─── */
const CATEGORY_COLORS: Record<ToolCategory, { color: string; bg: string }> = {
  Estrategia: { color: '#DA4E24',  bg: 'rgba(218,78,36,0.08)' },
  Mercado:    { color: '#3B82F6',  bg: 'rgba(29,78,216,0.08)' },
  Producto:   { color: '#3B82F6',  bg: 'rgba(29,78,216,0.08)' },
  Finanzas:   { color: '#94A3B8',  bg: 'rgba(148,163,184,0.08)' },
  Ventas:     { color: '#DA4E24',  bg: 'rgba(218,78,36,0.08)' },
  Marketing:  { color: '#DA4E24',  bg: 'rgba(218,78,36,0.08)' },
  Equipo:     { color: '#3B82F6',  bg: 'rgba(29,78,216,0.08)' },
}

const springReveal = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', damping: 20, stiffness: 100 } as const,
}

/* ─── Tool card (unchanged from original) ─── */
function ToolCard({
  tool,
  done,
  locked,
  idx,
}: {
  tool: ToolDef
  done: boolean
  locked: boolean
  idx: number
}) {
  const catColor = CATEGORY_COLORS[tool.category]
  const [hovered, setHovered] = useState(false)

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.04 }}
      onMouseEnter={() => !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.25rem 1.375rem',
        borderRadius: 'var(--radius-md)',
        background: '#111111',
        border: done
          ? '1px solid rgba(29,78,216,0.35)'
          : hovered && !locked
          ? '1px solid rgba(218,78,36,0.40)'
          : '1px solid rgba(255,255,255,0.07)',
        textDecoration: 'none',
        transition: 'transform 0.15s var(--ease-spring), box-shadow 0.15s ease, border-color 0.15s ease',
        position: 'relative' as const,
        overflow: 'hidden',
        opacity: locked ? 0.45 : 1,
        cursor: locked ? 'not-allowed' : 'pointer',
        transform: hovered && !locked ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered && !locked ? '0 12px 24px -8px rgba(0,0,0,0.5)' : 'var(--shadow-card)',
        minHeight: 130,
      }}
    >
      {!locked && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle at top right, ${tool.stageBg}, transparent)`,
          pointerEvents: 'none',
        }} />
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
      }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            color: catColor.color,
            background: catColor.bg,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {tool.category}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {done && !locked && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(31,119,246,0.08)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 700,
              color: 'var(--color-accent-secondary)',
            }}>
              <CheckCircle2 size={10} />
              Completada
            </span>
          )}
          {locked && (
            <Lock size={13} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          )}
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-base)',
          fontWeight: 700,
          color: locked ? 'var(--color-text-muted)' : 'var(--color-ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {tool.shortName}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.5,
          color: 'var(--color-text-secondary)',
          margin: 0,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {tool.description}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Clock size={11} color="var(--color-text-muted)" />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {tool.estimatedTime}
          </span>
        </span>
        {!locked && (
          <ArrowRight
            size={15}
            color={done ? tool.stageColor : 'var(--color-text-muted)'}
            style={{ flexShrink: 0, opacity: hovered ? 1 : 0.5, transition: 'opacity 0.2s' }}
          />
        )}
      </div>
    </motion.div>
  )

  if (locked) {
    return <div>{inner}</div>
  }

  return (
    <Link href={`/tools/${tool.id}`} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  )
}

/* ─── Main dashboard ─── */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ActiveCohort {
  cohortId: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  orgName: string | null
  orgLogoUrl: string | null
}

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

function formatCohortDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  const fmt = (iso: string, withYear: boolean): string => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const day = d.getUTCDate()
    const month = SPANISH_MONTHS[d.getUTCMonth()]
    return withYear ? `${day} ${month} ${d.getUTCFullYear()}` : `${day} ${month}`
  }
  if (start && end) {
    const sd = new Date(start)
    const ed = new Date(end)
    const sameYear = sd.getUTCFullYear() === ed.getUTCFullYear()
    return `${fmt(start, !sameYear)} – ${fmt(end, true)}`
  }
  return fmt((start || end) as string, true)
}

function cohortProgressPct(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null
  const now = Date.now()
  if (now <= s) return 0
  if (now >= e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

export default function ToolsDashboard() {
  const { user, appUser, isDemo } = useAuth()
  const [progress, setProgress] = useState<ProgressMap>({})
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'Todos'>('Todos')
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false)
  const [activeCohort, setActiveCohort] = useState<ActiveCohort | null>(null)

  useEffect(() => {
    if (user) {
      setProgress(getProgress(user.id))
      if (isDemo) return
      hydrateProgressFromSupabase(user.id).then((changed) => {
        if (changed) {
          setProgress(getProgress(user.id))
        }
      })
    }
  }, [user, isDemo])

  useEffect(() => {
    let cancelled = false
    async function loadActiveCohort() {
      if (!user || isDemo) return
      if (!UUID_RE.test(user.id)) return
      try {
        const { data: startupRow, error: startupErr } = await supabase
          .from('startups')
          .select('id')
          .eq('founder_id', user.id)
          .maybeSingle()
        if (startupErr) {
          console.error('[S4C Sync] active cohort: startup lookup', startupErr)
          return
        }
        if (!startupRow?.id) return

        const { data, error } = await supabase
          .from('cohort_startups')
          .select(
            'cohorts!inner(id, name, status, start_date, end_date, organizations(name, logo_url))'
          )
          .eq('startup_id', startupRow.id)

        if (error) {
          console.error('[S4C Sync] active cohort: cohort_startups query', error)
          return
        }
        if (cancelled) return

        type CohortEmbed = {
          id: string
          name: string
          status: string
          start_date: string | null
          end_date: string | null
          organizations: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null
        }
        type Row = { cohorts: CohortEmbed | CohortEmbed[] | null }

        const rows = (data ?? []) as Row[]
        const candidates: ActiveCohort[] = []
        for (const r of rows) {
          const cohortRaw = Array.isArray(r.cohorts) ? r.cohorts[0] : r.cohorts
          if (!cohortRaw) continue
          if (cohortRaw.status !== 'active' && cohortRaw.status !== 'planned') continue
          const orgRaw = Array.isArray(cohortRaw.organizations)
            ? cohortRaw.organizations[0]
            : cohortRaw.organizations
          candidates.push({
            cohortId: cohortRaw.id,
            name: cohortRaw.name,
            status: cohortRaw.status,
            startDate: cohortRaw.start_date,
            endDate: cohortRaw.end_date,
            orgName: orgRaw?.name ?? null,
            orgLogoUrl: orgRaw?.logo_url ?? null,
          })
        }
        candidates.sort((a, b) => {
          const aTs = a.startDate ? new Date(a.startDate).getTime() : 0
          const bTs = b.startDate ? new Date(b.startDate).getTime() : 0
          return bTs - aTs
        })
        if (candidates.length > 0) setActiveCohort(candidates[0])
      } catch (err) {
        console.error('[S4C Sync] active cohort: unexpected', err)
      }
    }
    loadActiveCohort()
    return () => {
      cancelled = true
    }
  }, [user, isDemo])

  const completedIds = useMemo(
    () => new Set(Object.entries(progress).filter(([, v]) => v.completed).map(([k]) => k)),
    [progress]
  )

  const reportsGeneratedCount = useMemo(
    () => Object.values(progress).filter((v) => v.reportGenerated).length,
    [progress]
  )

  const userStageNum = useMemo(() => {
    // appUser.stage is a string like 'ideacion', 'pre-incubacion', etc.
    // Map to numeric stage for display and locking logic
    const stageMap: Record<string, 0 | 1 | 2 | 3 | 4> = {
      'ideacion': 0,
      'pre-incubacion': 1,
      'incubacion': 2,
      'aceleracion': 3,
      'escalamiento': 4,
    }
    const baseStage: 0 | 1 | 2 | 3 | 4 = appUser?.stage != null
      ? (stageMap[appUser.stage] ?? 0)
      : 0
    let effectiveStage: number = baseStage
    for (let s = 1; s <= 4; s++) {
      const stageTools = TOOLS_BY_STAGE[s as 1 | 2 | 3 | 4]
      const allDone = stageTools.every((t) => completedIds.has(t.id))
      if (allDone && s >= effectiveStage) {
        effectiveStage = Math.min(s + 1, 4)
      }
    }
    return Math.max(baseStage, effectiveStage)
  }, [appUser, completedIds])

  const totalCompleted = completedIds.size
  const total = TOOLS.length
  const pct = Math.round((totalCompleted / total) * 100)

  const nextTool = useMemo(() => {
    return TOOLS.find((t) => !completedIds.has(t.id) && t.stage <= userStageNum)
  }, [completedIds, userStageNum])

  const filteredToolsByStage = useMemo(() => {
    const result: Record<0 | 1 | 2 | 3 | 4, ToolDef[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
    for (const s of [0, 1, 2, 3, 4] as const) {
      result[s] =
        activeCategory === 'Todos'
          ? TOOLS_BY_STAGE[s]
          : TOOLS_BY_STAGE[s].filter((t) => t.category === activeCategory)
    }
    return result
  }, [activeCategory])

  const generateGlobalReport = useCallback(() => {
    if (!user) return
    generateGlobalReportUtil(user)
  }, [user])

  if (!user) return null

  const firstName = user.name?.split(' ')[0] || user.name
  const greeting = appUser?.gender === 'femenino' ? 'Bienvenida' : 'Bienvenido'
  const startupName = user.startup || 'Tu startup'
  const currentStageMeta = STAGE_META[userStageNum as 0 | 1 | 2 | 3 | 4]
  const CurrentStageIcon = STAGE_ICONS[userStageNum as 0 | 1 | 2 | 3 | 4]
  const diagnosticScore = user.diagnosticScore ?? null

  return (
    <div
      style={{
        padding: '2.5rem 2rem 4rem',
        maxWidth: 1200,
        margin: '0 auto',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}
    >
      {/* ─── Demo banner ─── */}
      <AnimatePresence>
        {isDemo && !demoBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginBottom: '1.5rem', position: 'relative' }}
          >
            <InsightBox variant="warning" title="Estás viendo S4C en modo demo" icon={Sparkles}>
              Los datos mostrados son de ejemplo para explorar la plataforma. Inicia sesión con tu cuenta
              real para guardar tu progreso.
            </InsightBox>
            <button
              type="button"
              onClick={() => setDemoBannerDismissed(true)}
              aria-label="Cerrar banner demo"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'transparent',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero section ─── */}
      <motion.section
        {...springReveal}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.05 }}
        style={{ marginBottom: '2rem' }}
      >
        <Card
          variant="elevated"
          padding="none"
          className="hero-stage"
          style={{
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            background: 'rgba(14,14,14,0.75)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderTop: '2px solid rgba(218,78,36,0.6)',
          }}
        >
          {/* Orb decorativos firma */}
          <div
            className="orb orb-ember"
            style={{ top: -240, right: -200, width: 480, height: 480, opacity: 0.35 }}
            aria-hidden
          />
          <div
            className="orb orb-electric"
            style={{ bottom: -240, left: -200, width: 480, height: 480, opacity: 0.30 }}
            aria-hidden
          />

          <div
            className="hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 'clamp(1.5rem, 4vw, 3rem)',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Left: greeting + identity */}
            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: '0.875rem' }}>
                <span className="pill-ember">
                  <span className="dot" />
                  Founder Dashboard
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.05,
                  marginBottom: '0.625rem',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  minWidth: 0,
                }}
              >
                {greeting}, {firstName}
                <span
                  style={{
                    color: 'var(--color-text-muted)',
                    fontWeight: 400,
                    margin: '0 0.5rem',
                  }}
                >
                  ·
                </span>
                <span className="text-ember">{startupName}</span>
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-md)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.55,
                  maxWidth: '52ch',
                  marginBottom: '1.5rem',
                }}
              >
                Tu roadmap de impacto en {currentStageMeta.name.toLowerCase()}. Cada herramienta que
                completas fortalece tu startup y desbloquea la siguiente fase.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Chip
                  variant={
                    userStageNum === 0
                      ? 'success'
                      : userStageNum === 1
                      ? 'stage-1'
                      : userStageNum === 2
                      ? 'stage-2'
                      : userStageNum === 3
                      ? 'stage-3'
                      : 'stage-4'
                  }
                  icon={CurrentStageIcon}
                  size="md"
                >
                  {userStageNum === 0 ? 'Módulo 00' : `Etapa ${userStageNum}`}: {currentStageMeta.name}
                </Chip>
                {diagnosticScore !== null && (
                  <Chip variant="info" icon={Award} size="md">
                    Diagnóstico {diagnosticScore}/100
                  </Chip>
                )}
              </div>
            </div>

            {/* Right: 5-stage segmented progress bar */}
            <div
              className="hero-ring"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '0.625rem',
                flexShrink: 0,
                minWidth: 180,
              }}
            >
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.5625rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.35)',
                marginBottom: '0.25rem',
              }}>
                Progreso por etapa
              </div>
              {([0, 1, 2, 3, 4] as const).map((i) => {
                const stageTools = TOOLS_BY_STAGE[i] ?? []
                const stageDone = stageTools.filter((t: ToolDef) => completedIds.has(t.id)).length
                const stagePct = stageTools.length > 0 ? stageDone / stageTools.length : 0
                const StageIcon = [Lightbulb, FlaskConical, Rocket, Building2, TrendingUp][i]
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                  }}>
                    <StageIcon size={11} color="rgba(255,255,255,0.30)" strokeWidth={1.75} />
                    <div style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${stagePct * 100}%`,
                        borderRadius: 2,
                        background: stagePct === 1 ? '#3B82F6' : '#DA4E24',
                        transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.5625rem',
                      color: 'rgba(255,255,255,0.35)',
                      width: 32,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {stageDone}/{stageTools.length}
                    </span>
                  </div>
                )
              })}
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#DA4E24',
                marginTop: '0.25rem',
              }}>
                {Math.round(pct)}% global
              </div>
            </div>
          </div>
        </Card>
      </motion.section>

      {/* ─── Editorial KPI Strip ─── */}
      <motion.section
        {...springReveal}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 }}
        style={{ marginBottom: '2rem' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
          className="kpi-strip"
        >
          {[
            {
              label: 'Herramientas completadas',
              value: `${totalCompleted}`,
              unit: `/ ${total}`,
              sub: `${pct}% del roadmap`,
            },
            {
              label: 'Etapa actual',
              value: userStageNum === 0 ? 'M-00' : `E-0${userStageNum}`,
              unit: '',
              sub: currentStageMeta.name,
            },
            {
              label: 'Startup Readiness',
              value: diagnosticScore !== null ? `${diagnosticScore}` : '—',
              unit: diagnosticScore !== null ? '/23' : '',
              sub: diagnosticScore !== null ? 'Score de diagnóstico' : 'Sin diagnóstico',
            },
            {
              label: 'Reportes generados',
              value: `${reportsGeneratedCount}`,
              unit: '',
              sub: reportsGeneratedCount === 1 ? 'reporte ejecutivo' : 'reportes ejecutivos',
            },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              style={{
                padding: '1.25rem 1.5rem',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
              className="kpi-strip-cell"
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '0.625rem',
              }}>{kpi.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.375rem' }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}>{kpi.value}</span>
                {kpi.unit && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{kpi.unit}</span>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.35)',
              }}>{kpi.sub}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ─── Tu cohorte actual ─── */}
      {activeCohort && (
        <motion.section
          {...springReveal}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.12 }}
          style={{ marginBottom: '1.5rem' }}
        >
          <Card
            variant="default"
            accent="var(--color-accent-secondary)"
            padding="none"
            style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(135deg, rgba(31,119,246,0.06), var(--color-paper))',
              border: '1px solid rgba(31,119,246,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-accent-secondary)',
                  color: 'var(--color-paper)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={20} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    color: 'var(--color-accent-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.25rem',
                  }}
                >
                  Tu cohorte actual
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '0.375rem',
                  }}
                >
                  {activeCohort.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {activeCohort.orgName && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {activeCohort.orgLogoUrl ? (
                        <Image
                          src={activeCohort.orgLogoUrl}
                          alt={activeCohort.orgName}
                          width={18}
                          height={18}
                          style={{ borderRadius: 3, objectFit: 'contain' }}
                        />
                      ) : (
                        <Building2 size={13} color="var(--color-text-muted)" />
                      )}
                      {activeCohort.orgName}
                    </span>
                  )}
                  <Chip
                    variant={activeCohort.status === 'active' ? 'success' : 'info'}
                    size="xs"
                  >
                    {activeCohort.status === 'active' ? 'Activa' : 'Próxima'}
                  </Chip>
                  {formatCohortDateRange(activeCohort.startDate, activeCohort.endDate) && (
                    <Chip variant="default" size="xs" icon={Calendar}>
                      {formatCohortDateRange(activeCohort.startDate, activeCohort.endDate)}
                    </Chip>
                  )}
                </div>
              </div>
              <Link
                href={`/tools/programas/${activeCohort.cohortId}`}
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />}>
                  Ver detalles
                </Button>
              </Link>
            </div>

            {cohortProgressPct(activeCohort.startDate, activeCohort.endDate) !== null && (
              <div
                style={{
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  <span>Progreso del programa</span>
                  <span>{cohortProgressPct(activeCohort.startDate, activeCohort.endDate)}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-border)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${cohortProgressPct(activeCohort.startDate, activeCohort.endDate)}%`,
                    }}
                    transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                    style={{
                      height: '100%',
                      background: 'var(--color-accent-secondary)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            )}
          </Card>
        </motion.section>
      )}

      {/* ─── Passport + Continue row ─── */}
      <motion.section
        {...springReveal}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.15 }}
        style={{ marginBottom: '2.5rem' }}
      >
        <div
          className="passport-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: nextTool ? '1.1fr 1fr' : '1fr',
            gap: '1rem',
          }}
        >
          {/* Passport card */}
          <Card
            variant="default"
            accent="var(--color-ink)"
            padding="none"
            style={{
              padding: '1.5rem 1.75rem',
              background: 'var(--color-paper)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-ink)',
                  color: 'var(--color-paper)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Target size={20} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    color: 'var(--color-accent-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.25rem',
                  }}
                >
                  Tu Passport
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '0.375rem',
                  }}
                >
                  {startupName}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Tu perfil consolidado con diagnóstico, herramientas completadas y score de impacto.
                  {totalCompleted >= 3
                    ? ' Genera un reporte ejecutivo listo para compartir con inversores.'
                    : ' Completa 3 herramientas para desbloquear el reporte global.'}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                flexWrap: 'wrap',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <Link href="/tools/passport" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />}>
                  Ver Passport
                </Button>
              </Link>
              <Button
                variant={totalCompleted >= 3 ? 'success' : 'secondary'}
                size="sm"
                icon={<Download size={14} />}
                onClick={generateGlobalReport}
                disabled={totalCompleted < 3}
              >
                Generar reporte global
              </Button>
            </div>
          </Card>

          {/* Continue CTA */}
          {nextTool && (
            <Card
              variant="elevated"
              accent="var(--color-accent-primary)"
              padding="none"
              style={{
                padding: '1.5rem 1.75rem',
                background:
                  'linear-gradient(135deg, rgba(218,78,36,0.06), var(--color-paper))',
                border: '1px solid rgba(218,78,36,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    color: 'var(--color-accent-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.5rem',
                  }}
                >
                  Continúa donde lo dejaste
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '0.375rem',
                  }}
                >
                  {nextTool.shortName}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <Chip variant="default" size="xs" icon={Clock}>
                    {nextTool.estimatedTime}
                  </Chip>
                  <Chip variant="default" size="xs">
                    {nextTool.stageName}
                  </Chip>
                </div>
              </div>

              <Link href={`/tools/${nextTool.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="md" icon={<ArrowRight size={16} />}>
                  Comenzar herramienta
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </motion.section>

      {/* ─── Category filter ─── */}
      <motion.div
        {...springReveal}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.18 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        <Filter size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        {(['Todos', ...CATEGORIES] as const).map((cat) => {
          const isActive = activeCategory === cat
          return (
            <Chip
              key={cat}
              variant={isActive ? 'primary' : 'default'}
              size="sm"
              onClick={() => setActiveCategory(cat as ToolCategory | 'Todos')}
            >
              {cat}
            </Chip>
          )
        })}
      </motion.div>

      {/* ─── Module 00 Ideación banner ─── */}
      {appUser?.stage === 'ideacion' && (
        <div style={{
          padding: '1.25rem 1.5rem', borderRadius: 14, marginBottom: '1.5rem',
          background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700,
              color: '#16A34A', marginBottom: '0.25rem',
            }}>
              Comienza con el Módulo 00 — Ideación
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}>
              Antes de Pre-incubación, descubre y valida el problema que quieres resolver.
              Son 5 herramientas, ~2.5 horas en total.
            </div>
          </div>
          <Link
            href="/tools/problem-exploration"
            style={{
              padding: '0.75rem 1.25rem', borderRadius: 10, textDecoration: 'none',
              background: '#16A34A', color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Empezar Ideación
          </Link>
        </div>
      )}

      {/* ─── Stage sections ─── */}
      {([0, 1, 2, 3, 4] as const).map((stageNum, si) => {
        const meta = STAGE_META[stageNum]
        const Icon = STAGE_ICONS[stageNum]
        const stageTools = filteredToolsByStage[stageNum]
        const allStageTools = TOOLS_BY_STAGE[stageNum]
        const stageDone = allStageTools.filter((t) => completedIds.has(t.id)).length
        const stageTotal = allStageTools.length
        const stagePct = stageTotal > 0 ? Math.round((stageDone / stageTotal) * 100) : 0
        const isLocked = stageNum > userStageNum
        const isStageComplete = stageDone === stageTotal && stageTotal > 0

        if (stageTools.length === 0 && activeCategory !== 'Todos') return null

        return (
          <motion.section
            key={stageNum}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 + si * 0.08 }}
            style={{
              marginBottom: si < 4 ? '2.5rem' : 0,
            }}
          >
            {/* SectionHeader */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 25,
                delay: si * 0.07,
              }}
              style={{ marginBottom: '1rem' }}
            >
              <SectionHeader
                kicker={stageNum === 0 ? `Módulo 00 · ${meta.subtitle}` : `Etapa ${stageNum} · ${meta.subtitle}`}
                title={meta.name}
                description={meta.description}
                action={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {isLocked ? (
                      <Chip variant="default" size="sm" icon={Lock}>
                        Bloqueada
                      </Chip>
                    ) : isStageComplete ? (
                      <Chip variant="success" size="sm" icon={CheckCircle2}>
                        Completada
                      </Chip>
                    ) : null}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.375rem',
                        minWidth: 160,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.375rem',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--text-xl)',
                            fontWeight: 700,
                            color: isLocked ? 'var(--color-text-muted)' : meta.color,
                            letterSpacing: '-0.02em',
                            lineHeight: 1,
                          }}
                        >
                          {stageDone}
                          <span
                            style={{
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-text-muted)',
                              fontWeight: 400,
                            }}
                          >
                            /{stageTotal}
                          </span>
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                          }}
                        >
                          completadas
                        </span>
                      </div>
                      <div
                        style={{
                          width: 160,
                          height: 4,
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-border)',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stagePct}%` }}
                          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                          style={{
                            height: '100%',
                            background: isLocked ? 'var(--color-text-muted)' : meta.color,
                            borderRadius: 'var(--radius-full)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                }
              />
            </motion.div>

            {/* Stage icon strip — visual anchor */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                paddingLeft: '0.25rem',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: isLocked ? 'var(--color-bg-primary)' : `${meta.color}15`,
                  border: `1px solid ${isLocked ? 'var(--color-border)' : `${meta.color}40`}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isLocked ? (
                  <Lock size={14} color="var(--color-text-muted)" />
                ) : (
                  <Icon size={16} color={meta.color} strokeWidth={2} />
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    'linear-gradient(to right, var(--color-border), transparent)',
                }}
              />
            </div>

            {/* Featured tool — Perfil del Founder (stage 0 only) */}
            {stageNum === 0 && (() => {
              const featuredTool = TOOLS_BY_STAGE[0].find(t => t.featured)
              if (!featuredTool) return null
              const isDone = completedIds.has(featuredTool.id)
              return (
                <Link href={`/tools/${featuredTool.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '1.25rem', opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                  <div style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: 14,
                    border: isDone ? '1px solid rgba(22,163,74,0.4)' : '1px solid rgba(22,163,74,0.3)',
                    background: isDone
                      ? 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))'
                      : 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.03))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'pointer',
                  }}>
                    {/* glow orb */}
                    <div style={{
                      position: 'absolute', top: -40, right: -40, width: 120, height: 120,
                      borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,0.15), transparent)',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: isDone ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.12)',
                      border: '1px solid rgba(22,163,74,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Users size={20} color="#16A34A" strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#16A34A',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}>
                          Destacada · Empieza aquí
                        </span>
                        {isDone && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '1px 7px', borderRadius: 20,
                            background: 'rgba(22,163,74,0.12)',
                            fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 700, color: '#16A34A',
                          }}>
                            <CheckCircle2 size={9} /> Completada
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.02em',
                        marginBottom: '0.25rem',
                      }}>
                        {featuredTool.name}
                      </div>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}>
                        {featuredTool.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} color="var(--color-text-muted)" />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {featuredTool.estimatedTime}
                        </span>
                      </span>
                      <ArrowRight size={16} color="#16A34A" />
                    </div>
                  </div>
                </Link>
              )
            })()}

            {/* Tools grid */}
            <div
              style={{
                opacity: isLocked ? 0.5 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              <div
                className="tools-dash-grid"
                style={{
                  display: 'grid',
                  gap: '0.875rem',
                }}
              >
                {stageTools.filter(t => !t.featured).length > 0 ? (
                  stageTools.filter(t => !t.featured).map((tool, i) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      done={completedIds.has(tool.id)}
                      locked={isLocked || (appUser?.stage === 'ideacion' && tool.stage > 0)}
                      idx={i}
                    />
                  ))
                ) : (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '1.5rem',
                      textAlign: 'center',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    No hay herramientas en esta categoría para esta etapa.
                  </div>
                )}
              </div>
            </div>

            {/* Phase completion advice */}
            {isStageComplete && !isLocked && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ marginTop: '1rem' }}
              >
                <InsightBox variant="tip" title="Consejo antes de avanzar" icon={Lightbulb}>
                  {meta.phaseAdvice}
                </InsightBox>
              </motion.div>
            )}
          </motion.section>
        )
      })}

      <style>{`
        .tools-dash-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .kpi-strip {
          border-radius: 0;
        }
        @media (max-width: 1100px) {
          .kpi-strip {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .kpi-strip-cell:nth-child(2) {
            border-right: none !important;
          }
          .kpi-strip-cell:nth-child(3) {
            border-top: 1px solid rgba(255,255,255,0.07);
            border-right: 1px solid rgba(255,255,255,0.07) !important;
          }
        }
        @media (max-width: 900px) {
          .tools-dash-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .passport-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-ring {
            justify-self: center;
          }
        }
        @media (max-width: 600px) {
          .tools-dash-grid {
            grid-template-columns: 1fr;
          }
          .kpi-strip {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .kpi-strip-cell {
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.07) !important;
          }
          .kpi-strip-cell:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </div>
  )
}
