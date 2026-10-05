import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createSupabaseServer } from '@/lib/supabase-server'
import { escapeHtml, isValidEmail, sanitizeSubject, toSingleLine } from '@/lib/security/html'
import { checkIpRateLimit, getClientIp } from '@/lib/security/ip-rate-limit'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Abuse limits for this (partly anonymous) endpoint.
const IP_LIMIT = 5
const IP_WINDOW_SECONDS = 60 * 60 // 5 envíos por hora por IP
const RECIPIENT_LIMIT = 3
const RECIPIENT_WINDOW_SECONDS = 24 * 60 * 60 // 3 envíos por día por destinatario

const MAX_LIST_ITEMS = 10
const MAX_ITEM_LENGTH = 300
const MAX_DIMENSIONS = 10
// DiagnosticForm sums 6 dimension scores; the real total stays well under 100.
const MIN_SCORE = 0
const MAX_SCORE = 100

type Payload = {
  email: string
  nombre: string
  startup_name: string
  total_score: number
  perfil_nombre: string
  perfil_etapa: number
  dimension_scores: Array<[string, number]>
  recommended_tools: string[]
  roadmap: string[]
  inconsistencias: string[]
}

type ParseResult = { ok: true; payload: Payload } | { ok: false; error: string }

function isScore(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= MIN_SCORE && v <= MAX_SCORE
}

/** '' when absent, null when present but not a string (invalid). */
function optionalString(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') return null
  return toSingleLine(v, max)
}

/** [] when absent, null when invalid or longer than MAX_LIST_ITEMS. */
function stringList(v: unknown): string[] | null {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v) || v.length > MAX_LIST_ITEMS) return null
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string') return null
    const clean = toSingleLine(item, MAX_ITEM_LENGTH)
    if (clean) out.push(clean)
  }
  return out
}

function parsePayload(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Payload inválido' }
  }
  const b = raw as Record<string, unknown>

  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  if (!isValidEmail(email)) return { ok: false, error: 'Email inválido' }

  if (!isScore(b.total_score)) return { ok: false, error: 'Payload incompleto' }

  const perfilNombre = typeof b.perfil_nombre === 'string' ? toSingleLine(b.perfil_nombre, 100) : ''
  if (!perfilNombre) return { ok: false, error: 'Payload incompleto' }

  const etapa = typeof b.perfil_etapa === 'string' ? Number(b.perfil_etapa) : b.perfil_etapa
  if (typeof etapa !== 'number' || !Number.isInteger(etapa) || etapa < 1 || etapa > 4) {
    return { ok: false, error: 'Etapa inválida' }
  }

  const nombre = optionalString(b.nombre, 100)
  const startupName = optionalString(b.startup_name, 150)
  if (nombre === null || startupName === null) return { ok: false, error: 'Payload inválido' }

  const dims: Array<[string, number]> = []
  if (b.dimension_scores !== undefined && b.dimension_scores !== null) {
    if (typeof b.dimension_scores !== 'object' || Array.isArray(b.dimension_scores)) {
      return { ok: false, error: 'Puntajes inválidos' }
    }
    const entries = Object.entries(b.dimension_scores as Record<string, unknown>)
    if (entries.length > MAX_DIMENSIONS) return { ok: false, error: 'Puntajes inválidos' }
    for (const [k, v] of entries) {
      if (!/^[a-z_]{1,32}$/.test(k) || !isScore(v)) {
        return { ok: false, error: 'Puntajes inválidos' }
      }
      dims.push([k, v])
    }
  }

  const tools = stringList(b.recommended_tools)
  const roadmap = stringList(b.roadmap)
  const incs = stringList(b.inconsistencias)
  if (!tools || !roadmap || !incs) {
    return { ok: false, error: `Listas inválidas (máximo ${MAX_LIST_ITEMS} elementos)` }
  }

  return {
    ok: true,
    payload: {
      email,
      nombre,
      startup_name: startupName,
      total_score: b.total_score,
      perfil_nombre: perfilNombre,
      perfil_etapa: etapa,
      dimension_scores: dims,
      recommended_tools: tools,
      roadmap,
      inconsistencias: incs,
    },
  }
}

