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

  // Require superadmin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede invitar administradores de organización' }, { status: 403 })
  }

  const body = await request.json()
  const { email, org_id } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }
  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  if (!org_id || typeof org_id !== 'string') {
    return NextResponse.json({ error: 'org_id requerido' }, { status: 400 })
  }

  // Verify org exists
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', org_id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }

  // Check if invitation already exists
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('org_id', org_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ya existe una invitación pendiente para este email' }, { status: 409 })
  }

  // Generate token and expiration
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Create invitation with invitation_type='admin_org'
  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({
      org_id,
      email: email.toLowerCase().trim(),
      invited_by: user.id,
      token,
      expires_at: expiresAt,
      invitation_type: 'admin_org',
    })
    .select('id, token')
    .maybeSingle()

  if (insertError || !invitation) {
    console.error('[S4C Admin] invitations insert error:', insertError)
    return NextResponse.json({ error: 'Error al crear la invitación' }, { status: 500 })
  }

  const inviteUrl = `${SITE_URL}/invite/${invitation.token}`
  const orgName = org.name || 'una organización'

  // Send email via Resend
  try {
    if (!resend) throw new Error('RESEND_API_KEY not configured')
    const { error: sendError } = await resend.emails.send({
      from: 'Startups4Climate <noreply@startups4climate.org>',
      to: [email.toLowerCase().trim()],
      subject: sanitizeSubject(`Has sido invitado como administrador de ${orgName} en Startups4Climate`),
      html: `
        <div style="font-family: 'Mluvka', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #191919; margin: 0 0 8px;">
              Startups4Climate
            </h1>
          </div>

          <p style="font-size: 16px; color: #191919; margin: 0 0 16px;">
            Has sido invitado como <strong>administrador</strong> de
            <strong>${escapeHtml(orgName)}</strong> en Startups4Climate.
          </p>

          <p style="font-size: 14px; color: #6B7280; margin: 0 0 24px;">
            Como administrador podrás gestionar cohortes, invitar founders y
            ver reportes de tu organización en la plataforma.
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
  } catch (err) {
    // Email failed but invitation was created — log but don't fail
    console.error('[S4C Admin] failed to send org-admin invitation email:', err)
  }

  return NextResponse.json({ success: true, invitation })
}
