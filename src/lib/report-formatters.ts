// Tool-specific HTML formatters for the global report
// Each formatter understands the data shape of its tool and produces readable HTML.
// All user-provided values MUST go through escapeHtml(): the report is opened
// with document.write() in a same-origin window.

import { escapeHtml } from './security/html'

const S = {
  label: 'color:#6B7280;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px',
  value: 'color:#111827;font-size:0.875rem;line-height:1.6',
  card: 'background:#0E0E0E;border-radius:10px;padding:14px 16px;margin-bottom:8px',
  grid2: 'display:grid;grid-template-columns:1fr 1fr;gap:8px',
  grid3: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px',
  sectionTitle: 'font-family:"Mluvka",system-ui,sans-serif;font-size:0.9375rem;font-weight:700;color:#111827;margin:16px 0 8px 0',
  badge: (color: string) => `display:inline-block;padding:2px 10px;border-radius:8px;font-size:0.6875rem;font-weight:600;color:${color};background:${color}15`,
  status: (s: string) => {
    const m: Record<string, string> = { listo: '#1F77F6', borrador: '#2A222B', pendiente: '#9CA3AF', done: '#1F77F6', partial: '#2A222B', 'in-progress': '#2A222B', pending: '#9CA3AF', missing: '#EF4444', na: '#9CA3AF', identified: '#6B7280', applying: '#1F77F6', secured: '#1F77F6', rejected: '#EF4444' }
    const labels: Record<string, string> = { listo: 'Listo', borrador: 'Borrador', pendiente: 'Pendiente', done: 'Completado', partial: 'Parcial', 'in-progress': 'En progreso', pending: 'Pendiente', missing: 'Faltante', na: 'N/A', identified: 'Identificado', applying: 'Aplicando', secured: 'Asegurado', rejected: 'Rechazado' }
    const c = m[s] || '#6B7280'
    return `<span style="${S.badge(c)}">${escapeHtml(labels[s] || s)}</span>`
  },
  field: (label: string, value: string) => value?.trim() ? `<div style="${S.card}"><div style="${S.label}">${escapeHtml(label)}</div><div style="${S.value}">${escapeHtml(value)}</div></div>` : '',
}

// ──────────── Lean Canvas ────────────
const CANVAS_LABELS: Record<string, string> = {
  problem: 'Problema', solution: 'Solución', uvp: 'Propuesta de Valor Única',
  advantage: 'Ventaja Competitiva', segments: 'Segmentos de Clientes',
  metrics: 'Métricas Clave', channels: 'Canales', costs: 'Estructura de Costos',
  revenue: 'Flujo de Ingresos', impact: 'Impacto Climático', regulatory: 'Marco Regulatorio',
}

function formatLeanCanvas(data: Record<string, unknown>): string {
  const v = (data.values || data) as Record<string, string>
  return Object.entries(CANVAS_LABELS)
    .map(([k, label]) => S.field(label, v[k] || ''))
    .filter(Boolean)
    .join('')
}

// ──────────── Unit Economics ────────────
const UE_LABELS: Record<string, string> = {
  revenuePerClient: 'Ingreso anual por cliente (USD)',
  cogsPerUnit: 'COGS por unidad (USD)',
  installationCost: 'Costo de instalación (USD)',
  salesCycleMonths: 'Ciclo de venta (meses)',
  churnRateAnnual: 'Tasa de churn anual (%)',
  fossilAlternativePrice: 'Precio alternativa fósil (USD)',
  marketingCostPerLead: 'Costo por lead (USD)',
  conversionRate: 'Tasa de conversión (%)',
}

