import { redirect } from 'next/navigation'
import { isDemoEnabled } from '@/lib/security/demo'

/**
 * Pretty entry point — delegates to /api/demo/superadmin which sets the cookie.
 * With demo mode disabled (production without NEXT_PUBLIC_DEMO_ENABLED=true)
 * it sends visitors home, like the /demo-* rewrites in the proxy, instead of
 * landing on the API's bare 404.
 */
export default function DemoSuperadminEntry() {
  redirect(isDemoEnabled() ? '/api/demo/superadmin' : '/')
}
