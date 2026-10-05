'use client'

/**
 * DemoLinkRewriter
 *
 * When the browser URL is under a /demo-* path (e.g. /demo-tools/passport),
 * this component intercepts all internal link clicks and rewrites navigation
 * from the "real" prefix (/tools/*) to the "demo" prefix (/demo-tools/*).
 *
 * This keeps the shareable demo URL stable throughout the entire session —
 * the visitor never sees /tools, /admin, or /superadmin in the address bar.
 *
 * Works by attaching a capture-phase click listener on the document so it
 * fires before Next.js <Link> handlers. e.preventDefault() + router.push()
 * reroutes the navigation to the correct demo URL.
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isDemoEnabled } from '@/lib/security/demo'

const DEMO_MAP = [
  { real: '/tools',      demo: '/demo-tools'      },
  { real: '/admin',      demo: '/demo-admin'       },
  { real: '/superadmin', demo: '/demo-superadmin'  },
] as const

export default function DemoLinkRewriter() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Demo disabled (production without NEXT_PUBLIC_DEMO_ENABLED=true): the
    // proxy already redirects /demo-* to /, so there is nothing to rewrite.
    if (!isDemoEnabled()) return
    // Use window.location.pathname as ground truth — it always reflects the
    // actual browser URL even after middleware rewrites.
    const browserPath = window.location.pathname
    const match = DEMO_MAP.find(({ demo }) => browserPath.startsWith(demo))
    if (!match) return

    const { real, demo } = match

    const handleClick = (e: MouseEvent) => {
      // Walk up from the clicked element to find an <a> tag
      let target = e.target as HTMLElement | null
      while (target && target.tagName !== 'A') {
        target = target.parentElement
      }
      if (!target) return

      const href = (target as HTMLAnchorElement).getAttribute('href')
      if (!href) return

      // Only rewrite internal links that start with the real prefix
      if (href === real || href.startsWith(real + '/')) {
        e.preventDefault()
        e.stopPropagation()
        const newPath = demo + href.slice(real.length)
        router.push(newPath)
      }
    }

    // Capture phase: fires before any <Link> onClick handler
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, router]) // re-run on every navigation to re-sync with browser URL

  return null
}