function formatUnitEconomics(data: Record<string, unknown>): string {
  const v = (data.values || data) as Record<string, string>
  const revenue = parseFloat(v.revenuePerClient) || 0
  const cogs = parseFloat(v.cogsPerUnit) || 0
  const churn = (parseFloat(v.churnRateAnnual) || 0) / 100
  const mktCost = parseFloat(v.marketingCostPerLead) || 0
  const conv = (parseFloat(v.conversionRate) || 1) / 100
  const cac = conv > 0 ? mktCost / conv : 0
  const ltv = churn > 0 ? (revenue - cogs) / churn : 0
  const ltvCac = cac > 0 ? ltv / cac : 0
  const fossil = parseFloat(v.fossilAlternativePrice) || 0
  const greenPremium = fossil > 0 ? ((revenue - fossil) / fossil * 100) : 0

  return `
    <div style="${S.grid2};margin-bottom:12px">
      <div style="${S.card};border-left:4px solid #1F77F6"><div style="${S.label}">LTV</div><div style="font-size:1.25rem;font-weight:700;color:#1F77F6">$${ltv.toLocaleString('en', { maximumFractionDigits: 0 })}</div></div>
      <div style="${S.card};border-left:4px solid #1F77F6"><div style="${S.label}">CAC</div><div style="font-size:1.25rem;font-weight:700;color:#1F77F6">$${cac.toLocaleString('en', { maximumFractionDigits: 0 })}</div></div>
      <div style="${S.card};border-left:4px solid ${ltvCac >= 3 ? '#1F77F6' : '#2A222B'}"><div style="${S.label}">LTV / CAC</div><div style="font-size:1.25rem;font-weight:700;color:${ltvCac >= 3 ? '#1F77F6' : '#2A222B'}">${ltvCac.toFixed(1)}x</div></div>
      <div style="${S.card};border-left:4px solid ${greenPremium <= 20 ? '#1F77F6' : '#EF4444'}"><div style="${S.label}">Green Premium</div><div style="font-size:1.25rem;font-weight:700;color:${greenPremium <= 20 ? '#1F77F6' : '#EF4444'}">${greenPremium.toFixed(1)}%</div></div>
    </div>
    <div style="${S.sectionTitle}">Inputs</div>
    <div style="${S.grid2}">${Object.entries(UE_LABELS).map(([k, label]) => `<div style="${S.card}"><div style="${S.label}">${label}</div><div style="${S.value}">${escapeHtml(v[k] || '—')}</div></div>`).join('')}</div>
  `
}

// ──────────── Pitch Deck ────────────
type FieldSection = { title: string; fields: Array<{ id: string; label: string }> }

/** Current layout — mirrors SLIDES in src/components/tools/PitchDeck.tsx. */
const PITCH_SLIDES: FieldSection[] = [
  { title: 'Portada', fields: [{ id: 'tagline', label: 'Tagline (1 línea)' }, { id: 'name_role', label: 'Nombre del presentador y cargo' }] },
  { title: 'El Problema', fields: [{ id: 'problem_stat', label: 'Estadística clave del problema' }, { id: 'current_solutions', label: 'Soluciones actuales y sus limitaciones' }] },
  { title: 'La Solución', fields: [{ id: 'solution_desc', label: 'Descripción de la solución (sin jerga)' }, { id: 'differentiation', label: '¿Qué te hace diferente a nivel técnico?' }] },
  { title: 'Tecnología y TRL', fields: [{ id: 'trl_current', label: 'TRL actual y evidencia' }, { id: 'ip_status', label: 'Estado de la IP (patentes, trade secrets)' }, { id: 'trl_timeline', label: 'Timeline al TRL comercial' }] },
  { title: 'Mercado', fields: [{ id: 'tam', label: 'TAM (Mercado Total Disponible)' }, { id: 'sam', label: 'SAM (Mercado Dirigible)' }, { id: 'som', label: 'SOM (Mercado Objetivo a 5 años)' }] },
  { title: 'Modelo de Negocio', fields: [{ id: 'business_model', label: 'Modelo de ingresos principal' }, { id: 'unit_economics', label: 'Unit economics clave' }, { id: 'pricing', label: 'Estrategia de precio vs. alternativa' }] },
  { title: 'Impacto Ambiental (ERP)', fields: [{ id: 'erp', label: 'Emisiones Reducidas Proyectadas (ERP)' }, { id: 'lca', label: 'Resumen del LCA (si disponible)' }, { id: 'sdgs', label: 'SDGs relevantes' }] },
  { title: 'Tracción y Go-to-Market', fields: [{ id: 'traction', label: 'Tracción actual (LOIs, pilotos, ingresos)' }, { id: 'gtm', label: 'Estrategia de Go-to-Market' }] },
  { title: 'Equipo', fields: [{ id: 'team_desc', label: 'Equipo fundador y track record' }, { id: 'advisors', label: 'Advisors y respaldos clave' }] },
  { title: 'Finanzas', fields: [{ id: 'financials', label: 'Proyección de ingresos a 3 años' }, { id: 'burn_runway', label: 'Burn mensual actual y runway' }] },
  { title: 'Levantamiento y Uso de Fondos', fields: [{ id: 'raise', label: 'Monto a levantar y tipo de instrumento' }, { id: 'use_of_funds', label: 'Uso de fondos (vinculado a hitos)' }] },
  { title: 'Visión y Ask', fields: [{ id: 'vision', label: 'Visión a 10 años' }, { id: 'ask', label: 'El Ask específico' }] },
]

