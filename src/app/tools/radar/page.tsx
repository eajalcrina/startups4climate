'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Radio,
  Newspaper,
  TrendingUp,
  Scale,
  Lightbulb,
  Award,
  ExternalLink,
  Calendar,
  FileText,
  Filter,
  Zap,
  Droplets,
  RefreshCw,
  Leaf,
  Bike,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/* ─── URL helpers ─── */
// Returns null for AI-curated items (Google News search URL = synthetic title, search fails)
// RSS items with real article paths → "Leer artículo"
// RSS items with only a homepage → "Buscar noticia" via Google News search
function getNewsLinkInfo(sourceUrl: string | null, title: string): { href: string; label: string } | null {
  if (!sourceUrl) return null
  const url = sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`
  if (url.includes('news.google.com/search')) return null // AI-generated — no link
  try {
    const parsed = new URL(url)
    if (parsed.pathname.length > 1) return { href: url, label: 'Leer artículo' }
    // Bare homepage — fall back to Google News search so the user can still find the story
    const q = encodeURIComponent(title.slice(0, 100))
    return { href: `https://news.google.com/search?q=${q}&hl=es-419`, label: 'Buscar noticia' }
  } catch { return null }
}

/* ─── Types ─── */
type ContentType = 'news' | 'regulation' | 'investment' | 'trend' | 'event' | 'report'

interface NewsRow {
  id: string
  title: string
  summary: string | null
  source_name: string | null
  source_url: string | null
  vertical: string | null
  country: string | null
  content_type: ContentType
  tags: string[] | null
  published_at: string | null
}

/* ─── Display maps ─── */
const TYPE_LABELS: Record<ContentType, string> = {
  news: 'Noticia', regulation: 'Regulación', investment: 'Inversión',
  trend: 'Tendencia', event: 'Programa', report: 'Reporte',
}
const TYPE_COLORS: Record<ContentType, { color: string; bg: string; border: string }> = {
  news:       { color: '#2A222B', bg: 'rgba(42,34,43,0.08)',    border: 'rgba(42,34,43,0.18)' },
  regulation: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.18)' },
  investment: { color: '#1F77F6', bg: 'rgba(31,119,246,0.08)',  border: 'rgba(31,119,246,0.18)' },
  trend:      { color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.18)' },
  event:      { color: '#EC4899', bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.18)' },
  report:     { color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.18)' },
}
const TYPE_ICONS: Record<ContentType, typeof TrendingUp> = {
  news: Newspaper, regulation: Scale, investment: TrendingUp,
  trend: Lightbulb, event: Award, report: FileText,
}
const COUNTRY_LABELS: Record<string, string> = {
  PE: 'Perú', CL: 'Chile', CO: 'Colombia', MX: 'México', AR: 'Argentina', BR: 'Brasil',
}

/* ─── Category definitions ─── */
type RadarCategory = 'Todos' | 'Energía' | 'Agua' | 'Eco. circular' | 'Biodiversidad' | 'Movilidad' | 'Agri & Alimentos'

const CATEGORIES: { id: RadarCategory; icon: typeof Zap; color: string }[] = [
  { id: 'Todos',            icon: Radio,    color: '#DA4E24' },
  { id: 'Energía',          icon: Zap,      color: '#F59E0B' },
  { id: 'Agua',             icon: Droplets, color: '#0EA5E9' },
  { id: 'Eco. circular',    icon: RefreshCw,color: '#10B981' },
  { id: 'Biodiversidad',    icon: Leaf,     color: '#22C55E' },
  { id: 'Movilidad',        icon: Bike,     color: '#8B5CF6' },
  { id: 'Agri & Alimentos', icon: Leaf,     color: '#84CC16' },
]

