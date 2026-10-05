'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  FileBarChart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Radar,
  Lightbulb,
  Inbox,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import S4CLogo from '@/components/S4CLogo'
import { useAuth } from '@/context/AuthContext'
import { SuperadminProvider } from '@/context/SuperadminContext'
import { supabase } from '@/lib/supabase'
import DemoLinkRewriter from '@/components/DemoLinkRewriter'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/cohortes', label: 'Cohortes', icon: Users },
  { href: '/admin/cohort-requests', label: 'Solicitudes', icon: Inbox },
  { href: '/admin/reportes', label: 'Reportes', icon: FileBarChart },
  { href: '/admin/benchmarking', label: 'Benchmarking', icon: BarChart3 },
  { href: '/admin/radar', label: 'RADAR', icon: Radar },
  { href: '/admin/oportunidades', label: 'Oportunidades', icon: Lightbulb },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading, logout, isDemo } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [fetchedOrgLogo, setOrgLogo] = useState<string | null>(null)
  const [fetchedOrgName, setOrgName] = useState<string | null>(null)
  // Demo org — hardcoded display info without hitting Supabase
  const orgLogo = isDemo ? null : fetchedOrgLogo
  const orgName = isDemo ? 'Universidad BioInnova' : fetchedOrgName
  const [pendingRequests, setPendingRequests] = useState<number>(0)

  // Close mobile sidebar on route change (state adjusted during render)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (isDemo) return
    if (!appUser?.org_id) return
    supabase.from('organizations').select('name, logo_url').eq('id', appUser.org_id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrgLogo(data.logo_url)
          setOrgName(data.name)
        }
      })
  }, [appUser?.org_id, isDemo])

  // Pending cohort_requests badge count — admin_org only, skip in demo mode
  useEffect(() => {
    if (isDemo) return
    if (!appUser || appUser.role !== 'admin_org') return
    let cancelled = false
    fetch('/api/cohort-requests?status=pending', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: { requests?: unknown[] }) => {
        if (cancelled) return
        setPendingRequests(Array.isArray(json.requests) ? json.requests.length : 0)
      })
      .catch((err) => {
        console.error('[S4C Admin] Error loading pending cohort_requests count:', err)
      })
    return () => {
      cancelled = true
    }
  }, [appUser, isDemo, pathname])

  // Route guards — admin_org only. Superadmin has its own tree at /superadmin.
  useEffect(() => {
    if (loading) return
    if (!appUser) {
      router.replace('/')
      return
    }
    if (appUser.role === 'superadmin') {
      router.replace('/superadmin')
      return
    }
    if (appUser.role !== 'admin_org') {
      router.replace('/tools')
    }
  }, [loading, appUser, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid #E5E7EB', borderTopColor: '#DA4E24',
          animation: 'spin 0.8s linear infinite',
        }} />

      </div>
    )
  }

  // Render nothing while redirecting (effect above handles navigation)
  if (!appUser) return null
  if (appUser.role !== 'admin_org') return null

  // When browsing under /demo-admin/*, the browser URL has that prefix
  // but nav hrefs use /admin/*. Normalize the pathname for comparisons
  // and build hrefs dynamically so DemoLinkRewriter isn't load-bearing.
  const demoPrefix = pathname.startsWith('/demo-admin') ? '/demo-admin'
    : pathname.startsWith('/demo-tools') ? '/demo-tools'
    : null
  const normPath = demoPrefix
    ? '/admin' + pathname.slice(demoPrefix.length)
    : pathname
  const navHref = (adminHref: string) =>
    demoPrefix ? demoPrefix + adminHref.slice('/admin'.length) : adminHref

  const isActive = (href: string) => {
    if (href === '/admin') return normPath === '/admin'
    return normPath.startsWith(href)
  }

  const sidebarContent = (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '1.5rem 1rem', overflowY: 'auto',
    }}>
      {/* Logo / Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0 0.5rem', marginBottom: '1.25rem',
      }}>
        {orgLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- org logo is an arbitrary admin-provided URL (no next/image remotePatterns)
          <img
            src={orgLogo}
            alt={orgName || 'Logo'}
            style={{
              width: 36, height: 36, borderRadius: 8,
              objectFit: 'contain', background: '#fff',
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{ flexShrink: 0, display: 'flex' }}>
            <S4CLogo size={36} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: '0.75rem', color: '#F1F5F9',
            lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {orgName || 'S4C Admin'}
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.625rem',
            color: '#94A3B8', opacity: 0.7,
          }}>
            Panel de gestión
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{
        display: 'inline-block',
        background: 'rgba(29,78,216,0.15)',
        color: '#3B82F6',
        fontFamily: 'var(--font-body)',
        fontSize: '0.5625rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
        letterSpacing: '0.06em',
        marginBottom: '0.75rem',
      }}>
        Organizaci&oacute;n
      </div>

      {/* Navigation — admin_org only */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          const showBadge = item.href === '/admin/cohort-requests' && pendingRequests > 0
          return (
            <Link
              key={item.href}
              href={navHref(item.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-full)',
                textDecoration: 'none', transition: 'all 0.15s ease',
                background: active ? 'var(--color-admin-sidebar-active)' : 'transparent',
                color: active ? '#fff' : '#94A3B8',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(29,78,216,0.08)'
                  e.currentTarget.style.color = '#93C5FD'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94A3B8'
                }
              }}
            >
              <Icon size={18} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                fontWeight: active ? 600 : 400,
                flex: 1,
              }}>
                {item.label}
              </span>
              {showBadge && (
                <span
                  aria-label={`${pendingRequests} solicitudes pendientes`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: '#DC2626',
                    color: '#fff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {pendingRequests > 99 ? '99+' : pendingRequests}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        <div style={{
          height: 1, background: 'rgba(255,255,255,0.08)',
          margin: '0 0.5rem 1rem',
        }} />

        {/* User info */}
        <div style={{
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.04)',
          marginBottom: '0.75rem',
        }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
            fontWeight: 600, color: '#F1F5F9', marginBottom: '0.125rem',
          }}>
            {appUser.full_name}
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.625rem',
            color: '#94A3B8', opacity: 0.7,
          }}>
            {appUser.email}
          </div>
        </div>

        <Link href={demoPrefix === '/demo-admin' ? '/demo-tools' : '/tools'} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
          textDecoration: 'none', transition: 'color 0.15s',
          color: '#94A3B8',
          fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
          background: 'none', border: 'none', width: '100%',
          marginBottom: '0.25rem',
        }}>
          <ChevronLeft size={16} />
          Ir a la plataforma
        </Link>

        <button
          onClick={async () => { await logout(); router.replace('/') }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#94A3B8',
            fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
            width: '100%', textAlign: 'left', transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#FCA5A5')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <SuperadminProvider>
    <div data-app-layout style={{ display: 'flex', minHeight: '100dvh', background: 'var(--color-bg-primary)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex"
        style={{
          width: 260, flexShrink: 0,
          background: 'rgba(5,5,5,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 40, flexDirection: 'column',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header
        className="flex lg:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: 56, background: 'rgba(5,5,5,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1rem',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <S4CLogo size={28} />
          <span style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700,
            fontSize: '0.75rem', color: '#F1F5F9',
          }}>
            S4C Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#F1F5F9', display: 'flex',
          }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
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
                position: 'fixed', inset: 0, zIndex: 55,
                background: 'rgba(0,0,0,0.5)',
              }}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: 'easeInOut' }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: 280, zIndex: 60,
                background: 'rgba(5,5,5,0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <main
        style={{ flex: 1, minHeight: '100dvh' }}
        className="lg:ml-[260px] pt-14 lg:pt-0"
      >
        {/* Top header bar */}
        <div style={{
          height: 56, background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.5rem',
        }}
          className="hidden lg:flex"
        >
          <div style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600,
            fontSize: '0.8125rem', color: 'var(--color-text-primary)',
          }}>
            {orgName || 'Mi Organización'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
              color: 'var(--color-text-secondary)',
            }}>
              {appUser.full_name}
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)', fontSize: '0.625rem', fontWeight: 700,
              color: 'var(--color-accent-primary)',
            }}>
              {appUser.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Keep browser URL within /demo-admin/* during demo sessions */}
      <DemoLinkRewriter />
    </div>
    </SuperadminProvider>
  )
}