/** Legacy layout (slide-prefixed keys) still present in older saved data. */
const LEGACY_PITCH_SLIDES: FieldSection[] = [
  { title: 'Portada', fields: [{ id: 's1_tagline', label: 'Tagline' }, { id: 's1_name_role', label: 'Nombre y rol' }] },
  { title: 'Problema', fields: [{ id: 's2_problem_stat', label: 'Estadística del problema' }, { id: 's2_problem_desc', label: 'Descripción' }] },
  { title: 'Solución', fields: [{ id: 's3_solution', label: 'Solución' }, { id: 's3_how_it_works', label: 'Cómo funciona' }] },
  { title: 'Mercado', fields: [{ id: 's4_tam', label: 'TAM' }, { id: 's4_sam', label: 'SAM' }, { id: 's4_som', label: 'SOM' }] },
  { title: 'Modelo de Negocio', fields: [{ id: 's5_revenue_model', label: 'Modelo de ingresos' }, { id: 's5_pricing', label: 'Pricing' }] },
  { title: 'Tracción', fields: [{ id: 's6_metrics', label: 'Métricas clave' }, { id: 's6_milestones', label: 'Hitos' }] },
  { title: 'Tecnología / IP', fields: [{ id: 's7_tech', label: 'Stack tecnológico' }, { id: 's7_ip', label: 'Propiedad intelectual' }] },
  { title: 'Impacto Climático', fields: [{ id: 's8_co2', label: 'Reducción CO₂' }, { id: 's8_sdgs', label: 'ODS relacionados' }] },
  { title: 'Competencia', fields: [{ id: 's9_competitors', label: 'Competidores' }, { id: 's9_diff', label: 'Diferenciación' }] },
  { title: 'Equipo', fields: [{ id: 's10_team', label: 'Equipo fundador' }, { id: 's10_advisors', label: 'Advisors' }] },
  { title: 'Financiamiento', fields: [{ id: 's11_ask', label: 'Monto solicitado' }, { id: 's11_use_of_funds', label: 'Uso de fondos' }] },
  { title: 'Cierre / CTA', fields: [{ id: 's12_vision', label: 'Visión' }, { id: 's12_contact', label: 'Contacto' }] },
]

function formatSections(sections: FieldSection[], v: Record<string, string>): string {
  return sections.map(slide => {
    const filled = slide.fields.filter(f => typeof v[f.id] === 'string' && v[f.id].trim())
    if (filled.length === 0) return ''
    return `<div style="${S.sectionTitle}">${slide.title}</div>${filled.map(f => S.field(f.label, v[f.id])).join('')}`
  }).filter(Boolean).join('')
}

function formatPitchDeck(data: Record<string, unknown>): string {
  const v = (data.values || data) as Record<string, string>
  return formatSections(PITCH_SLIDES, v) + formatSections(LEGACY_PITCH_SLIDES, v)
}

// ──────────── Cap Table ────────────
function formatCapTable(data: Record<string, unknown>): string {
  const v = (data.values || data) as Record<string, unknown>
  const founders = (v.founders || []) as Array<{ name: string; shares: string }>
  const rounds = (v.rounds || []) as Array<{ name: string; type: string; preMoneyValuation: string; amountRaised: string; investorName: string }>
  const optionPool = v.optionPool as string || '0'

  const totalShares = founders.reduce((s, f) => s + (parseFloat(f.shares) || 0), 0)

  let html = `<div style="${S.sectionTitle}">Fundadores</div>
    <table style="width:100%;border-collapse:collapse;font-size:0.8125rem">
      <thead><tr style="border-bottom:2px solid #E5E7EB">
        <th style="text-align:left;padding:8px;color:#6B7280">Nombre</th>
        <th style="text-align:right;padding:8px;color:#6B7280">Acciones</th>
        <th style="text-align:right;padding:8px;color:#6B7280">%</th>
      </tr></thead>
      <tbody>${founders.map(f => {
        const pct = totalShares > 0 ? ((parseFloat(f.shares) || 0) / totalShares * 100) : 0
        return `<tr style="border-bottom:1px solid #F3F4F6"><td style="padding:8px;color:#111827;font-weight:500">${escapeHtml(f.name)}</td><td style="padding:8px;text-align:right;color:#111827">${Number(f.shares || 0).toLocaleString()}</td><td style="padding:8px;text-align:right;font-weight:600;color:#DA4E24">${pct.toFixed(1)}%</td></tr>`
      }).join('')}</tbody>
    </table>`

  if (rounds.length > 0) {
    html += `<div style="${S.sectionTitle}">Rondas</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.8125rem">
        <thead><tr style="border-bottom:2px solid #E5E7EB">
          <th style="text-align:left;padding:8px;color:#6B7280">Ronda</th>
          <th style="text-align:left;padding:8px;color:#6B7280">Tipo</th>
          <th style="text-align:right;padding:8px;color:#6B7280">Pre-money</th>
          <th style="text-align:right;padding:8px;color:#6B7280">Monto</th>
          <th style="text-align:left;padding:8px;color:#6B7280">Inversor</th>
        </tr></thead>
        <tbody>${rounds.map(r => `<tr style="border-bottom:1px solid #F3F4F6"><td style="padding:8px;color:#111827;font-weight:500">${escapeHtml(r.name)}</td><td style="padding:8px">${S.status(r.type)}</td><td style="padding:8px;text-align:right;color:#111827">$${Number(r.preMoneyValuation || 0).toLocaleString()}</td><td style="padding:8px;text-align:right;color:#1F77F6;font-weight:600">$${Number(r.amountRaised || 0).toLocaleString()}</td><td style="padding:8px;color:#374151">${escapeHtml(r.investorName || '—')}</td></tr>`).join('')}</tbody>
      </table>`
  }

  html += `<div style="${S.card};margin-top:12px"><div style="${S.label}">Option Pool</div><div style="${S.value};font-weight:600">${escapeHtml(optionPool)}%</div></div>`
  return html
}

