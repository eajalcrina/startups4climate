import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// RSS feeds — climate tech, impact, LATAM + Global
type FeedDef = { url: string; source_name: string; default_type: 'news' | 'investment' | 'trend'; default_country?: string; default_vertical?: string }
const FEEDS: FeedDef[] = [
  // ── LATAM ecosystem ──
  { url: 'https://latamlist.com/feed/',           source_name: 'LatamList',          default_type: 'news' },
  { url: 'https://contxto.com/en/feed/',          source_name: 'Contxto',            default_type: 'investment' },
  { url: 'https://labsnews.com/en/feed/',         source_name: 'LABS News',          default_type: 'news' },
  { url: 'https://pulsosocial.com/feed/',         source_name: 'Pulso Social',       default_type: 'news' },
  { url: 'https://www.bloomberglinea.com/feed/',  source_name: 'Bloomberg Línea',    default_type: 'investment' },
  { url: 'https://es.mongabay.com/feed/',         source_name: 'Mongabay LATAM',     default_type: 'news' },
  { url: 'https://agfundernews.com/feed/',        source_name: 'AgFunder News',      default_type: 'trend', default_vertical: 'agritech_foodtech' },
  // ── Global — USA ──
  { url: 'https://electrek.co/feed/',             source_name: 'Electrek',           default_type: 'trend', default_country: 'US', default_vertical: 'cleantech_climatech' },
  { url: 'https://cleantechnica.com/feed/',       source_name: 'CleanTechnica',      default_type: 'trend', default_country: 'US', default_vertical: 'cleantech_climatech' },
  { url: 'https://insideclimatenews.org/feed/',   source_name: 'Inside Climate News',default_type: 'news',  default_country: 'US', default_vertical: 'cleantech_climatech' },
  { url: 'https://techcrunch.com/tag/climate/feed/', source_name: 'TechCrunch Climate', default_type: 'trend', default_country: 'US' },
  { url: 'https://climatetechvc.org/feed/',       source_name: 'ClimateTech VC',     default_type: 'investment', default_country: 'US', default_vertical: 'cleantech_climatech' },
  { url: 'https://www.canarymedia.com/rss',       source_name: 'Canary Media',       default_type: 'trend', default_country: 'US', default_vertical: 'cleantech_climatech' },
  // ── Global — UK / Europa ──
  { url: 'https://www.carbonbrief.org/feed/',     source_name: 'Carbon Brief',       default_type: 'news',  default_country: 'GB', default_vertical: 'cleantech_climatech' },
  { url: 'https://www.climatechangenews.com/feed/', source_name: 'Climate Home News',default_type: 'news',  default_country: 'GB', default_vertical: 'cleantech_climatech' },
  { url: 'https://www.theguardian.com/environment/rss', source_name: 'The Guardian Environment', default_type: 'news', default_country: 'GB' },
  { url: 'https://eu-startups.com/feed/',         source_name: 'EU Startups',        default_type: 'investment', default_country: 'DE' },
  // ── Global — Asia ──
  { url: 'https://www.techinasia.com/feed',       source_name: 'Tech in Asia',       default_type: 'news',  default_country: 'SG' },
  { url: 'https://kr.asia/feed/',                 source_name: 'KrASIA',             default_type: 'investment', default_country: 'SG' },
]

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
}
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
}
function extractCDATA(block: string): string {
  const m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(block)
  return m ? m[1] : block
}
function extractTag(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
  if (!m) return null
  return decodeHtml(extractCDATA(m[1])).trim()
}

