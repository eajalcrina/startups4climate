import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { escapeHtml, isValidEmail, sanitizeSubject } from '@/lib/security/html'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://startups4climate.org'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin_org' || !profile.org_id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; cohort_id?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const cohort_id = typeof body.cohort_id === 'string' && body.cohort_id ? body.cohort_id : null

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  // The cohort (if any) must belong to the admin's own organization
  if (cohort_id) {
    const { data: cohort } = await supabase
      .from('cohorts')
      .select('id')
      .eq('id', cohort_id)
      .eq('org_id', profile.org_id)
      .maybeSingle()
    if (!cohort) {
      return NextResponse.json({ error: 'Cohorte no encontrada' }, { status: 404 })
    }
  }

  // Check if invitation already exists
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('org_id', profile.org_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ya existe una invitación pendiente para este email' }, { status: 409 })
  }

  // Create invitation
  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({
      org_id: profile.org_id,
      cohort_id,
      email: email.toLowerCase(),
      invited_by: user.id,
    })
    .select('id, token')
    .maybeSingle()

  if (insertError || !invitation) {
    return NextResponse.json({ error: 'Error al crear la invitación' }, { status: 500 })
  }

  // Get org name for the email
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .maybeSingle()

  const inviteUrl = `${SITE_URL}/invite/${invitation.token}`
  const orgName = org?.name || 'una organización'

  // Send email via Resend (best-effort — if it fails the UI shows the link so
  // the admin can share it manually until Resend is wired up).
  let emailSent = false
  try {
    if (!resend) throw new Error('RESEND_API_KEY not configured')
    const inviterName = profile.full_name || 'Tu organización'
    const { error: sendError } = await resend.emails.send({
      from: 'Startups4Climate <noreply@startups4climate.org>',
      to: [email.toLowerCase()],
      subject: sanitizeSubject(`${inviterName} te invita a ${orgName} en Startups4Climate`),
      html: `
        <div style="font-family: 'Mluvka', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #191919; margin: 0 0 8px;">
              Startups4Climate
            </h1>
          </div>

          <p style="font-size: 16px; color: #191919; margin: 0 0 16px;">
            <strong>${escapeHtml(inviterName)}</strong> te ha invitado a unirte a
            <strong>${escapeHtml(orgName)}</strong> en Startups4Climate.
          </p>

          <p style="font-size: 14px; color: #6B7280; margin: 0 0 24px;">
            Startups4Climate es una plataforma con +30 herramientas interactivas, mentores AI
            y recursos para llevar tu startup de impacto al siguiente nivel.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${escapeHtml(inviteUrl)}" style="
              display: inline-block; padding: 14px 32px;
              background: #DA4E24; color: #fff; font-size: 15px;
              font-weight: 600; text-decoration: none; border-radius: 8px;
            ">
              Aceptar invitación
            </a>
          </div>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 32px;">
            Esta invitación expira en 7 días.<br/>
            Si no esperabas esta invitación, puedes ignorar este email.
          </p>
        </div>
      `,
    })
    if (sendError) throw new Error(sendError.message)
    emailSent = true
  } catch (err) {
    console.error('[S4C Admin] invitation email send failed:', err)
  }

  return NextResponse.json({
    success: true,
    invitation_id: invitation.id,
    invite_url: inviteUrl,
    email_sent: emailSent,
  })
}

export async function GET() {
  const supabase = await createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin_org' || !profile.org_id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, org_id, cohort_id, email, status, invitation_type, invited_by, expires_at, accepted_at, created_at')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ invitations: invitations || [] })
}