// ──────────── Data Room ────────────
// Current shape (DataRoomBuilder): categories[].name / documents[].name, status pendiente|borrador|listo.
// Legacy shape: categories[].label / docs[].label, status done|..., priority.
interface DataRoomDoc { label?: string; name?: string; status?: string; priority?: string }
interface DataRoomCategory { label?: string; name?: string; docs?: DataRoomDoc[]; documents?: DataRoomDoc[] }

function formatDataRoom(data: Record<string, unknown>): string {
  const v = (data.values || data) as Record<string, unknown>
  const categories = (Array.isArray(v.categories) ? v.categories : []) as DataRoomCategory[]
  return categories.map(cat => {
    const docs = cat.docs ?? cat.documents ?? []
    const total = docs.length
    const done = docs.filter(d => d.status === 'done' || d.status === 'listo').length
    return `
      <div style="${S.sectionTitle}">${escapeHtml(cat.label ?? cat.name ?? '')} <span style="font-size:0.75rem;color:#6B7280;font-weight:400">(${done}/${total})</span></div>
      ${docs.map(d => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.8125rem">${S.status(d.status ?? '')}<span style="color:#111827">${escapeHtml(d.label ?? d.name ?? '')}</span>${d.priority ? `<span style="font-size:0.6875rem;color:#9CA3AF;margin-left:auto">Prioridad: ${escapeHtml(d.priority)}</span>` : ''}</div>`).join('')}
    `
  }).join('')
}

// ──────────── Registry ────────────
type Formatter = (data: Record<string, unknown>) => string

/** Keyed by the current tool ids from TOOLS (src/lib/tools-data.ts). */
const FORMATTERS: Record<string, Formatter> = {
  'lean-canvas': formatLeanCanvas,
  'ltv-unit-economics': formatUnitEconomics,
  'pitch-deck-builder': formatPitchDeck,
  'cap-table-fundraising': formatCapTable,
  'data-room-builder': formatDataRoom,
}

/**
 * Legacy storage ids written by older versions of the tool components
 * (tool_data rows / localStorage). They resolve to the current formatter.
 */
const LEGACY_FORMATTER_ALIASES: Record<string, string> = {
  'unit-economics': 'ltv-unit-economics',
  'pitch-deck': 'pitch-deck-builder',
  'cap-table': 'cap-table-fundraising',
  'data-room': 'data-room-builder',
}

/** Current tool ids that have a curated formatter. */
export function getFormatterIds(): string[] {
  return Object.keys(FORMATTERS)
}

/** Legacy storage id → current tool id. */
export function getLegacyFormatterAliases(): Record<string, string> {
  return { ...LEGACY_FORMATTER_ALIASES }
}

function resolveFormatter(toolId: string): Formatter | undefined {
  // Transversal tools are stored per stage as `${toolId}__stageN`
  const baseId = toolId.replace(/__stage\d+$/, '')
  return FORMATTERS[baseId] ?? FORMATTERS[LEGACY_FORMATTER_ALIASES[baseId] ?? '']
}

export function formatToolData(toolId: string, data: Record<string, unknown>): string {
  const formatter = resolveFormatter(toolId)
  if (!formatter) {
    // Fallback: render key-value pairs
    const v = (data.values || data) as Record<string, unknown>
    return Object.entries(v)
      .filter(([, val]) => val !== null && val !== undefined && val !== '')
      .map(([key, val]) => S.field(key, typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)))
      .join('')
  }
  return formatter(data)
}