// Maps each UI category to relevant DB verticals + title/summary keywords
const CATEGORY_MATCH: Record<RadarCategory, { verticals?: string[]; types?: ContentType[]; keywords: string[] }> = {
  'Todos':          { keywords: [] },
  'Energía':        { verticals: ['cleantech_climatech'], keywords: ['solar','eólico','eolico','renewable','energía','energia','energy','hidro','geotérm','geotherm','batería','battery','paneles','wind','turbina','voltaico'] },
  'Agua':           { keywords: ['agua','water','hídric','hidric','océan','ocean','cuenca','riego','marina','acuífer','acuifer','desalin','lluvia','río','rio','lake','lago','saneamiento','irrigation'] },
  'Eco. circular':  { keywords: ['circular','residuo','reciclaje','recycle','waste','reutiliz','compost','biodegradabl','packaging','plástico','plastic','basura','relleno','bioeconomía','bioeconomia'] },
  'Biodiversidad':  { keywords: ['biodiversid','biodiversity','forest','bosque','naturaleza','nature','ecosystem','fauna','flora','especie','conserv','reforesta','manglar','deforesta','ambiente','selva','jungle'] },
  'Movilidad':      { verticals: ['logistics_mobility'], keywords: ['movilidad','mobility','transport','vehícul','vehicle','eléctric','electric','bicicl','micro','bus','tren','train','metro','camión','camion','uber','autobús'] },
  'Agri & Alimentos': { verticals: ['agritech_foodtech'], keywords: ['agritech','foodtech','agricultur','farm','alimento','food','cosecha','semilla','ganadería','ganaderia','pecuario','café','cafe','cacao','quinua','acuicultur'] },
}

function matchesCategory(item: NewsRow, cat: RadarCategory): boolean {
  if (cat === 'Todos') return true
  const mapping = CATEGORY_MATCH[cat]
  const text = `${item.title} ${item.summary || ''} ${item.vertical || ''}`.toLowerCase()
  if (mapping.verticals?.some(v => item.vertical === v)) return true
  if (mapping.types?.some(t => item.content_type === t)) return true
  if (mapping.keywords.some(kw => text.includes(kw.toLowerCase()))) return true
  return false
}

/* ─── Region logic ─── */
const LATAM_CODES = new Set(['PE','CL','CO','MX','AR','BR','EC','BO','PY','UY','VE','CR','PA','GT','HN','SV','NI','DO','CU'])
const GLOBAL_CODES = new Set([
  // Norte América
  'US','CA',
  // Europa
  'GB','DE','FR','ES','IT','NL','SE','NO','DK','FI','CH','AT','BE','PT','PL','IE',
  // Asia-Pacífico
  'CN','JP','KR','IN','SG','AU','NZ','TW','HK','ID','TH','VN',
  // África relevante
  'ZA','NG','KE',
])

type RegionFilter = 'Global' | 'LATAM' | string // string = nombre del país del founder

function matchesRegion(item: NewsRow, region: RegionFilter, founderCountryCode: string | null): boolean {
  if (region === 'Global') {
    // Ítems de países no-LATAM, o sin país pero provenientes de fuentes globales
    if (!item.country) return false // sin país = asumir LATAM (feeds actuales son LATAM)
    return GLOBAL_CODES.has(item.country) && !LATAM_CODES.has(item.country)
  }
  if (region === 'LATAM') {
    // Ítems de países LATAM o sin país asignado (fuentes regionales LATAM)
    return !item.country || LATAM_CODES.has(item.country)
  }
  // País del founder
  return !!item.country && item.country === founderCountryCode
}

/* ─── Helpers ─── */
function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

/* ─── Components ─── */
function CategoryPill({ type }: { type: ContentType }) {
  const style = TYPE_COLORS[type]
  const Icon = TYPE_ICONS[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.125rem 0.5rem', borderRadius: 999,
      background: style.bg, border: `1px solid ${style.border}`,
      fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)',
      fontWeight: 600, color: style.color, whiteSpace: 'nowrap',
    }}>
      <Icon size={10} />{TYPE_LABELS[type]}
    </span>
  )
}

