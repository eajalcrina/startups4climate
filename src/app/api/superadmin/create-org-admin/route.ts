/**
 * POST /api/superadmin/create-org-admin
 * Atomic org + admin user creation with optional logo upload.
 * Accepts multipart/form-data (for logo) or JSON.
 * Requires superadmin role.  Uses SUPABASE_SERVICE_ROLE_KEY.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    /* ── Auth guard: must be superadmin ── */
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    /* ── Validate env ── */
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor.' },
        { status: 500 },
      )
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    /* ── Parse body (FormData or JSON) ── */
    const contentType = request.headers.get('content-type') || ''
    let orgName: string, orgType: string, country: string, plan: string
    let maxStartups: number, billingEmail: string, website: string
    let contractEnd: string | null, adminFullName: string, adminEmail: string
    let adminPassword: string, logoFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData()
      orgName = fd.get('orgName') as string || ''
      orgType = fd.get('orgType') as string || 'university'
      country = fd.get('country') as string || ''
      plan = fd.get('plan') as string || 'starter'
      maxStartups = parseInt(fd.get('maxStartups') as string) || 25
      billingEmail = fd.get('billingEmail') as string || ''
      website = fd.get('website') as string || ''
      contractEnd = fd.get('contractEnd') as string || null
      adminFullName = fd.get('adminFullName') as string || ''
      adminEmail = fd.get('adminEmail') as string || ''
      adminPassword = fd.get('adminPassword') as string || ''
      const file = fd.get('logo')
      if (file instanceof File && file.size > 0) logoFile = file
    } else {
      const body = await request.json()
      orgName = body.orgName || ''
      orgType = body.orgType || 'university'
      country = body.country || ''
      plan = body.plan || 'starter'
      maxStartups = body.maxStartups || 25
      billingEmail = body.billingEmail || ''
      website = body.website || ''
      contractEnd = body.contractEnd || null
      adminFullName = body.adminFullName || ''
      adminEmail = body.adminEmail || ''
      adminPassword = body.adminPassword || ''
    }

    /* ── Validate ── */
    if (!orgName.trim()) {
      return NextResponse.json({ error: 'El nombre de la organización es requerido.' }, { status: 400 })
    }
    if (!adminEmail.trim() || !adminPassword) {
      return NextResponse.json({ error: 'Email y contraseña del admin son requeridos.' }, { status: 400 })
    }
    if (adminPassword.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 })
    }

    /* ── 1. Create organization ── */
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: orgName.trim(),
        type: orgType || 'university',
        country: country.trim() || null,
        plan: plan || 'starter',
        max_startups: maxStartups || 25,
        billing_email: billingEmail.trim() || null,
        website: website.trim() || null,
        contract_end: contractEnd || null,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (orgError || !org) {
      console.error('[S4C Superadmin] Error creating org:', orgError)
      return NextResponse.json(
        { error: `Error al crear la organización: ${orgError?.message || 'desconocido'}` },
        { status: 500 },
      )
    }

    /* ── 2. Upload logo (if provided) ── */
    // Only the image types the UI offers (no HTML or arbitrary files) into the
    // public bucket, max 2 MB; the extension comes from the validated MIME
    // type, not the client filename.
    let logoUrl: string | null = null
    const LOGO_TYPES: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }
    if (logoFile && (!LOGO_TYPES[logoFile.type] || logoFile.size > 2 * 1024 * 1024)) {
      console.error('[S4C Admin] Logo rejected (type/size):', logoFile.type, logoFile.size)
      logoFile = null
    }
    if (logoFile) {
      const ext = LOGO_TYPES[logoFile.type]
      const storagePath = `org-logos/${org.id}/logo.${ext}`
      const buffer = Buffer.from(await logoFile.arrayBuffer())

      const { error: uploadError } = await adminClient.storage
        .from('logos')
        .upload(storagePath, buffer, {
          contentType: logoFile.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('[S4C Superadmin] Logo upload error:', uploadError)
        // Non-fatal: continue without logo
      } else {
        logoUrl = `${supabaseUrl}/storage/v1/object/public/logos/${storagePath}`
        await adminClient
          .from('organizations')
          .update({ logo_url: logoUrl })
          .eq('id', org.id)
      }
    }

    /* ── 3. Create auth user ── */
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: adminEmail.trim(),
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName.trim() || orgName.trim(),
        role: 'admin_org',
        org_id: org.id,
      },
    })

    if (authError || !authData.user) {
      // Rollback: delete the org and uploaded logo
      await adminClient.from('organizations').delete().eq('id', org.id)
      if (logoUrl) {
        await adminClient.storage.from('logos').remove([`org-logos/${org.id}/logo.${(logoFile && LOGO_TYPES[logoFile.type]) || 'png'}`])
      }
      console.error('[S4C Superadmin] Error creating auth user:', authError)
      return NextResponse.json(
        { error: `Error al crear el usuario: ${authError?.message || 'desconocido'}` },
        { status: 500 },
      )
    }

    /* ── 4. Upsert profile (trigger may have created it) ── */
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: adminEmail.trim(),
        full_name: adminFullName.trim() || orgName.trim(),
        role: 'admin_org',
        org_id: org.id,
      })

    if (profileError) {
      console.error('[S4C Superadmin] Error upserting profile:', profileError)
    }

    return NextResponse.json({
      success: true,
      organization: { id: org.id, name: org.name, logo_url: logoUrl },
      user: { id: authData.user.id, email: authData.user.email },
    })
  } catch (err) {
    console.error('[S4C Superadmin] Unexpected error in create-org-admin:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
