'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Radio,
  Target,
  FileText,
  BookOpen,
  User,
  Building2,
  Users,
  Activity,
  LineChart,
  Lock,
  Lightbulb,
  FlaskConical,
  Rocket,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import S4CLogo from '@/components/S4CLogo'
import MentorWidget from '@/components/ai/MentorWidget'
import { TOOLS_BY_STAGE, TRANSVERSAL_TOOLS, type ToolDef } from '@/lib/tools-data'
import { getProgress, hydrateProgressFromSupabase } from '@/lib/progress'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { supabase } from '@/lib/supabase'
import DemoLinkRewriter from '@/components/DemoLinkRewriter'
import OnboardingTour from '@/components/OnboardingTour'

const STAGE_CONFIG = {
  0: { label: 'Ideación', color: '#16A34A' },
  1: { label: 'Pre-incubación', color: '#DA4E24' },
  2: { label: 'Incubación', color: '#1F77F6' },
  3: { label: 'Aceleración', color: '#F0721D' },
  4: { label: 'Escalamiento', color: '#5BB4FF' },
} as const

const STAGE_ICONS = [Lightbulb, FlaskConical, Rocket, Building2, TrendingUp] as const

/* ─── Sidebar palette — uses CSS vars for consistency with admin/superadmin ─── */
const SB = {
  bg: 'var(--color-admin-sidebar-bg)',
  text: 'var(--color-admin-sidebar-text)',
  textActive: '#FFFFFF',
  textHover: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.35)',
  divider: 'var(--color-border)',
  hoverBg: 'rgba(255,255,255,0.04)',
  cardBg: 'rgba(255,255,255,0.03)',
}

