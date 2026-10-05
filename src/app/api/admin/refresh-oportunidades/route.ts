/**
 * POST /api/admin/refresh-oportunidades
 * Manually triggered version of the opportunities cron.
 * Calls the AI model to generate/refresh curated opportunities and seeds
 * Supabase with the service-role key. The result is global (shared by every
 * organization), so only superadmin can trigger it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import {
  OPPORTUNITY_PROMPT_GUARD,
  upsertOpportunities,
  validateOpportunities,
  type OpportunityValidationStats,
} from '@/lib/opportunities-validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function sanitizeJsonString(raw: string): string {
  return raw
    .replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')
}

export async function POST(_request: NextRequest) {
  // Auth: superadmin only (global write with the service-role key)
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'superadmin') {
    console.error('[S4C Admin] refresh-oportunidades denied for non-superadmin:', user.id, profile?.role ?? 'sin perfil')
    return NextResponse.json({ error: 'Solo superadmin puede actualizar oportunidades' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const apiKey = process.env.GEMINI_API_KEY
  if (!supabaseUrl || !serviceKey || !apiKey) {
    console.error('[S4C Admin] refresh-oportunidades: server env missing')
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const adminDb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const results: {
    inserted: number
    updated: number
    errors: string[]
    validation?: OpportunityValidationStats
  } = { inserted: 0, updated: 0, errors: [] }

  const prompt = `Eres un investigador de oportunidades de financiamiento para startups de impacto en América Latina.
Genera hasta 10 oportunidades REALES y VIGENTES para founders de startups de clima, agritech, fintech, healthtech y emprendimiento de impacto en LATAM.

Idealmente incluye: grants, aceleradoras, fondos de inversión, competencias y fellowships.

Responde SOLO con un array JSON válido. Sin texto antes ni después.

Cada objeto debe tener exactamente estas propiedades:
{
  "title": "nombre de la oportunidad en español",
  "organization": "nombre real de la organización",
  "description": "50-80 palabras en español, concreto y directo. Incluye montos, países elegibles y tipo de startup.",
  "type": "grant|accelerator|competition|fund|fellowship",
  "amount_min": número o null,
  "amount_max": número o null,
  "currency": "USD",
  "eligible_countries": ["PE","CL","CO","MX","AR","BR"],
  "eligible_verticals": ["cleantech_climatech","agritech_foodtech","fintech","healthtech","other"],
  "eligible_stages": ["idea","pre_seed","seed","series_a","growth"],
  "application_url": "URL https de la página de convocatoria o aplicación del programa (no solo la homepage). Ejemplos reales: 'https://www.startupchile.org/programs/', 'https://bidlab.org/calls', 'https://www.proinnovate.gob.pe/convocatorias', 'https://www.techstars.com/accelerators'. Si no conoces la URL exacta del programa, usa la homepage de la organización.",
  "is_rolling": true o false,
  "deadline": "YYYY-MM-DD" (fecha futura) o null
}

Organizaciones válidas: BID Lab, CORFO, Start-Up Chile, Innpulsa, Wayra, Seedstars, 500 Global, Endeavor, Proinnovate, CONCYTEC, CAF, FONTAGRO, GIZ, Green Climate Fund, ClimateLaunchpad, ClimateWorks, Village Capital, Techstars, Y Combinator, AWS Activate, Google for Startups, Acumen, Microsoft for Startups.
Montos realistas. NO repitas organizaciones. Genera como máximo 10 objetos.

${OPPORTUNITY_PROMPT_GUARD}`

  try {
    const aiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 6000,
        }),
        // Leaves ~15s of the 60s budget for URL validation + DB writes.
        signal: AbortSignal.timeout(40000),
      }
    )

    if (!aiRes.ok) {
      results.errors.push(`Gemini HTTP ${aiRes.status}`)
      return NextResponse.json(results, { status: 502 })
    }

    const rawJson = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = (rawJson.choices?.[0]?.message?.content ?? '')
      .replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const jsonMatch = /\[[\s\S]*\]/.exec(content)
    if (!jsonMatch) {
      results.errors.push('No valid JSON array from Gemini')
      return NextResponse.json(results, { status: 502 })
    }

    const items: unknown = JSON.parse(sanitizeJsonString(jsonMatch[0]))

    // Drop anything we cannot verify (non-https / unreachable URL, past
    // deadline) before it reaches the table.
    const { valid, stats } = await validateOpportunities(items, 'grant')
    results.validation = stats
    if (stats.kept < stats.received) {
      console.error(
        `[S4C Admin] refresh-oportunidades dropped ${stats.received - stats.kept}/${stats.received} items:`,
        JSON.stringify(stats)
      )
    }

    const written = await upsertOpportunities(adminDb, valid)
    results.inserted = written.inserted
    results.updated = written.updated
    results.errors.push(...written.errors)

    // Deactivate expired deadlines
    await adminDb.from('opportunities')
      .update({ is_active: false })
      .lt('deadline', new Date().toISOString())
      .eq('is_rolling', false)
      .eq('is_active', true)

  } catch (err) {
    results.errors.push(`Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  console.log('[S4C Admin] refresh-oportunidades:', JSON.stringify(results))
  return NextResponse.json(results)
}
