import { redirect } from 'next/navigation'
import { isDemoEnabled } from '@/lib/security/demo'

/**
 * Pretty entry point — delegates to /api/demo/admin_org which sets the cookie.
 * With demo mode disabled (production without NEXT_PUBLIC_DEMO_ENABLED=true)
 * it sends visitors home, like the /demo-* rewrites in the proxy, instead of
 * landing on the API's bare 404.
 */
export default function DemoAdminEntry() {
  redirect(isDemoEnabled() ? '/api/demo/admin_org' : '/')
}
