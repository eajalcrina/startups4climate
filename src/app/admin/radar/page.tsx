'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Radio,
  Newspaper,
  Target,
  Clock,
  TrendingUp,
  Scale,
  Lightbulb,
  Award,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { DEMO_ECOSYSTEM_ACTORS } from '@/lib/demo/admin-fixtures'
import { supabase } from '@/lib/supabase'

/* ─── Types ─── */
type Category = 'Inversión' | 'Regulación' | 'Tendencia' | 'Programa'
type Tab = 'noticias' | 'programa' | 'actores'

interface NewsItem {
  title: string
  source: string
  date: string
  category: Category
  excerpt: string
  url?: string | null
  relevantForCohort?: boolean
  verticalTags?: string[] | null
}

/* ─── Category styling ─── */
const CATEGORY_COLORS: Record<Category, { color: string; bg: string; border: string }> = {
  Inversión: { color: '#1F77F6', bg: 'rgba(31,119,246,0.08)', border: 'rgba(31,119,246,0.2)' },
  Regulación: { color: '#2A222B', bg: 'rgba(42,34,43,0.08)', border: 'rgba(42,34,43,0.2)' },
  Tendencia: { color: '#2A222B', bg: 'rgba(42,34,43,0.08)', border: 'rgba(42,34,43,0.2)' },
  Programa: { color: '#EC4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
}

const CATEGORY_ICONS: Record<Category, typeof TrendingUp> = {
  Inversión: TrendingUp,
  Regulación: Scale,
  Tendencia: Lightbulb,
  Programa: Award,
}

const CATEGORY_ACCENT: Record<Category, string> = {
  Inversión: '#1F77F6',
  Regulación: '#2A222B',
  Tendencia: '#6366F1',
  Programa: '#EC4899',
}

const CATEGORIES: (Category | 'Todos')[] = ['Todos', 'Inversión', 'Regulación', 'Tendencia', 'Programa']

const TABS: { id: Tab; label: string; icon: typeof Newspaper }[] = [
  { id: 'noticias', label: 'Noticias del ecosistema', icon: Newspaper },
  { id: 'programa', label: 'Relevante para tu programa', icon: Target },
  { id: 'actores', label: 'Actores del ecosistema', icon: Radio },
]

const ACTOR_CATEGORY_LABELS: Record<string, string> = {
  incubator: 'Incubadoras',
  fund: 'Fondos / VC',
  gov: 'Gobierno',
  university: 'Universidades',
  corporate: 'Corporates',
  media: 'Medios',
  event: 'Eventos',
}

const ACTOR_CATEGORY_COLORS: Record<string, string> = {
  incubator: '#1F77F6',
  fund: '#8B5CF6',
  gov: '#1F77F6',
  university: '#16A34A',
  corporate: '#DA4E24',
  media: '#F59E0B',
  event: '#EC4899',
}

/* ─── Components ─── */
function CategoryPill({ category }: { category: Category }) {
  const style = CATEGORY_COLORS[category]
  const Icon = CATEGORY_ICONS[category]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.125rem 0.5rem',
        borderRadius: 999,
        background: style.bg,
        border: `1px solid ${style.border}`,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 600,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={10} />
      {category}
    </span>
  )
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const accent = CATEGORY_ACCENT[item.category]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.06, ease: 'easeOut' }}
      style={{
        padding: '1.25rem',
        borderRadius: 12,
        background: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        cursor: 'default',
        transition: 'all 0.2s ease',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
      whileHover={{
        boxShadow: 'var(--shadow-card-hover)',
        y: -2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <CategoryPill category={item.category} />
        {item.relevantForCohort && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
              padding: '0.1rem 0.45rem', borderRadius: 999,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
              fontWeight: 600, color: '#6366F1', whiteSpace: 'nowrap',
            }}
          >
            Relevante para tu cohorte
          </span>
        )}
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          {item.date}
        </span>
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--color-ink)',
          lineHeight: 1.35,
          margin: 0,
        }}
      >
        {item.title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {item.excerpt}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
          }}
        >
          Fuente: {item.source}
        </span>
        {item.url && (
          <a
            href={item.url.match(/^https?:\/\//) ? item.url : `https://${item.url}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: accent,
              textDecoration: 'none',
            }}
          >
            Leer más <ExternalLink size={11} />
          </a>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Main page ─── */
export default function AdminRadarPage() {
  const { appUser, isDemo } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const adminBase = pathname.startsWith('/demo-admin') ? '/demo-admin' : '/admin'
  const [activeTab, setActiveTab] = useState<Tab>('noticias')
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos')
  const [liveNews, setLiveNews] = useState<NewsItem[] | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [cohortVerticals, setCohortVerticals] = useState<string[]>([])
  const [aiDigest, setAiDigest] = useState<string | null>(null)
  const [aiDigestLoading, setAiDigestLoading] = useState(false)
  const digestFetched = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
      const { data, error } = await supabase
        .from('news_items')
        .select('title, source_name, source_url, published_at, content_type, summary, tags, vertical, scraped_at')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(40)
      if (cancelled) return
      if (error || !data) { if (!cancelled) setLiveNews([]); return }

      // Load cohort founders' verticals if org is known
      let verticals: string[] = []
      const orgId = appUser?.org_id
      if (orgId) {
        const { data: cohortsData } = await supabase
          .from('cohorts')
          .select('id')
          .eq('org_id', orgId)
          .eq('status', 'active')
        const cohortIds = (cohortsData ?? []).map((c: { id: string }) => c.id)
        if (cohortIds.length > 0) {
          const { data: csData } = await supabase
            .from('cohort_startups')
            .select('startup_id')
            .in('cohort_id', cohortIds)
          const startupIds = (csData ?? []).map((cs: { startup_id: string }) => cs.startup_id)
          if (startupIds.length > 0) {
            const { data: startupRows } = await supabase
              .from('startups')
              .select('vertical')
              .in('id', startupIds)
              .not('vertical', 'is', null)
            const raw = (startupRows ?? [])
              .map((s: { vertical: string | null }) => s.vertical)
              .filter((v): v is string => v !== null && v.trim() !== '')
            verticals = [...new Set(raw)]
          }
        }
      }
      if (!cancelled) setCohortVerticals(verticals)

      const mapType = (t: string | null, tags: string[] | null): Category => {
        const tagStr = (tags || []).join(' ').toLowerCase()
        if (t === 'funding' || tagStr.includes('inversión') || tagStr.includes('fondo')) return 'Inversión'
        if (t === 'regulation' || tagStr.includes('regulación') || tagStr.includes('ley')) return 'Regulación'
        if (t === 'program' || tagStr.includes('convocatoria') || tagStr.includes('aceleradora')) return 'Programa'
        return 'Tendencia'
      }
      const fmt = (iso: string) => {
        const d = new Date(iso)
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
      }

      const isRelevantForCohort = (itemVertical: string | null) => {
        if (verticals.length === 0 || !itemVertical) return false
        const v = itemVertical.toLowerCase()
        return verticals.some(
          (cv) => v.includes(cv.toLowerCase()) || cv.toLowerCase().includes(v)
        )
      }

      const mapped: NewsItem[] = data.map((r: Record<string, unknown>) => ({
        title: r.title as string,
        source: (r.source_name as string) || 'Fuente desconocida',
        date: fmt(r.published_at as string),
        category: mapType(r.content_type as string | null, r.tags as string[] | null),
        excerpt: (r.summary as string) || '',
        url: (r.source_url as string) || null,
        relevantForCohort: isRelevantForCohort(r.vertical as string | null),
        verticalTags: r.vertical ? [r.vertical as string] : null,
      }))

      // Sort cohort-relevant items first
      mapped.sort((a, b) => {
        if (a.relevantForCohort && !b.relevantForCohort) return -1
        if (!a.relevantForCohort && b.relevantForCohort) return 1
        return 0
      })

      if (!cancelled) {
        setLiveNews(mapped)
        if (data[0]?.scraped_at) {
          const ts = data[0].scraped_at as string
          setLastUpdated(
            new Date(ts).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
          )
        }
      }
      } catch (err) {
        console.error('[S4C RADAR] fetch error:', err)
        if (!cancelled) setLiveNews([])
      }
    })()
    return () => { cancelled = true }
  }, [appUser?.org_id])

  // Fetch AI org digest once per session, only if user has an org
  useEffect(() => {
    if (digestFetched.current) return
    if (!appUser?.org_id) return
    digestFetched.current = true

    setAiDigestLoading(true)
    fetch('/api/ai/radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'org_digest' }),
    })
      .then(async (res) => {
        if (!res.ok) return
        const json = (await res.json()) as { insight?: string }
        if (json.insight) setAiDigest(json.insight)
      })
      .catch((err) => {
        console.error('[S4C AI] radar org digest fetch failed:', err)
      })
      .finally(() => {
        setAiDigestLoading(false)
      })
  }, [appUser?.org_id])

  if (!appUser || (appUser.role !== 'admin_org' && appUser.role !== 'superadmin')) {
    router.replace(adminBase)
    return null
  }

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshResult(null)
    try {
      const res = await fetch('/api/admin/refresh-radar', { method: 'POST' })
      const json = await res.json() as { rss_inserted?: number; ai_inserted?: number; errors?: string[] }
      setRefreshResult(`${(json.rss_inserted ?? 0) + (json.ai_inserted ?? 0)} noticias añadidas`)
      // Reload news after refresh
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      setRefreshResult('Error al actualizar')
    } finally {
      setRefreshing(false)
    }
  }

  // Filter out actores tab when not in demo mode
  const visibleTabs = isDemo ? TABS : TABS.filter((t) => t.id !== 'actores')

  const newsSource = liveNews ?? []
  const filteredNews =
    activeCategory === 'Todos'
      ? newsSource
      : newsSource.filter((item) => item.category === activeCategory)

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg-primary)',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ marginBottom: '2rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.5rem',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(31,119,246,0.08)',
                border: '1px solid rgba(31,119,246,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Radio size={20} color="#1F77F6" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                RADAR del ecosistema
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Noticias, tendencias y oportunidades relevantes para tu programa y el ecosistema LATAM
              </p>
            </div>
          </div>

          {/* Last updated + refresh button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '0.5rem',
              marginLeft: 52,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock size={12} color="var(--color-text-muted)" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {lastUpdated
                  ? `Última actualización: ${lastUpdated}`
                  : 'Actualizando…'}
              </span>
            </div>
            {/* Global AI refresh writes shared data: superadmin only (API enforces it too) */}
            {appUser.role === 'superadmin' && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                borderRadius: 6,
                background: refreshing ? 'var(--color-bg-secondary)' : 'var(--color-ember)',
                border: 'none',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#fff',
                transition: 'all 0.2s ease',
              }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Actualizando…' : 'Actualizar con IA'}
            </button>
            )}
            {refreshResult && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                {refreshResult}
              </span>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  borderRadius: 999,
                  border: isActive
                    ? '1px solid rgba(31,119,246,0.3)'
                    : '1px solid var(--color-border)',
                  background: isActive ? 'rgba(31,119,246,0.08)' : 'var(--color-bg-card)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1F77F6' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </motion.div>

        {/* Tab content */}
        {activeTab === 'noticias' && (
          <div>
            {/* AI Digest card */}
            {(aiDigestLoading || aiDigest) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem 1.5rem',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(31,119,246,0.05) 100%)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>✨</span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#6366F1',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                      }}
                    >
                      Digest del ecosistema para tu cohorte
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                        marginTop: '0.15rem',
                      }}
                    >
                      Generado con IA basado en los sectores de tus founders
                      {cohortVerticals.length > 0 && (
                        <> · <strong style={{ color: 'var(--color-text-secondary)' }}>{cohortVerticals.join(', ')}</strong></>
                      )}
                    </div>
                  </div>
                </div>
                {aiDigestLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[100, 88, 75, 60].map((w, i) => (
                      <div
                        key={i}
                        style={{
                          height: 14,
                          borderRadius: 7,
                          background: 'rgba(99,102,241,0.12)',
                          width: `${w}%`,
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {aiDigest}
                  </p>
                )}
              </motion.div>
            )}
            {/* Category filter pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              style={{
                display: 'flex',
                gap: '0.375rem',
                marginBottom: '1.25rem',
                overflowX: 'auto',
                paddingBottom: '0.25rem',
              }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat
                const catIcon = cat !== 'Todos' ? CATEGORY_ICONS[cat] : null
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: 999,
                      border: isActive
                        ? '1px solid rgba(31,119,246,0.3)'
                        : '1px solid var(--color-border)',
                      background: isActive ? 'rgba(31,119,246,0.08)' : 'transparent',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1F77F6' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {catIcon && (() => { const CatIcon = catIcon; return <CatIcon size={11} /> })()}
                    {cat}
                  </button>
                )
              })}
            </motion.div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                gap: '1rem',
              }}
            >
              {filteredNews.map((item, i) => (
                <NewsCard key={item.title} item={item} index={i} />
              ))}
            </div>

            {liveNews === null && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}>
                  Cargando noticias…
                </p>
              </div>
            )}
            {liveNews !== null && filteredNews.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.5rem',
                }}>
                  {activeCategory === 'Todos'
                    ? 'No hay datos disponibles aún.'
                    : 'No hay noticias en esta categoría.'}
                </p>
                {activeCategory === 'Todos' && (
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                  }}>
                    El cron de actualización se ejecuta diariamente a las 10:00 UTC.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'programa' && (
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: 12,
                background: 'rgba(99,102,241,0.04)',
                border: '1px solid rgba(99,102,241,0.1)',
                marginBottom: '1rem',
              }}
            >
              <Target size={14} color="#6366F1" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Mostrando noticias relevantes para:{' '}
                <strong style={{ color: '#6366F1' }}>Programas de incubación y aceleración</strong>
              </span>
            </motion.div>
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                marginBottom: '0.5rem',
              }}>
                No hay datos disponibles aún.
              </p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}>
                El cron de actualización se ejecuta diariamente a las 10:00 UTC.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'actores' && isDemo && (
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', borderRadius: 12,
                background: 'rgba(31,119,246,0.04)',
                border: '1px solid rgba(31,119,246,0.15)',
                marginBottom: '1.25rem',
              }}
            >
              <Radio size={14} color="#1F77F6" />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
              }}>
                Mapa del ecosistema · {DEMO_ECOSYSTEM_ACTORS.length} actores activos en Perú y LATAM
              </span>
            </motion.div>

            {Object.keys(ACTOR_CATEGORY_LABELS).map((cat) => {
              const items = DEMO_ECOSYSTEM_ACTORS.filter((a) => a.category === cat)
              if (items.length === 0) return null
              const color = ACTOR_CATEGORY_COLORS[cat]
              return (
                <div key={cat} style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    marginBottom: '0.75rem',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', background: color,
                    }} />
                    <h3 style={{
                      fontFamily: 'var(--font-heading)', fontWeight: 600,
                      fontSize: '0.95rem', color: 'var(--color-text-primary)',
                      margin: 0,
                    }}>
                      {ACTOR_CATEGORY_LABELS[cat]}
                    </h3>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                    }}>
                      ({items.length})
                    </span>
                  </div>
                  <div style={{
                    display: 'grid', gap: '0.6rem',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
                  }}>
                    {items.map((a) => (
                      <div key={a.id} style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: `${color}0A`,
                        border: `1px solid ${color}33`,
                      }}>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                          fontWeight: 600, color: 'var(--color-text-primary)',
                          marginBottom: '0.2rem',
                        }}>
                          {a.name}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.66rem',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          marginBottom: '0.35rem',
                        }}>
                          {a.region}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.72rem',
                          color: 'var(--color-text-secondary)', lineHeight: 1.4,
                        }}>
                          {a.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
