/**
 * PDF-ready report generator for individual tools.
 * Uses a browser print-to-PDF approach: builds a styled HTML document,
 * opens it in a new window, and lets the user save as PDF via print.
 */

import type { ToolDef } from './tools-data'
import { escapeHtml } from './security/html'

export interface ReportUser {
  name: string
  email: string
  startup: string
}

/**
 * Format raw report content (plain-text with simple markers) into styled HTML.
 * The content is built from founder input, so it is HTML-escaped first and
 * only the markup produced by the markers below is emitted.
 */
export function formatContent(raw: string): string {
  return escapeHtml(raw)
    .replace(/^(={2,}.*$)/gm, '')
    .replace(/^(─{2,}.*$)/gm, '<hr/>')
    .replace(/^(---+)$/gm, '<hr/>')
    .replace(
      /^([A-ZÁÉÍÓÚÑ](?:[A-ZÁÉÍÓÚÑ\s()\/\-—:,\.0-9]|&amp;)+):?\s*$/gm,
      '<h2 class="section-title">$1</h2>'
    )
    .replace(/^(▶\s?)(.+)$/gm, '<h3 class="question">$2</h3>')
    .replace(/^(\s*[→✓✗⚠]\s?)(.+)$/gm, '<div class="list-item">$1$2</div>')
    .replace(/^(\s*[-•]\s?)(.+)$/gm, '<div class="list-item bullet">$2</div>')
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * Generate and open a printable report for a single tool.
 *
 * @param tool     - The tool definition
 * @param user     - Current user info
 * @param toolId   - Tool identifier (used for mailto link)
 * @param content  - Raw text content produced by the tool component
 */
export function generateToolReport(
  tool: ToolDef,
  user: ReportUser,
  toolId: string,
  content: string
): void {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const stageColor = tool.stageColor || '#1F77F6'

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte: ${escapeHtml(tool.name)} — ${escapeHtml(user.startup)}</title>
<style>
  @font-face { font-family: 'Mluvka'; font-weight: 200; font-style: normal; src: url('/mluvka/Mluvka-ExtraLight-BF65518ac7eb0fe.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 300; font-style: normal; src: url('/mluvka/Mluvka-Light-BF65518ac849790.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 400; font-style: normal; src: url('/mluvka/Mluvka-Regular-BF65518ac8463f5.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 500; font-style: normal; src: url('/mluvka/Mluvka-Medium-BF65518ac864edb.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 600; font-style: normal; src: url('/mluvka/Mluvka-SemiBold-BF65518ac864155.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 700; font-style: normal; src: url('/mluvka/Mluvka-Bold-BF65518ac8cff8c.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Mluvka'; font-weight: 800; font-style: normal; src: url('/mluvka/Mluvka-ExtraBold-BF65518ac86bc69.otf') format('opentype'); font-display: swap; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Mluvka', system-ui, sans-serif; color: #111827; background: #F8F7F4; padding: 0; }
  .page { max-width: 800px; margin: 0 auto; padding: 2rem; }

  .header {
    background: linear-gradient(135deg, ${stageColor}, ${stageColor}DD);
    color: white; padding: 2.5rem; border-radius: 16px; margin-bottom: 1.5rem;
    position: relative; overflow: hidden;
  }
  .header::before { content: ''; position: absolute; top: -50%; right: -20%; width: 60%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%); }
  .header .logo { font-family: 'Mluvka', sans-serif; font-weight: 800; font-size: 0.8125rem; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.7; margin-bottom: 1rem; }
  .header .badge { display: inline-block; padding: 0.3rem 0.875rem; border-radius: 8px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); font-family: 'Mluvka', monospace; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.875rem; letter-spacing: 0.03em; }
  .header h1 { font-family: 'Mluvka', sans-serif; font-size: 1.75rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 0.625rem; }
  .header .subtitle { font-size: 0.9375rem; opacity: 0.85; line-height: 1.5; }
  .header .meta { display: flex; gap: 2rem; margin-top: 1.25rem; font-size: 0.8125rem; opacity: 0.75; flex-wrap: wrap; }
  .header .meta span { display: flex; align-items: center; gap: 0.375rem; }

  .info-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .info-card { flex: 1; min-width: 140px; background: white; border-radius: 12px; border: 1px solid #E5E7EB; padding: 1rem; text-align: center; }
  .info-card .label { font-family: 'Mluvka', monospace; font-size: 0.625rem; text-transform: uppercase; color: #9CA3AF; font-weight: 600; letter-spacing: 0.05em; }
  .info-card .value { font-family: 'Mluvka', sans-serif; font-size: 1.125rem; font-weight: 700; color: ${stageColor}; margin-top: 0.25rem; }

  .content {
    background: white; padding: 2.5rem; border-radius: 16px; border: 1px solid #E5E7EB;
    font-size: 0.9375rem; line-height: 1.8; white-space: pre-wrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .content h2.section-title {
    font-family: 'Mluvka', sans-serif; font-size: 1.0625rem; font-weight: 700;
    color: ${stageColor}; margin: 2rem 0 0.875rem; padding-bottom: 0.5rem;
    border-bottom: 2px solid ${stageColor}20; text-transform: none;
  }
  .content h2.section-title:first-child { margin-top: 0; }
  .content h3.question { font-family: 'Mluvka', sans-serif; font-size: 0.9375rem; font-weight: 600; color: #374151; margin: 1.25rem 0 0.5rem; }
  .content .list-item { padding: 0.25rem 0 0.25rem 0.5rem; font-size: 0.875rem; }
  .content .list-item.bullet::before { content: '-> '; color: ${stageColor}; font-weight: 600; }
  .content hr { border: none; border-top: 1px solid #F3F4F6; margin: 1.5rem 0; }

  .footer {
    margin-top: 2rem; padding: 1.5rem; text-align: center;
    border-top: 1px solid #E5E7EB;
  }
  .footer p { font-size: 0.75rem; color: #9CA3AF; margin-bottom: 0.75rem; }
  .footer .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
  .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.5rem; border-radius: 10px; font-family: 'Mluvka', sans-serif; font-size: 0.875rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.15s; text-decoration: none; }
  .btn-primary { background: ${stageColor}; color: white; box-shadow: 0 2px 8px ${stageColor}40; }
  .btn-primary:hover { filter: brightness(0.9); transform: translateY(-1px); }
  .btn-secondary { background: white; color: #374151; border: 1px solid #E5E7EB; }
  .btn-secondary:hover { background: #0E0E0E; }

  .disclaimer { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 1rem 1.25rem; margin-top: 1.5rem; font-size: 0.8125rem; color: #92400E; line-height: 1.5; }

  @media print {
    body { background: white; padding: 0; }
    .page { padding: 0; }
    .no-print { display: none !important; }
    .header { break-after: avoid; }
    .content { border: none; box-shadow: none; padding: 1.5rem 0; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">Startups4Climate</div>
    <div class="badge">${escapeHtml(tool.stageName)} · ${escapeHtml(tool.category)}</div>
    <h1>${escapeHtml(tool.name)}</h1>
    <div class="subtitle">${escapeHtml(tool.description)}</div>
    <div class="meta">
      <span>${escapeHtml(user.startup)}</span>
      <span>${escapeHtml(user.name)}</span>
      <span>${escapeHtml(dateStr)}</span>
    </div>
  </div>

  <div class="info-bar no-print">
    <div class="info-card">
      <div class="label">Etapa</div>
      <div class="value">${escapeHtml(tool.stageName)}</div>
    </div>
    <div class="info-card">
      <div class="label">Categoria</div>
      <div class="value" style="font-size:0.875rem;color:#374151">${escapeHtml(tool.category)}</div>
    </div>
    <div class="info-card">
      <div class="label">Tiempo estimado</div>
      <div class="value" style="font-size:0.875rem;color:#374151">${escapeHtml(tool.estimatedTime)}</div>
    </div>
  </div>

  <div class="content">${formatContent(content)}</div>

  <div class="disclaimer">
    Este reporte fue generado automáticamente basado en la información ingresada. Valida los datos con tu equipo y asesores antes de compartirlo con inversores o stakeholders.
  </div>

  <div class="footer no-print">
    <p>Generado por Startups4Climate | startups4climate.org</p>
    <div class="actions">
      <button class="btn btn-primary" onclick="window.print()">Imprimir / Guardar PDF</button>
      <a class="btn btn-secondary" href="mailto:${escapeHtml(user.email)}?subject=${escapeHtml(encodeURIComponent('Reporte: ' + tool.name + ' — ' + user.startup))}&amp;body=${escapeHtml(encodeURIComponent('Adjunto el reporte de ' + tool.name + ' generado en Startups4Climate.\n\nPara ver el reporte completo, accede a la plataforma en startups4climate.org/tools/' + toolId))}">Enviar por email</a>
    </div>
  </div>
</div>
</body>
</html>`)
  win.document.close()
}
