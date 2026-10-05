import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase-server'
import { chatCompletion, chatCompletionStream } from '@/lib/ai/client'
import { buildStartupContext } from '@/lib/ai/context-builder'
import { MENTOR_GENERAL_PROMPT } from '@/lib/ai/prompts/mentor-general'
import {
  checkAndLogAIUsage,
  rateLimitHeaders,
  type RateLimitRole,
} from '@/lib/rate-limit'
import { DEMO_COOKIE, getActiveDemoRole } from '@/lib/security/demo'
import { checkIpRateLimit, getClientIp } from '@/lib/security/ip-rate-limit'

// Stream long mentor completions without hitting the Hobby plan's 10s
// serverless timeout. Edge runtime keeps the response open for the full
// generation (Vercel allows ~25s initial response + indefinite streaming on
// Hobby, much longer on Pro). All deps used here (next/headers cookies,
// @supabase/ssr, OpenAI SDK over fetch) are edge-compatible.
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Strip or truncate heavy fields from the client-sent userContext so the
 * combined system prompt stays under ~6 000 tokens (≈24 KB of UTF-8 text).
 * Tool data summaries are kept but each value is capped at 300 chars.
 */
function clampUserContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const MAX_VALUE_LEN = 300
  const result: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(ctx)) {
    if (k === 'toolData' && typeof v === 'object' && v !== null) {
      const clamped: Record<string, unknown> = {}
      for (const [toolId, toolVal] of Object.entries(v as Record<string, unknown>)) {
        if (typeof toolVal === 'object' && toolVal !== null) {
          const trimmed: Record<string, unknown> = {}
          for (const [field, fv] of Object.entries(toolVal as Record<string, unknown>)) {
            const str = typeof fv === 'string' ? fv : (JSON.stringify(fv) ?? '')
            trimmed[field] = str.length > MAX_VALUE_LEN ? str.slice(0, MAX_VALUE_LEN) + '…' : fv
          }
          clamped[toolId] = trimmed
        }
      }
      result[k] = clamped
    } else if (typeof v === 'string' && v.length > MAX_VALUE_LEN) {
      result[k] = v.slice(0, MAX_VALUE_LEN) + '…'
    } else if (Array.isArray(v)) {
      result[k] = v
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) =>
          typeof item === 'string' && item.length > MAX_VALUE_LEN
            ? item.slice(0, MAX_VALUE_LEN) + '…'
            : item
        )
    } else {
      result[k] = v
    }
  }
  return result
}

const MAX_ARRAY_ITEMS = 50

/** Accept only a plain object as userContext and clamp it (both demo and auth paths). */
function safeContext(ctx: unknown): Record<string, unknown> | undefined {
  if (typeof ctx !== 'object' || ctx === null || Array.isArray(ctx)) return undefined
  return clampUserContext(ctx as Record<string, unknown>)
}

/**
 * IP rate limit for the demo path. Prevents anonymous abuse of the AI API
 * since the demo cookie bypasses Supabase auth + per-user quotas.
 * 10 requests per minute per IP, counted in the DB (check_ip_rate_limit RPC)
 * so the cap holds across serverless instances.
 */
const DEMO_RATE_LIMIT = 10
const DEMO_WINDOW_SECONDS = 60

const AGENT_PROMPTS: Record<string, string> = {
  mentor: MENTOR_GENERAL_PROMPT,
  radar: `Eres un analista experto del ecosistema de innovación en Latinoamérica. Respondes en español. Das información sobre tendencias, noticias, fondos de inversión, programas de aceleración y eventos relevantes para startups de impacto en la región. Tus respuestas son concisas y accionables. No uses emojis ni markdown con # headers.`,
}

