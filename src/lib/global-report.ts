/**
 * Global report generator — compiles data from ALL tools into a single
 * printable document organized by stage with an executive summary.
 *
 * Uses the browser print-to-PDF approach (new window + window.print()).
 */

import { TOOLS, STAGE_META, type ToolDef } from './tools-data'
import { getProgress, type ProgressMap } from './progress'
import { formatToolData } from './report-formatters'
import { escapeHtml } from './security/html'

export interface GlobalReportUser {
  id: string
  name: string
  email: string
  startup: string
}

const STAGE_COLORS: Record<number, string> = {
  1: '#DA4E24',
  2: '#1F77F6',
  3: '#2A222B',
  4: '#1F77F6',
}

/**
 * Generate and open a comprehensive global report in a new browser window.
 * Reads all tool data from localStorage for the given user.
 */
export function generateGlobalReport(user: GlobalReportUser): void {
  const progress: ProgressMap = getProgress(user.id)

  const completedTools = TOOLS.filter((t) => progress[t.id]?.completed)
  const stagesCovered = new Set(completedTools.map((t) => t.stage))
  const totalTools = TOOLS.length
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Group tools by stage for the full inventory (completed + pending)
  const stages: Array<{
    stage: number
    name: string
    subtitle: string
    color: string
    tools: Array<{ tool: ToolDef; completed: boolean; data: Record<string, unknown>; completedAt: string | null }>
  }> = ([1, 2, 3, 4] as const).map((s) => {
    const meta = STAGE_META[s]
    const stageTools = TOOLS.filter((t) => t.stage === s).map((tool) => {
      const entry = progress[tool.id]
      return {
        tool,
        completed: entry?.completed ?? false,
        data: entry?.data ?? {},
        completedAt: entry?.completedAt ?? null,
      }
    })
    return {
      stage: s,
      name: meta.name,
      subtitle: meta.subtitle,
      color: STAGE_COLORS[s],
      tools: stageTools,
    }
  })

  // Build executive summary
  const summaryHtml = buildExecutiveSummary(completedTools, totalTools, stagesCovered, stages)

  // Build per-stage sections with all tools
  const stageSectionsHtml = stages
    .map((s) => {
      const completedInStage = s.tools.filter((t) => t.completed).length
      const totalInStage = s.tools.length

      const toolCards = s.tools
        .map((entry) => {
          const { tool, completed, data, completedAt } = entry
          const completedAtStr = completedAt
            ? new Date(completedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : null

          const statusBadge = completed
            ? `<span style="display:inline-block;padding:3px 12px;border-radius:8px;font-family:'Mluvka',monospace;font-size:0.625rem;font-weight:600;color:#1F77F6;background:rgba(31,119,246,0.08);border:1px solid rgba(31,119,246,0.15)">Completado</span>`
            : `<span style="display:inline-block;padding:3px 12px;border-radius:8px;font-family:'Mluvka',monospace;font-size:0.625rem;font-weight:600;color:#9CA3AF;background:rgba(156,163,175,0.08);border:1px solid rgba(156,163,175,0.15)">Pendiente</span>`

          const dataHtml =
            completed && Object.keys(data).length > 0
              ? formatToolData(tool.id, data)
              : completed
                ? '<p style="color:#9CA3AF;font-style:italic;font-size:0.8125rem">Sin datos guardados</p>'
                : '<p style="color:#D1D5DB;font-style:italic;font-size:0.8125rem">Herramienta aún no completada</p>'

          return `
            <div style="margin-bottom:24px;background:white;border-radius:14px;border:1px solid #E5E7EB;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);${!completed ? 'opacity:0.7' : ''}">
              <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <div>
                  <h3 style="font-family:'Mluvka',sans-serif;font-size:1rem;font-weight:700;color:#111827;margin:0 0 4px 0">${escapeHtml(tool.name)}</h3>
                  <p style="font-family:'Mluvka',sans-serif;font-size:0.75rem;color:#6B7280;margin:0">${escapeHtml(tool.category)}${completedAtStr ? ` · Completado: ${escapeHtml(completedAtStr)}` : ''}</p>
                </div>
                ${statusBadge}
              </div>
              ${completed ? `<div style="padding:16px 20px">${dataHtml}</div>` : ''}
            </div>`
        })
        .join('\n')

      return `
        <div style="margin-bottom:40px" class="page-break">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:40px;height:40px;border-radius:12px;background:${s.color}12;display:flex;align-items:center;justify-content:center">
              <span style="font-family:'Mluvka',monospace;font-size:1rem;font-weight:700;color:${s.color}">${s.stage}</span>
            </div>
            <div>
              <h2 style="font-family:'Mluvka',sans-serif;font-size:1.25rem;font-weight:800;color:#111827;margin:0;letter-spacing:-0.01em">${escapeHtml(s.name)}: ${escapeHtml(s.subtitle)}</h2>
              <p style="font-family:'Mluvka',sans-serif;font-size:0.8125rem;color:#6B7280;margin:2px 0 0 0">${completedInStage} de ${totalInStage} herramientas completadas</p>
            </div>
          </div>
          <!-- Progress bar -->
          <div style="height:6px;background:#F3F4F6;border-radius:3px;margin-bottom:20px;overflow:hidden">
            <div style="height:100%;width:${totalInStage > 0 ? (completedInStage / totalInStage) * 100 : 0}%;background:${s.color};border-radius:3px;transition:width 0.3s"></div>
          </div>
          ${toolCards}
        </div>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reporte Global - ${escapeHtml(user.startup)}</title>
<style>
  @font-face { font-family: 'Mluvka'; font-weight: 200; font-style: normal; src: url('/mluvka/Mluvka-ExtraLight-BF65518ac7eb0fe.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 300; font-style: normal; src: url('/mluvka/Mluvka-Light-BF65518ac849790.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 400; font-style: normal; src: url('/mluvka/Mluvka-Regular-BF65518ac8463f5.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 500; font-style: normal; src: url('/mluvka/Mluvka-Medium-BF65518ac864edb.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 600; font-style: normal; src: url('/mluvka/Mluvka-SemiBold-BF65518ac864155.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 700; font-style: normal; src: url('/mluvka/Mluvka-Bold-BF65518ac8cff8c.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 800; font-style: normal; src: url('/mluvka/Mluvka-ExtraBold-BF65518ac86bc69.otf') format('opentype'); font-display: swap; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Mluvka', sans-serif; background: #0E0E0E; color: #111827; }
  @media print {
    body { background: white; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .page-break:first-of-type { page-break-before: auto; }
  }
</style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:48px 24px">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1F77F6,#0069A6);border-radius:20px;padding:40px 36px;margin-bottom:36px;color:white;position:relative;overflow:hidden">
      <div style="position:absolute;top:-50%;right:-20%;width:60%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 60%)"></div>
      <div style="font-family:'Mluvka',monospace;font-size:0.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;margin-bottom:8px">Startups4Climate</div>
      <h1 style="font-family:'Mluvka',sans-serif;font-size:1.875rem;font-weight:800;margin-bottom:8px;letter-spacing:-0.02em">Reporte Global &mdash; ${escapeHtml(user.startup)}</h1>
      <p style="font-family:'Mluvka',sans-serif;font-size:0.9375rem;opacity:0.85">${escapeHtml(user.name)} &middot; Generado el ${escapeHtml(dateStr)}</p>
    </div>

    <!-- Executive Summary -->
    ${summaryHtml}

    <!-- Stage sections -->
    <h2 style="font-family:'Mluvka',sans-serif;font-size:1.375rem;font-weight:800;color:#111827;margin-bottom:24px;letter-spacing:-0.01em">Detalle por etapa</h2>
    ${stageSectionsHtml}

    <!-- Footer -->
    <div class="no-print" style="margin-top:48px;padding:24px 0;border-top:1px solid #E5E7EB;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">
      <button onclick="window.print()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:8px;background:#1F77F6;color:white;font-family:'Mluvka',sans-serif;font-size:0.875rem;font-weight:600;border:none;cursor:pointer;box-shadow:0 2px 10px rgba(31,119,246,0.3)">Imprimir / Guardar PDF</button>
      <a href="mailto:?subject=Reporte%20Global%20-%20${escapeHtml(encodeURIComponent(user.startup))}&body=Adjunto%20el%20reporte%20global%20de%20Startups4Climate" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:8px;background:white;color:#1F77F6;font-family:'Mluvka',sans-serif;font-size:0.875rem;font-weight:600;border:1px solid rgba(31,119,246,0.3);text-decoration:none;cursor:pointer">Enviar por email</a>
    </div>
    <p style="text-align:center;font-family:'Mluvka',monospace;font-size:0.6875rem;color:#9CA3AF;margin-top:16px">Generado por Startups4Climate | startups4climate.org</p>
  </div>
</body>
</html>`

  const reportWindow = window.open('', '_blank')
  if (reportWindow) {
    reportWindow.document.write(html)
    reportWindow.document.close()
  }
}

/**
 * Build the executive summary section HTML.
 */
function buildExecutiveSummary(
  completedTools: ToolDef[],
  totalTools: number,
  stagesCovered: Set<number>,
  stages: Array<{ stage: number; name: string; color: string; tools: Array<{ completed: boolean }> }>
): string {
  const overallPct = totalTools > 0 ? Math.round((completedTools.length / totalTools) * 100) : 0

  // Determine the furthest stage with progress
  const maxStage = Math.max(...Array.from(stagesCovered), 0)
  const currentStageName = maxStage > 0 ? STAGE_META[maxStage as 1 | 2 | 3 | 4].name : 'Sin iniciar'

  // Categories covered
  const categoriesCovered = new Set(completedTools.map((t) => t.category))

  const stageProgressCards = stages
    .map((s) => {
      const done = s.tools.filter((t) => t.completed).length
      const total = s.tools.length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return `
        <div style="background:white;border-radius:12px;border:1px solid #E5E7EB;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-family:'Mluvka',sans-serif;font-size:0.8125rem;font-weight:700;color:${s.color}">${escapeHtml(s.name)}</span>
            <span style="font-family:'Mluvka',monospace;font-size:0.75rem;font-weight:600;color:${pct === 100 ? '#1F77F6' : '#6B7280'}">${done}/${total}</span>
          </div>
          <div style="height:4px;background:#F3F4F6;border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${s.color};border-radius:2px"></div>
          </div>
        </div>`
    })
    .join('')

  return `
    <div style="margin-bottom:36px">
      <h2 style="font-family:'Mluvka',sans-serif;font-size:1.375rem;font-weight:800;color:#111827;margin-bottom:20px;letter-spacing:-0.01em">Resumen ejecutivo</h2>

      <!-- Key metrics -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
        <div style="background:white;border-radius:14px;border:1px solid #E5E7EB;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
          <div style="font-family:'Mluvka',monospace;font-size:1.75rem;font-weight:700;color:#1F77F6">${completedTools.length}<span style="font-size:0.875rem;color:#9CA3AF;font-weight:400">/${totalTools}</span></div>
          <div style="font-family:'Mluvka',sans-serif;font-size:0.8125rem;color:#6B7280;margin-top:4px">Herramientas completadas</div>
        </div>
        <div style="background:white;border-radius:14px;border:1px solid #E5E7EB;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
          <div style="font-family:'Mluvka',monospace;font-size:1.75rem;font-weight:700;color:#1F77F6">${overallPct}%</div>
          <div style="font-family:'Mluvka',sans-serif;font-size:0.8125rem;color:#6B7280;margin-top:4px">Progreso total</div>
        </div>
        <div style="background:white;border-radius:14px;border:1px solid #E5E7EB;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
          <div style="font-family:'Mluvka',monospace;font-size:1.75rem;font-weight:700;color:#1F77F6">${stagesCovered.size}<span style="font-size:0.875rem;color:#9CA3AF;font-weight:400">/4</span></div>
          <div style="font-family:'Mluvka',sans-serif;font-size:0.8125rem;color:#6B7280;margin-top:4px">Etapas cubiertas</div>
        </div>
        <div style="background:white;border-radius:14px;border:1px solid #E5E7EB;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
          <div style="font-family:'Mluvka',sans-serif;font-size:1rem;font-weight:700;color:#1F77F6">${escapeHtml(currentStageName)}</div>
          <div style="font-family:'Mluvka',sans-serif;font-size:0.8125rem;color:#6B7280;margin-top:4px">Etapa más avanzada</div>
        </div>
      </div>

      <!-- Per-stage progress -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">
        ${stageProgressCards}
      </div>

      <!-- Categories covered -->
      <div style="background:white;border-radius:14px;border:1px solid #E5E7EB;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
        <div style="font-family:'Mluvka',sans-serif;font-size:0.75rem;color:#6B7280;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Categorias cubiertas</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${
          categoriesCovered.size > 0
            ? Array.from(categoriesCovered)
                .map(
                  (c) =>
                    `<span style="display:inline-block;padding:4px 12px;border-radius:8px;font-family:'Mluvka',sans-serif;font-size:0.75rem;font-weight:500;color:#374151;background:#F3F4F6">${escapeHtml(c)}</span>`
                )
                .join('')
            : '<span style="font-size:0.8125rem;color:#9CA3AF;font-style:italic">Ninguna aun</span>'
        }</div>
      </div>
    </div>`
}
