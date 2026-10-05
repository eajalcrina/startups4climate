import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const statusParam = request.nextUrl.searchParams.get('status')
  const validStatuses = ['pending', 'approved', 'rejected']
  const statusFilter = statusParam && validStatuses.includes(statusParam) ? statusParam : null

  if (profile.role === 'superadmin') {
    // Superadmin: list all requests
    let query = supabase
      .from('cohort_requests')
      .select('*, cohorts(id, name, org_id, start_date, end_date), startups(id, name), profiles:founder_id(id, full_name, email)')
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)

    const { data: requests, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  }

  if (profile.role === 'admin_org' && profile.org_id) {
    // Admin org: list requests for cohorts in their org
    const { data: cohorts } = await supabase
      .from('cohorts')
      .select('id')
      .eq('org_id', profile.org_id)

    const cohortIds = (cohorts || []).map((c) => c.id)

    if (cohortIds.length === 0) {
      return NextResponse.json({ requests: [] })
    }

    let query = supabase
      .from('cohort_requests')
      .select('*, cohorts(id, name, start_date, end_date), startups(id, name), profiles:founder_id(id, full_name, email)')
      .in('cohort_id', cohortIds)
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)

    const { data: requests, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  }

  // Founder: list own requests
  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('founder_id', user.id)
    .maybeSingle()

  if (!startup) {
    return NextResponse.json({ requests: [] })
  }

  let founderQuery = supabase
    .from('cohort_requests')
    .select('*, cohorts(id, name)')
    .eq('startup_id', startup.id)
    .order('created_at', { ascending: false })

  if (statusFilter) founderQuery = founderQuery.eq('status', statusFilter)

  const { data: requests, error } = await founderQuery

  if (error) {
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 })
  }

  return NextResponse.json({ requests: requests || [] })
  } catch (err) {
    console.error('[S4C Admin] cohort-requests GET error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
  const supabase = await createSupabaseServer()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { cohort_id, message } = body

  if (!cohort_id || typeof cohort_id !== 'string') {
    return NextResponse.json({ error: 'cohort_id requerido' }, { status: 400 })
  }

  // Verify cohort exists and is open
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, name, access_mode')
    .eq('id', cohort_id)
    .maybeSingle()

  if (!cohort) {
    return NextResponse.json({ error: 'Cohorte no encontrada' }, { status: 404 })
  }

  if (cohort.access_mode !== 'open') {
    return NextResponse.json({ error: 'Esta cohorte no acepta solicitudes abiertas' }, { status: 403 })
  }

  // Get founder's startup
  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('founder_id', user.id)
    .maybeSingle()

  if (!startup) {
    return NextResponse.json({ error: 'No se encontró tu startup. Debes registrar una startup primero.' }, { status: 404 })
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('cohort_requests')
    .select('id')
    .eq('cohort_id', cohort_id)
    .eq('startup_id', startup.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ya tienes una solicitud pendiente para esta cohorte' }, { status: 409 })
  }

  // Create request
  const { data: cohortRequest, error: insertError } = await supabase
    .from('cohort_requests')
    .insert({
      cohort_id,
      startup_id: startup.id,
      founder_id: user.id,
      message: typeof message === 'string' && message.trim() ? message.trim().slice(0, 2000) : null,
      status: 'pending',
    })
    .select()
    .maybeSingle()

  if (insertError || !cohortRequest) {
    console.error('[S4C Admin] cohort-requests insert error:', insertError)
    return NextResponse.json({ error: 'Error al crear la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ success: true, request: cohortRequest })
  } catch (err) {
    console.error('[S4C Admin] cohort-requests POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