function StageSidebarSection({
  stageNum,
  tools,
  completedIds,
  currentPath,
  currentSearchStage,
}: {
  stageNum: 0 | 1 | 2 | 3 | 4
  tools: ToolDef[]
  completedIds: Set<string>
  currentPath: string
  currentSearchStage: number | null
}) {
  const cfg = STAGE_CONFIG[stageNum]
  const [open, setOpen] = useState(false)
  const nonTransversalTools = tools.filter((t) => !t.transversal)
  const transversalInStage = TRANSVERSAL_TOOLS
  const totalToolCount = nonTransversalTools.length + transversalInStage.length
  const completedCount =
    nonTransversalTools.filter((t) => completedIds.has(t.id)).length +
    transversalInStage.filter((t) => completedIds.has(`${t.id}__stage${stageNum}`)).length

  return (
    <div style={{ marginBottom: '0.125rem' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4375rem 0.75rem',
          borderRadius: 8,
          background: open ? SB.cardBg : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = SB.hoverBg }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(() => {
            const StageIcon = STAGE_ICONS[stageNum] ?? Lightbulb
            return (
              <StageIcon
                size={14}
                color={open ? '#DA4E24' : 'rgba(255,255,255,0.35)'}
                strokeWidth={1.75}
              />
            )
          })()}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: cfg.color,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.5625rem',
              color: SB.textMuted,
              fontWeight: 500,
            }}
          >
            {completedCount}/{totalToolCount}
          </span>
          {open ? (
            <ChevronDown size={11} color={SB.textMuted} />
          ) : (
            <ChevronRight size={11} color={SB.textMuted} />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: '0.25rem', paddingTop: '0.125rem' }}>
              {nonTransversalTools.map((tool) => {
                const active = currentPath === `/tools/${tool.id}`
                const done = completedIds.has(tool.id)
                return (
                  <Link
                    key={tool.id}
                    href={`/tools/${tool.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.375rem 0.625rem',
                      paddingLeft: 'calc(0.625rem - 2px)',
                      borderRadius: 6,
                      background: active ? 'rgba(218,78,36,0.10)' : 'transparent',
                      borderLeft: active ? '2px solid #DA4E24' : '2px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = SB.hoverBg
                        e.currentTarget.style.borderLeft = '2px solid transparent'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderLeft = '2px solid transparent'
                      }
                    }}
                  >
                    {done ? (
                      <CheckCircle2 size={12} color={cfg.color} style={{ flexShrink: 0 }} />
                    ) : (
                      <Circle
                        size={12}
                        color={active ? '#DA4E24' : SB.textMuted}
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <span
                      title={tool.shortName}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.6875rem',
                        fontWeight: active ? 600 : 400,
                        color: active ? SB.textActive : SB.text,
                        lineHeight: 1.3,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tool.shortName}
                    </span>
                  </Link>
                )
              })}
              {/* Transversal tools */}
              {TRANSVERSAL_TOOLS.map((tool) => {
                const href = `/tools/${tool.id}?stage=${stageNum}`
                const active = currentPath === `/tools/${tool.id}` && currentSearchStage === stageNum
                const storageKey = `${tool.id}__stage${stageNum}`
                const done = completedIds.has(storageKey)
                return (
                  <Link
                    key={`transversal-${tool.id}-s${stageNum}`}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.375rem 0.625rem',
                      paddingLeft: 'calc(0.625rem - 2px)',
                      borderRadius: 6,
                      background: active ? 'rgba(218,78,36,0.10)' : 'transparent',
                      borderLeft: active ? '2px solid #DA4E24' : '2px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = SB.hoverBg
                        e.currentTarget.style.borderLeft = '2px solid transparent'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderLeft = '2px solid transparent'
                      }
                    }}
                  >
                    {done ? (
                      <CheckCircle2 size={12} color={cfg.color} style={{ flexShrink: 0 }} />
                    ) : (
                      <Circle
                        size={12}
                        color={active ? '#DA4E24' : SB.textMuted}
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <span
                      title={tool.shortName}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.6875rem',
                        fontWeight: active ? 600 : 400,
                        color: active ? SB.textActive : SB.text,
                        lineHeight: 1.3,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tool.shortName}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0px 5px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.06)',
                        color: SB.textMuted,
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        lineHeight: 1.6,
                        flexShrink: 0,
                      }}
                    >
                      T
                    </span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolsLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, logout, isDemo } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const demoPrefix = pathname.startsWith('/demo-tools') ? '/demo-tools' : null
  const toolsNavHref = (href: string) =>
    demoPrefix ? demoPrefix + href.slice('/tools'.length) : href
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const currentSearchStage = stageParam ? parseInt(stageParam, 10) : null
  const [mobileOpen, setMobileOpen] = useState(false)
  // Bumped after Supabase hydration rewrites the local progress cache
  const [progressVersion, setProgressVersion] = useState(0)
  const [orgName, setOrgName] = useState<string | null>(null)

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Close mobile sidebar on route change (state adjusted during render)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!loading && user && pathname === '/tools' && !isDemo) {
      const checked = sessionStorage.getItem('s4c_profile_checked')
      if (checked) return
      sessionStorage.setItem('s4c_profile_checked', '1')
      try {
        const extra = localStorage.getItem(`s4c_${user.id}_profile_extra`)
        if (!extra || extra === '{}') {
          router.replace('/tools/completar-perfil')
        }
      } catch {
        // ignore
      }
    }
  }, [user, loading, pathname, router, isDemo])

  const profileIncomplete = useMemo(() => {
    if (!user) return false
    try {
      const extra = localStorage.getItem(`s4c_${user.id}_profile_extra`)
      if (!extra || extra === '{}') return true
      const parsed = JSON.parse(extra)
      return !parsed.vertical || !parsed.country || !parsed.role
    } catch {
      return true
    }
  }, [user])

  // Load org name if founder belongs to one
  useEffect(() => {
    if (appUser?.org_id) {
      supabase
        .from('organizations')
        .select('name')
        .eq('id', appUser.org_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.name) setOrgName(data.name)
        })
    }
  }, [appUser?.org_id])

  // Re-read the local progress cache on every route change and after hydration
  const completedIds = useMemo(() => {
    void progressVersion
    void pathname
    if (!user) return new Set<string>()
    const progress = getProgress(user.id)
    return new Set(Object.entries(progress).filter(([, v]) => v.completed).map(([k]) => k))
  }, [user, pathname, progressVersion])

  useEffect(() => {
    if (!user || isDemo) return
    // Hydrate from Supabase on first load
    hydrateProgressFromSupabase(user.id).then((changed) => {
      if (changed) setProgressVersion((v) => v + 1)
    })
  }, [user, pathname, isDemo])

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-primary)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '2px solid #E8E4DF',
            borderTopColor: '#1F77F6',
            animation: 'spin 0.8s linear infinite',
          }}
        />

      </div>
    )
  }

  const nonTransversalCount = Object.values(TOOLS_BY_STAGE).flat().filter((t) => !t.transversal).length
  const totalTools = nonTransversalCount + TRANSVERSAL_TOOLS.length * 4
  const completedCount = completedIds.size
  const progressPct = totalTools > 0 ? Math.round((completedCount / totalTools) * 100) : 0

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem 0.75rem',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
          marginBottom: '1.25rem',
          padding: '0 0.5rem',
        }}
      >
        <S4CLogo size={26} />
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.625rem',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
          }}
        >
          Startups<span style={{ color: '#DA4E24' }}>4</span>Climate
        </span>
      </Link>

      {/* Role badge */}
      <div style={{
        display: 'inline-block',
        background: 'rgba(31,119,246,0.15)',
        color: '#1F77F6',
        fontFamily: 'var(--font-body)',
        fontSize: '0.5625rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
        letterSpacing: '0.06em',
        marginBottom: '0.5rem',
      }}>
        Founder
      </div>

      {/* User card + progress */}
      <div
        style={{
          padding: '0.625rem 0.75rem',
          borderRadius: 10,
          background: SB.cardBg,
          border: '1px solid rgba(255,255,255,0.04)',
          marginBottom: '0.875rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'rgba(218,78,36,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#DA4E24',
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.625rem',
                color: SB.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
              }}
            >
              {user.startup || user.email}
            </div>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#DA4E24',
            }}
          >
            {progressPct}%
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 2,
              background: 'linear-gradient(90deg, #DA4E24, #1F77F6)',
              width: `${progressPct}%`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.5625rem',
            color: SB.textMuted,
            marginTop: '0.25rem',
          }}
        >
          {completedCount}/{totalTools} herramientas completadas
        </div>
      </div>

      {profileIncomplete && (
        <Link
          href={toolsNavHref('/tools/perfil')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4375rem 0.75rem',
            borderRadius: 8,
            background: 'rgba(218,78,36,0.06)',
            border: '1px solid rgba(218,78,36,0.1)',
            textDecoration: 'none',
            marginBottom: '0.625rem',
            transition: 'all 0.15s',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6875rem',
              color: '#DA4E24',
              lineHeight: 1.4,
            }}
          >
            Completa tu perfil para recomendaciones personalizadas
          </span>
        </Link>
      )}

      {/* Mi programa section */}
      <div
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          background: SB.cardBg,
          border: '1px solid rgba(255,255,255,0.04)',
          marginBottom: '0.875rem',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.5625rem',
            fontWeight: 600,
            color: SB.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.375rem',
          }}
        >
          Mi programa
        </div>
        {appUser?.org_id && orgName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Building2 size={12} color="#1F77F6" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: SB.textActive,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {orgName}
            </span>
          </div>
        ) : (
          <Link
            href={toolsNavHref('/tools/programas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              textDecoration: 'none',
              padding: '0.125rem 0',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <Users size={12} color={SB.textMuted} style={{ flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.625rem',
                color: SB.text,
              }}
            >
              Unirse a un programa
            </span>
          </Link>
        )}
      </div>

      {/* Dashboard link */}
      <Link
        href="/tools"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 9999,
          background: pathname === '/tools' ? '#DA4E24' : 'transparent',
          textDecoration: 'none',
          marginBottom: '0.25rem',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (pathname !== '/tools') e.currentTarget.style.background = SB.hoverBg
        }}
        onMouseLeave={(e) => {
          if (pathname !== '/tools') e.currentTarget.style.background = 'transparent'
        }}
      >
        <LayoutDashboard size={18} color={pathname === '/tools' ? '#FFFFFF' : SB.text} />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.6875rem',
            fontWeight: pathname === '/tools' ? 600 : 400,
            color: pathname === '/tools' ? SB.textActive : SB.text,
          }}
        >
          Dashboard
        </span>
      </Link>

      <div style={{ height: 1, background: SB.divider, margin: '0.25rem 0.5rem 0.5rem' }} />

      {/* Featured tools */}
      {[
        { label: 'Diagnóstico', icon: Activity, href: '/tools/diagnostico', color: '#DA4E24' },
        { label: 'RADAR', icon: Radio, href: '/tools/radar', color: '#1F77F6' },
        { label: 'Oportunidades', icon: Target, href: '/tools/oportunidades', color: '#DA4E24' },
        { label: 'Passport', icon: FileText, href: '/tools/passport', color: '#1F77F6' },
        { label: 'KPIs semanales', icon: LineChart, href: '/tools/kpis', color: '#6366F1' },
      ].map((item) => {
        const normPathname = demoPrefix ? '/tools' + pathname.slice(demoPrefix.length) : pathname
        const active = normPathname === item.href
        const IconComp = item.icon
        return (
          <Link
            key={item.href}
            href={toolsNavHref(item.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 9999,
              background: active ? '#DA4E24' : 'transparent',
              textDecoration: 'none',
              marginBottom: '0.0625rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = SB.hoverBg
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = 'transparent'
            }}
          >
            <IconComp size={18} color={active ? '#FFFFFF' : SB.text} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.6875rem',
                fontWeight: active ? 600 : 400,
                color: active ? SB.textActive : SB.text,
                flex: 1,
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}

      {/* Recursos */}
      {(() => {
        const normPathname = demoPrefix ? '/tools' + pathname.slice(demoPrefix.length) : pathname
        const recursosActive = normPathname === '/tools/recursos'
        return (
        <Link
          href={toolsNavHref('/tools/recursos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 9999,
            background: recursosActive ? '#DA4E24' : 'transparent',
            textDecoration: 'none',
            color: recursosActive ? '#FFFFFF' : SB.text,
            fontFamily: 'var(--font-body)',
            fontSize: '0.6875rem',
            fontWeight: recursosActive ? 600 : 400,
            transition: 'all 0.15s',
            marginBottom: '0.125rem',
          }}
          onMouseEnter={(e) => {
            if (!recursosActive) e.currentTarget.style.background = SB.hoverBg
          }}
          onMouseLeave={(e) => {
            if (!recursosActive) e.currentTarget.style.background = 'transparent'
          }}
        >
        <BookOpen size={18} />
        Recursos
        </Link>
        )
      })()}

      <div style={{ height: 1, background: SB.divider, margin: '0.375rem 0.5rem 0.5rem' }} />

      {/* Section label */}
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.5625rem',
          fontWeight: 600,
          color: SB.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 0.75rem',
          marginBottom: '0.375rem',
        }}
      >
        Herramientas por etapa
      </div>

      {/* Tools by stage */}
      {([0, 1, 2, 3, 4] as const).map((stage) => {
        // Pre-incubación+ is locked if founder is in 'ideacion' stage
        const founderStage = appUser?.stage ?? null
        const isLocked = stage >= 1 && founderStage === 'ideacion'
        return (
          <div key={stage} style={{ position: 'relative' }}>
            <StageSidebarSection
              stageNum={stage}
              tools={TOOLS_BY_STAGE[stage] ?? []}
              completedIds={completedIds}
              currentPath={pathname}
              currentSearchStage={currentSearchStage}
            />
            {isLocked && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                backdropFilter: 'blur(1px)',
                cursor: 'not-allowed',
              }}>
                <Lock size={10} color="rgba(255,255,255,0.5)" />
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.5625rem',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  Completa Ideación primero
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* Bottom actions */}
      <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
        <div style={{ height: 1, background: SB.divider, margin: '0 0.5rem 0.75rem' }} />

        {/* Perfil */}
        <Link
          href={toolsNavHref('/tools/perfil')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 9999,
            background: pathname === '/tools/perfil' ? '#DA4E24' : 'transparent',
            textDecoration: 'none',
            color: pathname === '/tools/perfil' ? '#FFFFFF' : SB.text,
            fontFamily: 'var(--font-body)',
            fontSize: '0.6875rem',
            fontWeight: pathname === '/tools/perfil' ? 600 : 400,
            transition: 'all 0.15s',
            marginBottom: '0.25rem',
          }}
          onMouseEnter={(e) => {
            if (pathname !== '/tools/perfil') e.currentTarget.style.background = SB.hoverBg
          }}
          onMouseLeave={(e) => {
            if (pathname !== '/tools/perfil') e.currentTarget.style.background = 'transparent'
          }}
        >
          <User size={16} />
          Perfil
        </Link>

        {/* User avatar + name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.625rem 0.75rem',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          marginBottom: '0.5rem',
        }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'rgba(218,78,36,0.20)',
            border: '1px solid rgba(218,78,36,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: '0.625rem',
            fontWeight: 700,
            color: '#DA4E24',
            flexShrink: 0,
            textTransform: 'uppercase' as const,
          }}>
            {appUser?.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('') ?? '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#F1F5F9',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {appUser?.full_name ?? '—'}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.5625rem',
              color: 'rgba(255,255,255,0.40)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.email ?? ''}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 9999,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: SB.text,
            fontFamily: 'var(--font-body)',
            fontSize: '0.6875rem',
            width: '100%',
            textAlign: 'left',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#FCA5A5')}
          onMouseLeave={(e) => (e.currentTarget.style.color = SB.text)}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div
      data-app-layout
      style={{
        display: 'flex',
        minHeight: '100dvh',
        background: 'var(--color-bg-primary)',
      }}
    >
      {/* Desktop sidebar */}
      <aside
        className={isDemo ? undefined : "hidden lg:flex"}
        style={{
          width: 260,
          flexShrink: 0,
          background: SB.bg,
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          display: isDemo ? 'flex' : undefined,
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile header — hidden in demo mode (sidebar always visible) */}
      <header
        className={isDemo ? "hidden" : "flex lg:hidden"}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 52,
          background: SB.bg,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Link
          href="/tools"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
          }}
        >
          <S4CLogo size={24} />
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.625rem',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            Plataforma
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#FFFFFF',
            display: 'flex',
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 55,
                background: 'rgba(0,0,0,0.5)',
              }}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 260,
                zIndex: 60,
                background: SB.bg,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          minHeight: '100dvh',
          minWidth: 0,
          overflowX: 'hidden',
          overflowWrap: 'break-word' as const,
          wordBreak: 'break-word' as const,
        }}
        className="lg:ml-[260px] pt-14 lg:pt-0"
      >
        {/* Desktop top bar — matches admin/superadmin structure */}
        <div
          style={{
            height: 44,
            background: 'rgba(10,10,10,0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
          }}
          className="hidden lg:flex"
        >
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'var(--color-text-primary)',
          }}>
            {appUser?.startup_name || 'Plataforma'}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-secondary)',
            }}>
              {appUser?.full_name}
            </span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--color-accent-primary)',
            }}>
              {appUser?.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Floating Mentor AI Widget */}
      <MentorWidget />

      {/* First-visit onboarding tour (founders only, once per user) */}
      <OnboardingTour />

      {/* Keep browser URL within /demo-tools/* during demo sessions */}
      <DemoLinkRewriter />
    </div>
  )
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-primary)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid #E8E4DF',
              borderTopColor: '#1F77F6',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      }
    >
      <ToolsLayoutInner>{children}</ToolsLayoutInner>
    </Suspense>
  )
}