const VERTICAL_KEYWORDS: Record<string, string[]> = {
  cleantech_climatech: ['climate','carbon','emission','solar','renewable','green','sustainability','cleantech'],
  agritech_foodtech: ['agritech','foodtech','agriculture','farm','food'],
  fintech: ['fintech','banking','payment','crypto'],
  healthtech: ['healthtech','health','medical','biotech'],
  edtech: ['edtech','education','learning'],
}
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  // LATAM
  PE: ['peru','perú','lima'],
  CL: ['chile','santiago'],
  CO: ['colombia','bogotá','bogota','medellín'],
  MX: ['mexico','méxico'],
  AR: ['argentina','buenos aires'],
  BR: ['brazil','brasil','são paulo','sao paulo'],
  // Global — Norte América
  US: ['united states','u.s.','usa','silicon valley','new york','california','washington d.c.','boston','chicago'],
  CA: ['canada','toronto','vancouver','montreal'],
  // Global — Europa
  GB: ['united kingdom','britain','u.k.','london','england','scotland'],
  DE: ['germany','deutschland','berlin','munich','münchen','hamburg'],
  FR: ['france','paris','lyon','marseille'],
  ES: ['spain','españa','madrid','barcelona'],
  NL: ['netherlands','amsterdam','rotterdam'],
  SE: ['sweden','stockholm','göteborg'],
  // Global — Asia-Pacífico
  CN: ['china','beijing','shanghai','shenzhen','guangzhou','chinese'],
  IN: ['india','bangalore','mumbai','delhi','hyderabad','bengaluru'],
  JP: ['japan','tokyo','osaka','japanese'],
  KR: ['south korea','korea','seoul','busan','korean'],
  SG: ['singapore'],
  AU: ['australia','sydney','melbourne','brisbane'],
}

function classify(text: string) {
  const lower = text.toLowerCase()
  let vertical: string | null = null
  for (const [v, kws] of Object.entries(VERTICAL_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) { vertical = v; break }
  }
  let country: string | null = null
  for (const [c, kws] of Object.entries(COUNTRY_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) { country = c; break }
  }
  return { vertical, country }
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000,
        }),
        signal: AbortSignal.timeout(30000),
      }
    )
    if (!res.ok) return null
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    return json.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

