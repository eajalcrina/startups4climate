import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createSupabaseServer } from '@/lib/supabase-server'
import { escapeHtml, sanitizeSubject } from '@/lib/security/html'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://startups4climate.org'
const MAX_REVIEW_NOTE_LENGTH = 2000

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString('es-419', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

function approvalHtml(cohortName: string, startDate: string | null, endDate: string | null): string {
  const safeCohort = escapeHtml(cohortName)
  const dateLine =
    startDate || endDate
      ? `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;">Fechas del programa: ${escapeHtml(
          [startDate, endDate].filter(Boolean).join(' - ')
        )}.</p>`
      : ''
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;color:#0F172A;margin:0 0 16px;">¡Tu solicitud fue aprobada!</h1>
  <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;">Te damos la bienvenida a <strong>${safeCohort}</strong>. Ya formas parte de la cohorte y puedes acceder a todas las herramientas de la plataforma.</p>
  ${dateLine}
  <p style="margin:24px 0;">
    <a href="${SITE_URL}/tools" style="display:inline-block;background:#DA4E24;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ir a la plataforma</a>
  </p>
  <p style="margin:0;color:#64748B;font-size:12px;line-height:1.5;">Si tienes dudas, escríbenos a hello@redesignlab.org.</p>
</div>`.trim()
}

function rejectionHtml(cohortName: string, reviewNote: string | null): string {
  const safeCohort = escapeHtml(cohortName)
  const noteBlock = reviewNote
    ? `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;"><strong>Nota del equipo:</strong> ${escapeHtml(reviewNote)}</p>`
    : ''
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;color:#0F172A;margin:0 0 16px;">Sobre tu solicitud</h1>
  <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;">Gracias por postular a <strong>${safeCohort}</strong>. En esta ocasión tu solicitud no avanzó al siguiente paso.</p>
  ${noteBlock}
  <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;">Sigues teniendo acceso a Startups4Climate para trabajar en tu startup y postular a otras cohortes abiertas.</p>
  <p style="margin:24px 0;">
    <a href="${SITE_URL}/tools" style="display:inline-block;background:#DA4E24;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Explorar cohortes</a>
  </p>
  <p style="margin:0;color:#64748B;font-size:12px;line-height:1.5;">Si tienes dudas, escríbenos a hello@redesignlab.org.</p>
</div>`.trim()
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'admin_org' && profile.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Sin permisos para revisar solicitudes' }, { status: 403 })
  }

  const body = await request.json()
  const status = body?.status
  const reviewNoteRaw =
    typeof body?.review_note === 'string' ? body.review_note.trim().slice(0, MAX_REVIEW_NOTE_LENGTH) : ''
  const reviewNote = reviewNoteRaw.length > 0 ? reviewNoteRaw : null

  if (!status || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ error: 'Status debe ser "approved" o "rejected"' }, { status: 400 })
  }

  // Get the request, with cohort + founder context for emails + authorization
  const { data: cohortRequest } = await supabase
    .from('cohort_requests')
    .select('*, cohorts(id, name, org_id, start_date, end_date)')
    .eq('id', id)
    .maybeSingle()

  if (!cohortRequest) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  if (cohortRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Esta solicitud ya fue revisada' }, { status: 400 })
  }

  const cohort = cohortRequest.cohorts as {
    id: string
    name: string
    org_id: string
    start_date: string | null
    end_date: string | null
  } | null

  // If admin_org, verify they own the cohort's org
  if (profile.role === 'admin_org') {
    if (!cohort || cohort.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'No tienes permisos sobre esta cohorte' }, { status: 403 })
    }
  }

  // Service role client — used for cross-user profile updates (RLS would block)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceClient =
    supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null

  // If approved: add startup to cohort, then set founder's profile.org_id if null
  if (status === 'approved') {
    if (!cohortRequest.startup_id) {
      console.error('[S4C Admin] approve failed: solicitud sin startup_id', id)
      return NextResponse.json({ error: 'Esta solicitud no tiene una startup asociada y no puede aprobarse.' }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('cohort_startups')
      .insert({
        cohort_id: cohortRequest.cohort_id,
        startup_id: cohortRequest.startup_id,
      })

    if (insertError) {
      console.error('[S4C Admin] Error adding startup to cohort:', insertError)
      return NextResponse.json({ error: 'Error al agregar startup a la cohorte' }, { status: 500 })
    }

    // Backfill founder's org_id if missing — do not overwrite
    if (serviceClient && cohort?.org_id) {
      const { data: founderProfile } = await serviceClient
        .from('profiles')
        .select('id, org_id')
        .eq('id', cohortRequest.founder_id)
        .maybeSingle()

      if (founderProfile && !founderProfile.org_id) {
        const { error: updateOrgError } = await serviceClient
          .from('profiles')
          .update({ org_id: cohort.org_id })
          .eq('id', cohortRequest.founder_id)

        if (updateOrgError) {
          console.error('[S4C Admin] profile org backfill failed:', updateOrgError)
        }
      }
    } else if (!serviceClient) {
      console.error('[S4C Admin] service role client unavailable — skipping org_id backfill')
    }
  }

  // Update request status
  const { data: updated, error: updateError } = await supabase
    .from('cohort_requests')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (updateError || !updated) {
    console.error('[S4C Admin] Error updating request:', updateError)
    return NextResponse.json({ error: 'Error al actualizar la solicitud' }, { status: 500 })
  }

  // Send notification email — fail-soft
  try {
    if (!resend) {
      console.error('[S4C Admin] approval email failed: RESEND_API_KEY not configured')
    } else if (!serviceClient) {
      console.error('[S4C Admin] approval email failed: service role client unavailable')
    } else {
      // Look up founder email via service role (auth.users is not queryable via anon client)
      const { data: founderProfile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', cohortRequest.founder_id)
        .maybeSingle()

      const founderEmail = founderProfile?.email
      const cohortName = cohort?.name || 'la cohorte'

      if (founderEmail) {
        if (status === 'approved') {
          await resend.emails.send({
            from: 'Startups4Climate <noreply@startups4climate.org>',
            to: founderEmail,
            subject: sanitizeSubject(`¡Tu solicitud fue aprobada! Bienvenido a ${cohortName}`),
            html: approvalHtml(cohortName, formatDate(cohort?.start_date), formatDate(cohort?.end_date)),
          })
        } else {
          await resend.emails.send({
            from: 'Startups4Climate <noreply@startups4climate.org>',
            to: founderEmail,
            subject: sanitizeSubject(`Sobre tu solicitud para ${cohortName}`),
            html: rejectionHtml(cohortName, reviewNote),
          })
        }
      } else {
        console.error('[S4C Admin] approval email failed: founder email not found', cohortRequest.founder_id)
      }
    }
  } catch (err) {
    console.error('[S4C Admin] approval email failed:', err)
  }

  return NextResponse.json({ success: true, request: updated })
}