export async function POST(request: NextRequest) {
  try {
    // Early check: ensure AI API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('[S4C AI] GEMINI_API_KEY is not set')
      return Response.json(
        { error: 'El servicio AI no está configurado. Contacta al administrador.' },
        { status: 503 }
      )
    }

    // ── Demo bypass: only when demo mode is enabled AND the cookie holds a
    // known role. Any other value falls through to the authenticated path. ──
    const cookieStore = await cookies()
    const demoRole = getActiveDemoRole(cookieStore.get(DEMO_COOKIE)?.value)

    const body = await request.json()
    const { message, agentType, conversationId, userContext, stream } = body as {
      message: string
      agentType: string
      conversationId?: string
      userContext?: Record<string, unknown>
      stream?: boolean
    }

    if (typeof message !== 'string' || !message || typeof agentType !== 'string' || !agentType) {
      return Response.json(
        { error: 'Faltan campos requeridos: message, agentType' },
        { status: 400 }
      )
    }

    if (message.length > 4000) {
      return Response.json(
        { error: 'El mensaje es demasiado largo. Máximo 4000 caracteres.' },
        { status: 400 }
      )
    }

    // ── Demo path: build context entirely from client-sent userContext ──
    if (demoRole) {
      // IP-scoped rate limit since demo bypasses auth/per-user quota
      const ip = getClientIp(request)
      const allowed = await checkIpRateLimit(`chat-demo:${ip}`, DEMO_RATE_LIMIT, DEMO_WINDOW_SECONDS)
      if (!allowed) {
        return Response.json(
          {
            error: `Demasiadas solicitudes desde tu red. Intenta de nuevo en ${DEMO_WINDOW_SECONDS}s.`,
          },
          {
            status: 429,
            headers: { 'Retry-After': String(DEMO_WINDOW_SECONDS) },
          }
        )
      }

      const demoProfile =
        demoRole === 'founder'
          ? { id: 'demo', email: 'demo.founder@s4c.demo', full_name: 'Ana Quispe', role: 'founder', org_id: null, startup_name: 'EcoBio Perú', stage: '3', diagnostic_score: 84 }
          : null

      // Clamp tool data values to keep context manageable
      const safeUserContext = safeContext(userContext)
      const startupContext = buildStartupContext(null, null, demoProfile, safeUserContext)
      const systemPrompt = AGENT_PROMPTS[agentType] || AGENT_PROMPTS.mentor

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `CONTEXTO DE LA STARTUP DEL FOUNDER:\n${startupContext}` },
        { role: 'user', content: message },
      ]

      // ── Demo streaming branch ──
      // The client always requests stream:true and parses SSE frames. Keeping
      // the demo path on plain JSON broke the chat (deltas never arrived, so
      // the assistant message never rendered). Mirror the auth streaming flow.
      if (stream) {
        const encoder = new TextEncoder()
        const convId = conversationId || crypto.randomUUID()
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const aiStream = await chatCompletionStream(messages, { max_tokens: 2500 })
              for await (const chunk of aiStream) {
                const delta = chunk.choices?.[0]?.delta?.content
                if (delta) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                  )
                }
              }
            } catch (apiError) {
              const errMsg = apiError instanceof Error ? apiError.message : String(apiError)
              console.error('[S4C AI] Gemini stream error (demo):', errMsg)
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    delta: 'Lo siento, el servicio AI tuvo un problema técnico. Intenta de nuevo en unos minutos.',
                  })}\n\n`
                )
              )
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`)
            )
            controller.close()
          },
        })

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      }

      // Non-streaming fallback for demo (legacy callers)
      let aiResponse: string
      try {
        const completion = await chatCompletion(messages, { stream: false, max_tokens: 2500 })
        aiResponse = 'choices' in completion
          ? completion.choices[0]?.message?.content || 'No pude generar una respuesta. Intenta de nuevo.'
          : 'No pude generar una respuesta. Intenta de nuevo.'
      } catch (apiError) {
        const errMsg = apiError instanceof Error ? apiError.message : String(apiError)
        console.error('[S4C AI] Gemini API error (demo):', errMsg)
        aiResponse = 'Lo siento, el servicio AI tuvo un problema técnico. Intenta de nuevo en unos minutos.'
      }

      return Response.json({
        response: aiResponse,
        conversationId: conversationId || crypto.randomUUID(),
      })
    }

    // ── Authenticated path ──
    const supabase = await createSupabaseServer()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json(
        { error: 'No autenticado. Inicia sesión para usar el chat.' },
        { status: 401 }
      )
    }

    // Load role for rate-limit tier
    const { data: roleRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role: RateLimitRole =
      roleRow?.role === 'admin_org' || roleRow?.role === 'superadmin'
        ? roleRow.role
        : 'founder'

    const rateLimit = await checkAndLogAIUsage(supabase, user.id, 'chat', role)
    if (!rateLimit.allowed) {
      const minutes = Math.max(
        1,
        Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)
      )
      return Response.json(
        {
          error: `Has alcanzado el límite de ${rateLimit.limit} consultas por hora al mentor AI. Intenta en ${minutes} min.`,
          remaining: 0,
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }
    const rlHeaders = rateLimitHeaders(rateLimit)

    // Load startup context (startups table uses founder_id, not user_id)
    const { data: startup } = await supabase
      .from('startups')
      .select('*')
      .eq('founder_id', user.id)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, org_id, startup_name, stage, diagnostic_score')
      .eq('id', user.id)
      .maybeSingle()

    const { data: progress } = await supabase
      .from('tool_data')
      .select('*')
      .eq('user_id', user.id)

    const startupContext = buildStartupContext(startup, progress, profile, safeContext(userContext))

    // Load conversation history if conversationId provided
    let history: Array<{ role: string; content: string }> = []
    if (conversationId) {
      const { data: prevConv } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (prevConv?.messages && Array.isArray(prevConv.messages)) {
        history = prevConv.messages
          .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
          .slice(-20)
          .map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }))
      }
    }

    // Build messages array
    const systemPrompt =
      AGENT_PROMPTS[agentType] || AGENT_PROMPTS.mentor

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'system',
        content: `CONTEXTO DE LA STARTUP DEL FOUNDER:\n${startupContext}`,
      },
      ...history,
      { role: 'user', content: message },
    ]

    // ── Streaming branch ──
    // Emits SSE chunks ("data: <json>\n\n") with incremental tokens, then a
    // final {done:true,conversationId} chunk after persisting the conversation.
    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          let aiResponse = ''
          try {
            const aiStream = await chatCompletionStream(messages, { max_tokens: 2500 })
            for await (const chunk of aiStream) {
              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) {
                aiResponse += delta
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                )
              }
            }
          } catch (apiError) {
            console.error('[S4C AI] Gemini stream error:', apiError)
            aiResponse =
              aiResponse ||
              'El servicio de AI no está disponible en este momento. Intenta de nuevo en unos minutos.'
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: aiResponse })}\n\n`)
            )
          }

          // Persist (best-effort; don't block the stream close on DB errors)
          const newMessages = [
            ...history,
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
          ]
          let convId = conversationId
          try {
            if (conversationId) {
              await supabase
                .from('ai_conversations')
                .update({ messages: newMessages, updated_at: new Date().toISOString() })
                .eq('id', conversationId)
                .eq('user_id', user.id)
            } else {
              const { data: newConv } = await supabase
                .from('ai_conversations')
                .insert({
                  user_id: user.id,
                  agent_type: agentType,
                  title: message.slice(0, 100),
                  messages: newMessages,
                })
                .select('id')
                .maybeSingle()
              convId = newConv?.id || crypto.randomUUID()
            }
          } catch (dbErr) {
            console.error('[S4C AI] Stream DB persist failed:', dbErr)
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`)
          )
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          ...rlHeaders,
        },
      })
    }

    // ── Non-streaming branch (legacy / fallback) ──
    let aiResponse: string
    try {
      const completion = await chatCompletion(messages, {
        stream: false,
        max_tokens: 2500,
      })

      aiResponse =
        'choices' in completion
          ? completion.choices[0]?.message?.content || 'No pude generar una respuesta. Intenta de nuevo.'
          : 'No pude generar una respuesta. Intenta de nuevo.'
    } catch (apiError) {
      console.error('[S4C AI] Gemini API error:', apiError)
      aiResponse = 'El servicio de AI no está disponible en este momento. Por favor intenta de nuevo en unos minutos.'
    }

    // Save conversation - use the messages jsonb column
    const newMessages = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() },
    ]

    let convId = conversationId

    if (conversationId) {
      // Update existing conversation
      await supabase
        .from('ai_conversations')
        .update({
          messages: newMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('user_id', user.id)
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          agent_type: agentType,
          title: message.slice(0, 100),
          messages: newMessages,
        })
        .select('id')
        .maybeSingle()

      convId = newConv?.id || crypto.randomUUID()
    }

    return Response.json(
      {
        response: aiResponse,
        conversationId: convId,
      },
      { headers: rlHeaders }
    )
  } catch (err) {
    console.error('[S4C AI] chat route error:', err)
    return Response.json(
      { error: 'Error interno del servidor. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