function renderEmail(p: Payload): { subject: string; html: string; text: string } {
  // All user strings were already normalized to single lines by parsePayload;
  // HTML output escapes every interpolated value.
  const firstName = p.nombre.split(' ')[0] || 'founder'
  const subject = sanitizeSubject(`Tu diagnóstico S4C — ${p.perfil_nombre} (${p.total_score} pts)`)

  const ctaUrl = `https://startups4climate.org/tools?source=email&score=${encodeURIComponent(
    String(p.total_score),
  )}&etapa=${encodeURIComponent(String(p.perfil_etapa))}`

  const dimRows = p.dimension_scores
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#6B6B6B;text-transform:capitalize">${escapeHtml(
          k.replace(/_/g, ' '),
        )}</td><td style="padding:6px 0;text-align:right;color:#191919;font-weight:600">${escapeHtml(v)}</td></tr>`,
    )
    .join('')

  const toolsHtml = p.recommended_tools
    .map(
      (t, i) =>
        `<li style="padding:6px 0;color:#191919;font-size:14px">${i + 1}. ${escapeHtml(t)}</li>`,
    )
    .join('')

  const roadmapHtml = p.roadmap
    .map(
      (r) =>
        `<li style="padding:6px 0;color:#191919;font-size:14px;line-height:1.5">${escapeHtml(r)}</li>`,
    )
    .join('')

  const incsHtml = p.inconsistencias.length
    ? `<div style="margin-top:24px;padding:16px;background:#FFF4EC;border-radius:12px;border:1px solid rgba(240,114,29,0.3)">
        <p style="margin:0 0 8px 0;color:#F0721D;font-weight:700;font-size:13px">Notas del diagnóstico</p>
        <ul style="margin:0;padding-left:18px;color:#191919;font-size:13px">
          ${p.inconsistencias.map((i) => `<li style="padding:4px 0">${escapeHtml(i)}</li>`).join('')}
        </ul>
      </div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F5F2;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E8E4DF">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#DA4E24 0%,#F0721D 100%);color:#FFFFFF">
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85">Startups4Climate · Diagnóstico</p>
          <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Hola ${escapeHtml(firstName)}, aquí están tus resultados</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <div style="padding:20px;background:#F7F5F2;border-radius:12px;text-align:center">
            <p style="margin:0 0 4px 0;color:#6B6B6B;font-size:12px;letter-spacing:0.06em;text-transform:uppercase">Tu perfil</p>
            <p style="margin:0;color:#191919;font-size:20px;font-weight:700;letter-spacing:-0.02em">${escapeHtml(p.perfil_nombre)}</p>
            <p style="margin:4px 0 0 0;color:#DA4E24;font-size:14px;font-weight:600">Etapa ${escapeHtml(p.perfil_etapa)} · ${escapeHtml(p.total_score)} pts</p>
          </div>

          ${
            p.startup_name
              ? `<p style="margin:20px 0 0 0;color:#6B6B6B;font-size:13px">Startup analizada: <strong style="color:#191919">${escapeHtml(p.startup_name)}</strong></p>`
              : ''
          }

          ${
            dimRows
              ? `<h3 style="margin:24px 0 8px 0;color:#191919;font-size:14px;font-weight:700;letter-spacing:-0.02em">Score por dimensión</h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E8E4DF">${dimRows}</table>`
              : ''
          }

          ${
            toolsHtml
              ? `<h3 style="margin:24px 0 8px 0;color:#191919;font-size:14px;font-weight:700;letter-spacing:-0.02em">Herramientas recomendadas</h3>
                <ol style="margin:0;padding-left:0;list-style:none">${toolsHtml}</ol>`
              : ''
          }

          ${
            roadmapHtml
              ? `<h3 style="margin:24px 0 8px 0;color:#191919;font-size:14px;font-weight:700;letter-spacing:-0.02em">Tu roadmap a 30 días</h3>
                <ol style="margin:0;padding-left:18px">${roadmapHtml}</ol>`
              : ''
          }

          ${incsHtml}

          <div style="margin-top:32px;text-align:center">
            <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;background:#DA4E24;color:#FFFFFF;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px">Acceder a la plataforma →</a>
          </div>

          <p style="margin:32px 0 0 0;color:#6B6B6B;font-size:12px;line-height:1.5">Guardamos tu diagnóstico. Si creas tu cuenta con este email, podrás ver tu evolución en el tiempo y continuar con las herramientas recomendadas.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#F7F5F2;border-top:1px solid #E8E4DF;color:#6B6B6B;font-size:11px;text-align:center">
          Startups4Climate · Redesign Lab · <a href="mailto:hello@redesignlab.org" style="color:#DA4E24;text-decoration:none">hello@redesignlab.org</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  // Plain-text version: values are single-line (no injected lines) and capped.
  const text = `Hola ${firstName},

Tu diagnóstico S4C:
- Perfil: ${p.perfil_nombre}
- Etapa: ${p.perfil_etapa}
- Score total: ${p.total_score} pts
${p.startup_name ? `- Startup: ${p.startup_name}\n` : ''}
${p.recommended_tools.length ? `Herramientas recomendadas:\n${p.recommended_tools.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}\n` : ''}
${p.roadmap.length ? `Roadmap a 30 días:\n${p.roadmap.map((r) => `  • ${r}`).join('\n')}\n` : ''}
Accede a la plataforma: ${ctaUrl}

— Startups4Climate
`

  return { subject, html, text }
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => null)
    const parsed = parsePayload(raw)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const body = parsed.payload

    // With a session, the caller can only email their own account address.
    // Anonymous callers (landing diagnostic) are allowed but rate-limited.
    try {
      const supabase = await createSupabaseServer()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user && (user.email || '').toLowerCase() !== body.email) {
        return NextResponse.json(
          { error: 'Solo puedes enviar los resultados al email de tu cuenta.' },
          { status: 403 },
        )
      }
    } catch (authErr) {
      // Treat as anonymous: rate limits below still apply.
      console.error('[S4C AI] email-results auth probe failed:', authErr)
    }

    const ip = getClientIp(req)
    const ipAllowed = await checkIpRateLimit(`email-ip:${ip}`, IP_LIMIT, IP_WINDOW_SECONDS)
    if (!ipAllowed) {
      return NextResponse.json(
        { error: 'Demasiados envíos desde tu red. Intenta de nuevo en una hora.' },
        { status: 429, headers: { 'Retry-After': String(IP_WINDOW_SECONDS) } },
      )
    }

    const recipientAllowed = await checkIpRateLimit(
      `email:${body.email}`,
      RECIPIENT_LIMIT,
      RECIPIENT_WINDOW_SECONDS,
    )
    if (!recipientAllowed) {
      return NextResponse.json(
        {
          error:
            'Ya enviamos tus resultados varias veces hoy. Revisa tu bandeja (y spam) o intenta mañana.',
        },
        { status: 429, headers: { 'Retry-After': String(RECIPIENT_WINDOW_SECONDS) } },
      )
    }

    if (!resend) {
      console.error('[S4C AI] RESEND_API_KEY missing — cannot send diagnostic email')
      return NextResponse.json({ error: 'Email no configurado' }, { status: 500 })
    }

    const { subject, html, text } = renderEmail(body)

    const { data, error } = await resend.emails.send({
      from: 'Startups4Climate <noreply@startups4climate.org>',
      to: [body.email],
      replyTo: 'hello@redesignlab.org',
      subject,
      html,
      text,
    })

    if (error) {
      console.error('[S4C AI] resend email error:', error)
      return NextResponse.json({ error: 'No pudimos enviar el email' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null })
  } catch (err) {
    console.error('[S4C AI] email-results route threw:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