export async function POST(_request: NextRequest) {
  // Auth: superadmin only — this writes global news_items with the service-role key
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'superadmin') {
    console.error('[S4C Admin] refresh-radar denied for non-superadmin:', user.id, profile?.role ?? 'sin perfil')
    return NextResponse.json({ error: 'Solo superadmin puede actualizar el radar' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    console.error('[S4C Admin] refresh-radar: server env missing')
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }
  const adminDb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const stats = { rss_inserted: 0, ai_inserted: 0, errors: [] as string[] }

  // ── Phase 1: RSS feeds ──
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Startups4ClimateBot/1.0' },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) { stats.errors.push(`${feed.source_name}: HTTP ${res.status}`); continue }
      const xml = await res.text()
      const items: Array<{ title: string; link: string; description: string | null; pubDate: string | null }> = []
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
      let m: RegExpExecArray | null
      while ((m = itemRegex.exec(xml)) !== null) {
        const block = m[1]
        const title = extractTag(block, 'title')
        const link = extractTag(block, 'link')
        const description = extractTag(block, 'description')
        const pubDate = extractTag(block, 'pubDate')
        if (title && link) {
          items.push({ title, link, description: description ? stripTags(description).slice(0, 500) : null, pubDate })
        }
      }
      for (const item of items.slice(0, 15)) {
        const { vertical, country } = classify(`${item.title} ${item.description || ''}`)
        const { error } = await adminDb.from('news_items').upsert({
          title: item.title.slice(0, 500),
          summary: item.description,
          source_name: feed.source_name,
          source_url: item.link,
          vertical: vertical || feed.default_vertical || null,
          country: country || feed.default_country || null,
          content_type: feed.default_type,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          scraped_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'source_url', ignoreDuplicates: false })
        if (error) stats.errors.push(`RSS upsert: ${error.message}`)
        else stats.rss_inserted++
      }
    } catch (err) {
      stats.errors.push(`${feed.source_name}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // ── Phase 2: Gemini-generated curated items ──
  // Note: source_url for AI items is set server-side as a Google News search URL
  // (unique per title, always working, finds the actual article). Gemini only provides
  // the title, summary, source_name, content_type, vertical, country.
  const aiPrompt = `Eres un curador de noticias globales de clima, cleantech y startups de impacto.
Genera exactamente 24 noticias (2025-2026). DISTRIBUCIÓN OBLIGATORIA:

BLOQUE LATAM (14 noticias — country debe ser código ISO de país LATAM o null para regional):
- 3 sobre energía solar, eólica o baterías en LATAM
- 2 sobre agua: acceso hídrico, irrigación o desalinización en LATAM
- 2 sobre economía circular: reciclaje, residuos o packaging sostenible en LATAM
- 2 sobre biodiversidad: restauración forestal o ecosistemas en LATAM
- 2 sobre movilidad sostenible en LATAM
- 3 sobre agritech o agricultura regenerativa en LATAM

BLOQUE GLOBAL (10 noticias — country debe ser código ISO de país no-LATAM):
- 3 de USA (US): cleantech, VC de impacto o política climática
- 2 de Europa (GB/DE/FR/ES/NL/SE): startups de clima, regulación EU o fondos verdes
- 2 de Asia (CN/IN/JP/KR/SG/AU): energía renovable, agritech o movilidad eléctrica
- 3 globales relevantes: tendencias mundiales de impacto (asigna el país más representativo del tema)

Responde SOLO con un array JSON:
[
  {
    "title": "Título en español, máx 110 caracteres. Específico: empresa/país/dato concreto.",
    "summary": "60-90 palabras. Datos duros: montos, porcentajes, empresas, países. Sin adjetivos vacíos.",
    "source_name": "Medio real: Reuters, Bloomberg, TechCrunch, Guardian, Carbon Brief, Electrek, Contxto, AgFunder News, Nikkei Asia, Economic Times India",
    "content_type": "news|investment|trend|regulation|event|report",
    "vertical": "cleantech_climatech|agritech_foodtech|fintech|healthtech|logistics_mobility|other",
    "country": "Código ISO 2 letras del país principal de la noticia (PE|CL|CO|MX|AR|BR|US|GB|DE|FR|CN|IN|JP|KR|SG|AU|CA|ES|NL|SE|null si es puramente regional LATAM)"
  }
]
NO incluyas campo source_url. Cada ítem debe ser distinto. Usa datos reales de 2025-2026.`

  const aiResponse = await callGemini(aiPrompt)
  if (aiResponse) {
    try {
      const jsonMatch = /\[[\s\S]*\]/.exec(aiResponse)
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]) as Array<{
          title: string; summary: string; source_name: string;
          content_type: string; vertical: string | null; country: string | null
        }>
        for (const item of items) {
          if (!item.title) continue
          // Build a Google News search URL — unique per title, always functional, finds the real article
          const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(item.title.slice(0, 100))}&hl=es-419&gl=US&ceid=US:es-419`
          const { error } = await adminDb.from('news_items').upsert({
            title: item.title.slice(0, 500),
            summary: item.summary?.slice(0, 800),
            source_name: item.source_name || 'S4C AI',
            source_url: searchUrl,
            vertical: item.vertical || null,
            country: item.country || null,
            content_type: (item.content_type as string) || 'news',
            published_at: new Date().toISOString(),
            scraped_at: new Date().toISOString(),
            is_active: true,
          }, { onConflict: 'source_url', ignoreDuplicates: false })
          if (error) stats.errors.push(`AI upsert: ${error.message}`)
          else stats.ai_inserted++
        }
      }
    } catch (err) {
      stats.errors.push(`AI parse: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // Deactivate items older than 60 days
  await adminDb.from('news_items')
    .update({ is_active: false })
    .lt('published_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
    .eq('is_active', true)

  return NextResponse.json(stats)
}
