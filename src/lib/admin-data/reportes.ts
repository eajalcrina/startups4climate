/**
 * Loader for /admin/reportes: cohort options + demo report history.
 */
import { supabase } from '@/lib/supabase'
import { DEMO_COHORTS } from '@/lib/demo/admin-fixtures'

export interface CohortOption {
  id: string
  name: string
}

/** Re-export demo report history for display in demo mode */
export { DEMO_ADMIN_REPORTS as DEMO_REPORT_HISTORY } from '@/lib/demo/admin-fixtures'

interface LoadArgs {
  isDemo: boolean
  orgId: string | null | undefined
}

export async function loadReportCohorts({ isDemo, orgId }: LoadArgs): Promise<CohortOption[]> {
  if (isDemo) return DEMO_COHORTS.map((c) => ({ id: c.id, name: c.name }))

  if (!orgId) return []

  const { data, error } = await supabase
    .from('cohorts')
    .select('id, name')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

