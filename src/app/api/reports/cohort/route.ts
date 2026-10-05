import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import ExcelJS from 'exceljs'

const STAGE_LABELS: Record<string, string> = {
  pre_incubation: 'Pre-incubación',
  incubation: 'Incubación',
  acceleration: 'Aceleración',
  scaling: 'Escalamiento',
}

const VERTICAL_LABELS: Record<string, string> = {
  fintech: 'Fintech',
  healthtech: 'Healthtech',
  edtech: 'Edtech',
  agritech_foodtech: 'Agritech/Foodtech',
  cleantech_climatech: 'Cleantech/Climatech',
  biotech_deeptech: 'Biotech/Deeptech',
  logistics_mobility: 'Logística/Movilidad',
  saas_enterprise: 'SaaS/Enterprise',
  social_impact: 'Impacto social',
  other: 'Otro',
}

export async function POST(request: NextRequest) {
  try {
  const supabase = await createSupabaseServer()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin_org', 'superadmin'].includes(profile.role) || !profile.org_id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { cohortId } = body

  if (!cohortId) {
    return NextResponse.json({ error: 'cohortId requerido' }, { status: 400 })
  }

  // Verify cohort belongs to org
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, name, org_id, start_date, end_date, status')
    .eq('id', cohortId)
    .eq('org_id', profile.org_id)
    .maybeSingle()

  if (!cohort) {
    return NextResponse.json({ error: 'Cohorte no encontrada' }, { status: 404 })
  }

  // Get startups in cohort
  const { data: assignments } = await supabase
    .from('cohort_startups')
    .select('startup_id, status, joined_at')
    .eq('cohort_id', cohortId)

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: 'No hay startups en esta cohorte' }, { status: 400 })
  }

  const startupIds = assignments.map((a) => a.startup_id)

  // Get startup data
  const { data: startups } = await supabase
    .from('startups')
    .select('id, name, founder_id, vertical, country, stage, diagnostic_score, tools_completed, team_size, monthly_revenue, tam_usd, has_mvp, has_paying_customers, paying_customers_count')
    .in('id', startupIds)

  // Get founder profiles
  const founderIds = startups?.map((s) => s.founder_id).filter(Boolean) || []
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', founderIds)

  // Get tool data for all founders
  const { data: toolData } = await supabase
    .from('tool_data')
    .select('user_id, tool_id, completed')
    .in('user_id', founderIds)

  const profileMap: Record<string, { full_name: string; email: string }> = {}
  profiles?.forEach((p) => { profileMap[p.id] = { full_name: p.full_name, email: p.email } })

  const toolCountMap: Record<string, number> = {}
  toolData?.forEach((t) => {
    if (t.completed) {
      toolCountMap[t.user_id] = (toolCountMap[t.user_id] || 0) + 1
    }
  })

  const assignmentMap: Record<string, { status: string; joined_at: string }> = {}
  assignments.forEach((a) => { assignmentMap[a.startup_id] = { status: a.status, joined_at: a.joined_at } })

  // Build report data
  const rows = (startups || []).map((s) => {
    const founder = profileMap[s.founder_id] || { full_name: 'Sin founder', email: '-' }
    const assignment = assignmentMap[s.id] || { status: '-', joined_at: '-' }
    return {
      'Startup': s.name,
      'Founder': founder.full_name,
      'Email': founder.email,
      'Vertical': VERTICAL_LABELS[s.vertical] || s.vertical,
      'País': s.country || '-',
      'Etapa': STAGE_LABELS[s.stage] || s.stage || '-',
      'Score diagnóstico': s.diagnostic_score ?? '-',
      'Herramientas completadas': toolCountMap[s.founder_id] || s.tools_completed || 0,
      'Equipo': s.team_size ?? '-',
      'Revenue mensual (USD)': s.monthly_revenue ?? '-',
      'TAM (USD)': s.tam_usd ?? '-',
      'Tiene MVP': s.has_mvp ? 'Sí' : 'No',
      'Clientes pagando': s.has_paying_customers ? `Sí (${s.paying_customers_count || 0})` : 'No',
      'Estado en cohorte': assignment.status,
      'Fecha ingreso': assignment.joined_at
        ? new Date(assignment.joined_at).toLocaleDateString('es-CL')
        : '-',
    }
  })

  // Create Excel workbook
  const wb = new ExcelJS.Workbook()

  // Summary sheet
  const summaryData = [
    ['Reporte de Cohorte', ''],
    ['Cohorte', cohort.name],
    ['Estado', cohort.status],
    ['Fecha inicio', cohort.start_date || '-'],
    ['Fecha fin', cohort.end_date || '-'],
    ['Total startups', rows.length.toString()],
    ['Generado el', new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })],
  ]
  const wsSummary = wb.addWorksheet('Resumen')
  wsSummary.addRows(summaryData)

  // Data sheet (header row from the row keys, like json_to_sheet)
  const wsData = wb.addWorksheet('Startups')
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]) as (keyof (typeof rows)[number])[]
    wsData.addRow(headers)
    rows.forEach((r) => wsData.addRow(headers.map((h) => r[h])))
  }

  // Convert to buffer
  const buf = await wb.xlsx.writeBuffer()

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte-${cohort.name.replace(/\s+/g, '-').toLowerCase()}.xlsx"`,
    },
  })
  } catch (err) {
    console.error('[S4C Admin] Report generation error:', err)
    return NextResponse.json({ error: 'Error interno al generar el reporte' }, { status: 500 })
  }
}