function NewsCard({ item, index }: { item: NewsRow; index: number }) {
  const accent = TYPE_COLORS[item.content_type].color
  const linkInfo = getNewsLinkInfo(item.source_url, item.title)
  const isAICurated = !linkInfo // no real URL = AI-generated content
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.03 + index * 0.03, ease: 'easeOut' }}
      style={{
        padding: '1.25rem', borderRadius: 12,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        overflowWrap: 'break-word', wordBreak: 'break-word',
      }}
      whileHover={{ boxShadow: 'var(--shadow-card-hover)', y: -2 }}
    >
      {/* Top row: type pill + country + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <CategoryPill type={item.content_type} />
        {item.country && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {COUNTRY_LABELS[item.country] ?? item.country}
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
          <Calendar size={10} />{formatDate(item.published_at)}
        </span>
      </div>

      {/* Title */}
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.35, margin: 0 }}>
        {item.title}
      </h3>

      {/* Summary */}
      {item.summary && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {item.summary}
        </p>
      )}

      {/* Footer: source + link or AI badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
        {item.source_name && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {item.source_name}
          </span>
        )}
        {linkInfo ? (
          <a
            href={linkInfo.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600,
              color: accent, textDecoration: 'none',
            }}
          >
            {linkInfo.label} <ExternalLink size={11} />
          </a>
        ) : isAICurated && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', fontWeight: 600,
            color: 'var(--color-text-muted)', opacity: 0.7,
          }}>
            ✦ Curado por IA
          </span>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Page ─── */
export default function RadarPage() {
  const { appUser } = useAuth()
  const pathname = usePathname()
  const toolsBase = pathname.startsWith('/demo-tools') ? '/demo-tools' : '/tools'
  const [items, setItems] = useState<NewsRow[]>([])
  const [startup, setStartup] = useState<{ vertical: string | null; country: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState<RadarCategory>('Todos')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('LATAM')
  const [activeTab, setActiveTab] = useState<'todos' | 'para-ti'>('todos')
  const [refreshing, setRefreshing] = useState(false)
  const isSuperadmin = appUser?.role === 'superadmin'

  // suppress unused warning for toolsBase (used in demo routing context)
  void toolsBase

  const handleRefreshRadar = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/refresh-radar', { method: 'POST' })
      if (res.ok) window.location.reload()
      else { console.error('[S4C Radar refresh]', await res.json()); alert('Error al refrescar. Ver consola.') }
    } catch (err) { console.error('[S4C Radar refresh]', err) }
    finally { setRefreshing(false) }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const newsPromise = supabase
          .from('news_items')
          .select('id,title,summary,source_name,source_url,vertical,country,content_type,tags,published_at')
          .eq('is_active', true)
          .order('published_at', { ascending: false })
          .limit(80)
        const userRes = await supabase.auth.getUser()
        const uid = userRes.data.user?.id
        const startupPromise = uid
          ? supabase.from('startups').select('vertical, country').eq('founder_id', uid).maybeSingle()
          : Promise.resolve({ data: null, error: null })
        const [newsRes, startupRes] = await Promise.all([newsPromise, startupPromise])
        if (cancelled) return
        if (newsRes.error) console.error('[S4C RADAR]', newsRes.error)
        setItems((newsRes.data as NewsRow[]) || [])
        setStartup(startupRes.data || null)
      } catch (err) {
        console.error('[S4C RADAR] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Para-ti items: match vertical + country of founder's startup
  const paraTimItems = useMemo(() => {
    if (!startup) return items
    return items.filter((it) => {
      const verticalMatch = startup.vertical && it.vertical === startup.vertical
      const countryMatch = startup.country && it.country === startup.country
      const isGlobal = !it.country && !it.vertical
      return verticalMatch || countryMatch || isGlobal
    })
  }, [items, startup])

  // Region pills: Global | LATAM | [País del founder]
  const founderCountryCode = startup?.country ?? null
  const founderCountryLabel = founderCountryCode ? (COUNTRY_LABELS[founderCountryCode] ?? null) : null

  // Filtered items
  const baseList = activeTab === 'para-ti' ? paraTimItems : items
  const filtered = useMemo(() => baseList.filter((item) => {
    const catOk = matchesCategory(item, catFilter)
    const regionOk = matchesRegion(item, regionFilter, founderCountryCode)
    return catOk && regionOk
  }), [baseList, catFilter, regionFilter, founderCountryCode])
  const visibleRegions: RegionFilter[] = founderCountryLabel
    ? ['Global', 'LATAM', founderCountryLabel]
    : ['Global', 'LATAM']

  const lastUpdated = items[0]?.published_at
    ? new Date(items[0].published_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ marginBottom: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(218,78,36,0.08)', border: '1px solid rgba(218,78,36,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Radio size={20} color="#DA4E24" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)',
              fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em',
              lineHeight: 1.3, margin: 0,
            }}>
              Radar del ecosistema
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Noticias e inversiones curadas de clima, agri, movilidad y más en LATAM
            </p>
          </div>
          {isSuperadmin && (
            <button onClick={handleRefreshRadar} disabled={refreshing} style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.875rem', borderRadius: 6,
              background: refreshing ? 'rgba(218,78,36,0.06)' : 'rgba(218,78,36,0.10)',
              border: '1px solid rgba(218,78,36,0.25)',
              fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600,
              color: refreshing ? 'rgba(218,78,36,0.5)' : '#DA4E24',
              cursor: refreshing ? 'wait' : 'pointer',
            }}>
              {refreshing ? 'Actualizando…' : '✦ Actualizar con IA'}
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Tabs (todos / para ti) ── */}
      {startup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
        >
          {(['todos', 'para-ti'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.375rem 0.875rem', borderRadius: 999,
                border: activeTab === tab ? '1px solid rgba(218,78,36,0.4)' : '1px solid var(--color-border)',
                background: activeTab === tab ? 'rgba(218,78,36,0.08)' : 'var(--color-bg-card)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? '#DA4E24' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {tab === 'todos' ? 'Todo el radar' : 'Relevante para ti'}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Category filter pills ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}
      >
        <Filter size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        {CATEGORIES.map(({ id, icon: Icon, color }) => {
          const isActive = catFilter === id
          return (
            <button key={id} onClick={() => setCatFilter(id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.4rem 0.875rem', borderRadius: 999,
              border: isActive ? `1px solid ${color}40` : '1px solid var(--color-border)',
              background: isActive ? `${color}12` : 'var(--color-bg-card)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? color : 'var(--color-text-secondary)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <Icon size={13} />{id}
            </button>
          )
        })}
      </motion.div>

      {/* ── Region filter pills ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}
      >
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexShrink: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Región
        </span>
        {visibleRegions.map((region) => {
          const isActive = regionFilter === region
          return (
            <button key={region} onClick={() => setRegionFilter(region)} style={{
              padding: '0.25rem 0.625rem', borderRadius: 999,
              border: isActive ? '1px solid rgba(218,78,36,0.35)' : '1px solid var(--color-border)',
              background: isActive ? 'rgba(218,78,36,0.08)' : 'transparent',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#DA4E24' : 'var(--color-text-muted)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {region}
            </button>
          )
        })}
      </motion.div>


      {/* ── Count ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.18 }}
        style={{ marginBottom: '1rem' }}
      >
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {loading ? 'Cargando…' : `${filtered.length} artículo${filtered.length !== 1 ? 's' : ''} · actualizado ${lastUpdated}`}
        </span>
      </motion.div>

      {/* ── Card grid ── */}
      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 0', textAlign: 'center' }}>Cargando radar…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem', textAlign: 'center',
          border: '1px dashed var(--color-border)', borderRadius: 12,
          background: 'var(--color-bg-card)',
        }}>
          <Radio size={28} color="var(--color-text-muted)" style={{ marginBottom: '0.5rem' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            No hay artículos para este filtro aún.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
            {isSuperadmin ? 'Usa "Actualizar con IA" para poblar el radar.' : 'Vuelve pronto — actualizamos el radar periódicamente.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
          gap: '1rem',
          paddingBottom: '3rem',
        }}>
          {filtered.map((item, i) => (
            <NewsCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
