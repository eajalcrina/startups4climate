'use client'

import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import S4CLogo from '@/components/S4CLogo'

const navLinks: { label: string; href: string; isPage?: boolean }[] = [
  { label: 'Plataforma', href: '/#plataforma' },
  { label: 'Diagnóstico', href: '/#diagnostico' },
  { label: 'Workbook', href: '/workbook', isPage: true },
  { label: 'Organizaciones', href: '/organizaciones', isPage: true },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { user, appUser, openAuthModal } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href: string) => {
    const hash = href.startsWith('/') ? href.slice(1) : href
    if (pathname === '/') {
      const el = document.querySelector(hash)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 140
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
    } else {
      router.push(href)
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: scrolled ? '0.85rem' : '1.25rem',
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 1rem',
          pointerEvents: 'none',
          transition: 'top 0.3s var(--ease-smooth)',
        }}
      >
        <nav
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 1080,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 0.75rem 0.55rem 1.25rem',
            borderRadius: 999,
            background: 'rgba(14, 14, 14, 0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            boxShadow: scrolled
              ? '0 18px 50px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 10px 30px -16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            transition: 'all 0.3s var(--ease-smooth)',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault()
              if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
              else router.push('/')
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
          >
            <S4CLogo size={26} />
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Startups<span className="text-ember">4</span>Climate
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div
            className="hidden md:flex"
            style={{ alignItems: 'center', gap: '1.75rem' }}
          >
            {navLinks.map((link) => {
              const isActive = link.isPage
                ? pathname === link.href || pathname.startsWith(`${link.href}/`)
                : false

              const linkStyle: React.CSSProperties = {
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                position: 'relative',
                paddingBottom: '2px',
                borderBottom: isActive
                  ? '1px solid var(--color-accent-primary)'
                  : '1px solid transparent',
              }

              if (link.isPage) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="nav-hover"
                    style={linkStyle}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                )
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="nav-hover"
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href) }}
                  style={linkStyle}
                >
                  {link.label}
                </a>
              )
            })}
          </div>

          {/* CTA (una sola instancia para evitar duplicados por breakpoints) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user ? (
              <button
                onClick={() => {
                  if (appUser?.role === 'admin_org') router.push('/admin')
                  else if (appUser?.role === 'superadmin') router.push('/superadmin')
                  else router.push('/tools')
                }}
                className="btn-ember"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
              >
                Dashboard <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="btn-ember"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
              >
                Ingresar <ArrowRight size={15} />
              </button>
            )}
          </div>
        </nav>
      </div>

      <style>{`
        .nav-hover:hover { color: var(--color-text-primary) !important; }
      `}</style>
    </>
  )
}
