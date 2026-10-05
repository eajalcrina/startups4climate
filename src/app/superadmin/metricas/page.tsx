'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Users, Rocket, GraduationCap,
  Wrench, Target, Mail, AlertCircle,
  BarChart3, PieChart, TrendingUp, HardDrive, Database, Activity,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  DEMO_PROGRAMS, DEMO_MINPRO_KPIS, DEMO_REGION_DISTRIBUTION,
  DEMO_VERTICAL_DISTRIBUTION_NATIONAL, DEMO_STAGE_DISTRIBUTION_NATIONAL,
  DEMO_GENDER_DISTRIBUTION, programLeverage, formatUSD,
} from '@/lib/demo/superadmin-fixtures'

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

interface MetricCard {
  label: string
  value: number | string
  icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
  bg: string
}

interface GroupCount {
  label: string
  count: number
}

interface CapacityGauge {
  bytes?: number
  count?: number
  limit_bytes?: number
  limit?: number
  pct: number
}

interface CapacitySnapshot {
  generated_at: string
  db: CapacityGauge
  storage: CapacityGauge
  mau_30d: CapacityGauge
  active_founders_7d: number
  active_founders_30d: number
  ai_calls_30d: number
  orgs_active: number
  founders_total: number
  top_tables: { name: string; bytes: number; rows: number }[]
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function pctColor(pct: number): { bar: string; bg: string; label: string } {
  if (pct >= 80) return { bar: '#DC2626', bg: 'rgba(220,38,38,0.1)', label: 'Crítico' }
  if (pct >= 60) return { bar: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Atención' }
  return { bar: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'OK' }
}

export default function MetricasPage() {
  const { appUser, isDemo } = useAuth()
  const [loading, setLoading] = useState(true)

  // Top metrics
  const [totalOrgs, setTotalOrgs] = useState(0)
  const [totalFounders, setTotalFounders] = useState(0)
  const [totalStartups, setTotalStartups] = useState(0)
  const [activeCohorts, setActiveCohorts] = useState(0)

  // Second row
  const [avgToolsCompleted, setAvgToolsCompleted] = useState(0)
  const [avgDiagnosticScore, setAvgDiagnosticScore] = useState(0)
  const [pendingInvitations, setPendingInvitations] = useState(0)
  const [openTickets, setOpenTickets] = useState(0)

  // Breakdown sections
  const [orgsByPlan, setOrgsByPlan] = useState<GroupCount[]>([])
  const [foundersByStage, setFoundersByStage] = useState<GroupCount[]>([])
  const [dailyRegistrations, setDailyRegistrations] = useState<{ date: string; count: number }[]>([])

  // Platform capacity (Supabase usage vs Free tier limits)
  const [capacity, setCapacity] = useState<CapacitySnapshot | null>(null)

  useEffect(() => {
    if (isDemo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- demo fixtures applied once auth resolves; live path sets state after awaits
      setTotalOrgs(8)
      setTotalFounders(187)
      setTotalStartups(DEMO_MINPRO_KPIS.startupsTotal)
      setActiveCohorts(DEMO_PROGRAMS.reduce((s, p) => s + p.cohortsCount, 0))
      setAvgToolsCompleted(18.2)
      setAvgDiagnosticScore(7.0)
      setPendingInvitations(12)
      setOpenTickets(3)
      setOrgsByPlan([
        { label: 'enterprise', count: 2 },
        { label: 'professional', count: 4 },
        { label: 'starter', count: 2 },
      ])
      setFoundersByStage(DEMO_STAGE_DISTRIBUTION_NATIONAL.map((s) => ({ label: s.label, count: s.count })))
      // Synthetic 30-day registration curve for demo
      const synthetic: { date: string; count: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().substring(0, 10)
        const base = 4 + Math.round(Math.sin(i / 4) * 3 + (i % 7 === 0 ? 6 : 0))
        synthetic.push({ date: key, count: Math.max(0, base) })
      }
      setDailyRegistrations(synthetic)
      setCapacity({
        generated_at: new Date().toISOString(),
        db: { bytes: 38 * 1024 * 1024, limit_bytes: 500 * 1024 * 1024, pct: 7.6 },
        storage: { bytes: 6 * 1024 * 1024, limit_bytes: 1024 * 1024 * 1024, pct: 0.6 },
        mau_30d: { count: 142, limit: 50000, pct: 0.28 },
        active_founders_7d: 58,
        active_founders_30d: 142,
        ai_calls_30d: 920,
        orgs_active: 8,
        founders_total: 187,
        top_tables: [
          { name: 'tool_data', bytes: 9 * 1024 * 1024, rows: 1840 },
          { name: 'startups', bytes: 6 * 1024 * 1024, rows: 187 },
          { name: 'ai_conversations', bytes: 5 * 1024 * 1024, rows: 920 },
          { name: 'news_items', bytes: 4 * 1024 * 1024, rows: 280 },
          { name: 'diagnostics', bytes: 2 * 1024 * 1024, rows: 187 },
        ],
      })
      setLoading(false)
      return
    }

    async function loadMetrics() {
      setLoading(true)

      // Run all count queries in parallel
      const [
        orgsResult,
        foundersResult,
        startupsResult,
        activeCohortsResult,
        startupsDataResult,
        invitationsResult,
        ticketsResult,
        orgsPlanResult,
        profilesStageResult,
        recentProfilesResult,
      ] = await Promise.all([
        // 1. Total organizations
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        // 2. Total founders
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'founder'),
        // 3. Total startups
        supabase.from('startups').select('*', { count: 'exact', head: true }),
        // 4. Active cohorts
        supabase.from('cohorts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        // 5. Startups data for averages
        supabase.from('startups').select('tools_completed, diagnostic_score'),
        // 6. Pending invitations
        supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        // 7. Open tickets
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        // 8. Orgs by plan
        supabase.from('organizations').select('plan'),
        // 9. Profiles by stage (founders)
        supabase.from('profiles').select('stage').eq('role', 'founder'),
        // 10. Recent profiles (last 30 days)
        supabase.from('profiles').select('created_at').gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ),
      ])

      setTotalOrgs(orgsResult.count || 0)
      setTotalFounders(foundersResult.count || 0)
      setTotalStartups(startupsResult.count || 0)
      setActiveCohorts(activeCohortsResult.count || 0)

      // Compute averages from startups data
      const startupsData = startupsDataResult.data || []
      if (startupsData.length > 0) {
        const toolsSum = startupsData.reduce((s, r) => s + (r.tools_completed || 0), 0)
        setAvgToolsCompleted(Math.round((toolsSum / startupsData.length) * 10) / 10)

        const withScore = startupsData.filter((r) => r.diagnostic_score != null)
        if (withScore.length > 0) {
          const scoreSum = withScore.reduce((s, r) => s + (r.diagnostic_score || 0), 0)
          setAvgDiagnosticScore(Math.round((scoreSum / withScore.length) * 10) / 10)
        }
      }

      setPendingInvitations(invitationsResult.count || 0)
      setOpenTickets(ticketsResult.count || 0)

      // Orgs by plan
      const planCounts: Record<string, number> = {}
      for (const row of orgsPlanResult.data || []) {
        const plan = row.plan || 'sin_plan'
        planCounts[plan] = (planCounts[plan] || 0) + 1
      }
      setOrgsByPlan(
        Object.entries(planCounts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
      )

      // Founders by stage
      const stageCounts: Record<string, number> = {}
      for (const row of profilesStageResult.data || []) {
        const stage = row.stage || 'Sin etapa'
        stageCounts[stage] = (stageCounts[stage] || 0) + 1
      }
      setFoundersByStage(
        Object.entries(stageCounts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
      )

      // Daily registrations (last 30 days)
      const dayCounts: Record<string, number> = {}
      for (const row of recentProfilesResult.data || []) {
        const day = row.created_at.substring(0, 10) // YYYY-MM-DD
        dayCounts[day] = (dayCounts[day] || 0) + 1
      }
      // Fill all 30 days
      const dailyData: { date: string; count: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().substring(0, 10)
        dailyData.push({ date: key, count: dayCounts[key] || 0 })
      }
      setDailyRegistrations(dailyData)

      // Capacity snapshot (RPC, superadmin-only). Failures are non-fatal.
      const { data: capData, error: capErr } = await supabase.rpc('platform_capacity_snapshot')
      if (capErr) {
        console.error('[S4C Capacity]', capErr)
      } else if (capData) {
        setCapacity(capData as CapacitySnapshot)
      }

      setLoading(false)
    }

    loadMetrics()
  }, [isDemo])

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

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 32, height: 32,
            border: '3px solid var(--color-border)',
            borderTopColor: '#1F77F6', borderRadius: '50%',
          }}
        />
      </div>
    )
  }

  const TOP_METRICS: MetricCard[] = [
    { label: 'Total organizaciones', value: totalOrgs, icon: Building2, color: '#1F77F6', bg: 'rgba(31,119,246,0.08)' },
    { label: 'Total founders', value: totalFounders, icon: Users, color: '#1F77F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Total startups', value: totalStartups, icon: Rocket, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    { label: 'Cohortes activos', value: activeCohorts, icon: GraduationCap, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  ]

  const SECOND_METRICS: MetricCard[] = [
    { label: 'Herramientas completadas (prom.)', value: avgToolsCompleted, icon: Wrench, color: '#1F77F6', bg: 'rgba(31,119,246,0.08)' },
    { label: 'Score diagnóstico (prom.)', value: avgDiagnosticScore, icon: Target, color: '#1F77F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Invitaciones pendientes', value: pendingInvitations, icon: Mail, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Incidencias abiertas', value: openTickets, icon: AlertCircle, color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  ]

  const PLAN_LABELS: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
    institutional: 'Institutional',
    sin_plan: 'Sin plan',
  }

  const maxDailyCount = Math.max(...dailyRegistrations.map((d) => d.count), 1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <BarChart3 size={20} color="#1F77F6" />
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
          }}>
            Métricas globales
          </h1>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          Visión general de la plataforma Startups4Climate
        </p>
      </div>

      {/* Top metrics row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem', marginBottom: '1rem',
      }}>
        {TOP_METRICS.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              style={cardStyle}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: m.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={20} color={m.color} />
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)',
                lineHeight: 1, marginBottom: '0.25rem',
              }}>
                {m.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
              }}>
                {m.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Second metrics row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {SECOND_METRICS.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.24 + i * 0.06 }}
              style={cardStyle}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: m.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={20} color={m.color} />
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)',
                lineHeight: 1, marginBottom: '0.25rem',
              }}>
                {m.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
              }}>
                {m.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Platform capacity (Supabase usage vs Free tier) */}
      {capacity && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.42 }}
          style={{ ...cardStyle, marginBottom: '1.5rem' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--color-text-muted)" />
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 600,
                fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
              }}>
                Capacidad de plataforma
              </h3>
            </div>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}>
              Snapshot {new Date(capacity.generated_at).toLocaleString('es-419')}
            </span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem', marginBottom: '1.25rem',
          }}>
            {[
              { key: 'db', icon: Database, title: 'Base de datos', gauge: capacity.db,
                used: formatBytes(capacity.db.bytes ?? 0),
                limit: formatBytes(capacity.db.limit_bytes ?? 0) },
              { key: 'storage', icon: HardDrive, title: 'Storage (logos, archivos)', gauge: capacity.storage,
                used: formatBytes(capacity.storage.bytes ?? 0),
                limit: formatBytes(capacity.storage.limit_bytes ?? 0) },
              { key: 'mau', icon: Users, title: 'MAU (últimos 30 días)', gauge: capacity.mau_30d,
                used: String(capacity.mau_30d.count ?? 0),
                limit: String(capacity.mau_30d.limit ?? 0) },
            ].map(({ key, icon: Icon, title, gauge, used, limit }) => {
              const c = pctColor(gauge.pct)
              return (
                <div key={key} style={{
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  padding: '1rem', background: 'var(--color-bg-base)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon size={16} color={c.bar} />
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        fontWeight: 600, color: 'var(--color-text-primary)',
                      }}>
                        {title}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                      fontWeight: 600, color: c.bar, padding: '0.125rem 0.5rem',
                      borderRadius: '999px', background: c.bg,
                    }}>
                      {c.label}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)',
                    lineHeight: 1, marginBottom: '0.5rem',
                  }}>
                    {used} <span style={{
                      fontSize: 'var(--text-xs)', fontWeight: 400,
                      color: 'var(--color-text-muted)',
                    }}>/ {limit} ({gauge.pct}%)</span>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 999, background: 'var(--color-border)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${Math.min(100, Math.max(0, gauge.pct))}%`,
                      background: c.bar, transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)',
          }}>
            {[
              { label: 'Founders activos 7d', value: capacity.active_founders_7d },
              { label: 'Founders activos 30d', value: capacity.active_founders_30d },
              { label: 'Llamadas AI 30d', value: capacity.ai_calls_30d },
              { label: 'Orgs activas', value: capacity.orgs_active },
            ].map((s) => (
              <div key={s.label}>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 700,
                  fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
                }}>
                  {s.value.toLocaleString('es-419')}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {capacity.top_tables && capacity.top_tables.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                color: 'var(--color-text-muted)', marginBottom: '0.5rem',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Top 5 tablas por tamaño
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {capacity.top_tables.map((t) => (
                  <span key={t.name} style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                    padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-base)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}>
                    {t.name} · {formatBytes(t.bytes)} · {t.rows.toLocaleString('es-419')} filas
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Two-column breakdown */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem', marginBottom: '1.5rem',
      }}>
        {/* Orgs by plan */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.5 }}
          style={cardStyle}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <PieChart size={18} color="var(--color-text-muted)" />
            <h3 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            }}>
              Organizaciones por plan
            </h3>
          </div>

          {orgsByPlan.length === 0 ? (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0',
            }}>
              Sin datos
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {orgsByPlan.map((item) => {
                const maxCount = Math.max(...orgsByPlan.map((i) => i.count), 1)
                const pct = (item.count / maxCount) * 100
                return (
                  <div key={item.label}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: '0.25rem',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-primary)', fontWeight: 500,
                      }}>
                        {PLAN_LABELS[item.label] || item.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {item.count}
                      </span>
                    </div>
                    <div style={{
                      height: 6, borderRadius: 3,
                      background: 'var(--color-border)',
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                        style={{
                          height: '100%', borderRadius: 3,
                          background: '#1F77F6',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Founders by stage */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.55 }}
          style={cardStyle}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <TrendingUp size={18} color="var(--color-text-muted)" />
            <h3 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            }}>
              Founders por etapa
            </h3>
          </div>

          {foundersByStage.length === 0 ? (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0',
            }}>
              Sin datos
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {foundersByStage.map((item) => {
                const maxCount = Math.max(...foundersByStage.map((i) => i.count), 1)
                const pct = (item.count / maxCount) * 100
                return (
                  <div key={item.label}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: '0.25rem',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-primary)', fontWeight: 500,
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {item.count}
                      </span>
                    </div>
                    <div style={{
                      height: 6, borderRadius: 3,
                      background: 'var(--color-border)',
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                        style={{
                          height: '100%', borderRadius: 3,
                          background: '#1F77F6',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Daily registrations - last 30 days */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.6 }}
        style={cardStyle}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--color-text-muted)" />
            <h3 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 600,
              fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
            }}>
              Registros últimos 30 días
            </h3>
          </div>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
            color: 'var(--color-text-secondary)',
          }}>
            Total: {dailyRegistrations.reduce((s, d) => s + d.count, 0)}
          </span>
        </div>

        {/* Simple bar chart */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 2,
          height: 120, padding: '0 0.25rem',
        }}>
          {dailyRegistrations.map((day) => {
            const heightPct = maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0
            return (
              <motion.div
                key={day.date}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(heightPct, 2)}%` }}
                transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
                title={`${day.date}: ${day.count} registro${day.count !== 1 ? 's' : ''}`}
                style={{
                  flex: 1,
                  minWidth: 4,
                  borderRadius: '2px 2px 0 0',
                  background: day.count > 0 ? '#1F77F6' : 'var(--color-border)',
                  cursor: 'default',
                  transition: 'opacity 0.15s',
                }}
                whileHover={{ opacity: 0.7 }}
              />
            )
          })}
        </div>

        {/* X axis labels (show first, middle, last) */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: '0.5rem', padding: '0 0.25rem',
        }}>
          {[0, 14, 29].map((idx) => {
            const day = dailyRegistrations[idx]
            if (!day) return null
            return (
              <span key={idx} style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
                color: 'var(--color-text-muted)',
              }}>
                {new Date(day.date).toLocaleDateString('es-CL', {
                  day: 'numeric', month: 'short',
                })}
              </span>
            )
          })}
        </div>
      </motion.div>

      {/* Demo-only: National comparative breakdowns */}
      {isDemo && (
        <>
          <div style={{ height: '1.5rem' }} />
          <div style={{
            display: 'grid', gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            marginBottom: '1rem',
          }}>
            {/* Regional */}
            <motion.div {...fadeUp} style={cardStyle}>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 600,
                fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
                marginBottom: '1rem',
              }}>
                Distribución regional
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {DEMO_REGION_DISTRIBUTION.filter((r) => r.startups > 0).map((r) => {
                  const max = Math.max(...DEMO_REGION_DISTRIBUTION.map((x) => x.startups))
                  const pct = (r.startups / max) * 100
                  return (
                    <div key={r.region}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginBottom: '0.2rem',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                          color: 'var(--color-text-primary)', fontWeight: 500,
                        }}>
                          {r.region}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                          color: 'var(--color-text-secondary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {r.startups} startups
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-muted)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: r.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Verticales nacional */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} style={cardStyle}>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 600,
                fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
                marginBottom: '1rem',
              }}>
                Verticales · nacional
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {DEMO_VERTICAL_DISTRIBUTION_NATIONAL.map((v) => {
                  const max = Math.max(...DEMO_VERTICAL_DISTRIBUTION_NATIONAL.map((x) => x.count))
                  const pct = (v.count / max) * 100
                  return (
                    <div key={v.key}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginBottom: '0.2rem',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                          color: 'var(--color-text-primary)', fontWeight: 500,
                        }}>
                          {v.label}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                          color: 'var(--color-text-secondary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {v.count}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-muted)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: v.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Género */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} style={cardStyle}>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 600,
                fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
                marginBottom: '1rem',
              }}>
                Diversidad de género
              </h3>
              <div style={{
                display: 'flex', height: 14, borderRadius: 7,
                overflow: 'hidden', marginBottom: '1rem',
              }}>
                {DEMO_GENDER_DISTRIBUTION.map((g) => (
                  <div key={g.key} style={{
                    width: `${g.pct}%`, background: g.color, height: '100%',
                  }} title={`${g.label}: ${g.pct}%`} />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {DEMO_GENDER_DISTRIBUTION.map((g) => (
                  <div key={g.key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                      color: 'var(--color-text-primary)',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                      {g.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)', fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {g.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Apalancamiento por programa */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} style={cardStyle}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 600,
                fontSize: 'var(--text-md)', color: 'var(--color-text-primary)',
              }}>
                Apalancamiento de capital por programa
              </h3>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                color: 'var(--color-text-muted)',
              }}>
                Funding levantado por startup acompañada
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'var(--font-body)', fontSize: '0.78rem',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Programa', 'Región', 'Funding total', 'Startups', 'Empleos', 'tCO₂eq', 'USD/startup'].map((h) => (
                      <th key={h} style={{
                        padding: '0.55rem 0.5rem', textAlign: 'left',
                        fontWeight: 600, color: 'var(--color-text-muted)',
                        fontSize: '0.66rem', textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...DEMO_PROGRAMS]
                    .sort((a, b) => programLeverage(b) - programLeverage(a))
                    .map((p) => {
                      const lev = programLeverage(p)
                      const levColor = lev >= 25_000 ? '#1F77F6' : lev >= 12_000 ? '#F59E0B' : '#DC2626'
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                            {p.region}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatUSD(p.fundingRaisedUSD)}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {p.startupsCount}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {p.jobsGenerated}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {p.co2Avoided}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: levColor }}>
                            {formatUSD(lev)}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
