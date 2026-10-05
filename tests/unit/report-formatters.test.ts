import { describe, expect, it } from 'vitest'
import { formatToolData, getFormatterIds, getLegacyFormatterAliases } from '@/lib/report-formatters'
import { TOOLS } from '@/lib/tools-data'

/** Strip tags so assertions can focus on visible text. */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

describe('formatToolData — fallback formatter', () => {
  it('renders key/value cards for unknown tools', () => {
    const html = formatToolData('unknown-tool', { problema: 'Agua contaminada', segmento: 'Agricultores' })
    expect(text(html)).toContain('problema Agua contaminada')
    expect(text(html)).toContain('segmento Agricultores')
  })

  it('unwraps data.values when present', () => {
    const html = formatToolData('unknown-tool', { values: { a: 'uno' } })
    expect(text(html)).toBe('a uno')
  })

  it('skips null, undefined and empty-string values', () => {
    const html = formatToolData('unknown-tool', { a: null, b: undefined, c: '', d: 'ok' })
    expect(text(html)).toBe('d ok')
  })

  it('skips whitespace-only values', () => {
    expect(formatToolData('unknown-tool', { a: '   ' })).toBe('')
  })

  it('serializes nested objects as JSON', () => {
    const html = formatToolData('unknown-tool', { list: ['x', 'y'] })
    expect(html).toContain('"x"')
    expect(html).toContain('"y"')
  })

  it('renders numbers and booleans', () => {
    const html = formatToolData('unknown-tool', { n: 0, flag: false })
    expect(text(html)).toContain('n 0')
    expect(text(html)).toContain('flag false')
  })

  // BUG: user-entered text is interpolated into the report HTML without
  // escaping, and the report is opened with document.write() in a new window
  // (src/lib/global-report.ts, src/lib/pdf-generator.ts). Any founder input
  // containing markup is rendered/executed. Expected: HTML-escaped output.
  it.fails('escapes HTML in user-provided values', () => {
    const html = formatToolData('unknown-tool', { nota: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})

describe('formatToolData — lean-canvas', () => {
  it('renders labelled blocks only for filled fields', () => {
    const html = formatToolData('lean-canvas', { values: { problem: 'Sequías', uvp: 'Riego 40% más barato', costs: '' } })
    const t = text(html)
    expect(t).toContain('Problema Sequías')
    expect(t).toContain('Propuesta de Valor Única Riego 40% más barato')
    expect(t).not.toContain('Estructura de Costos')
  })

  it('returns an empty string when nothing is filled', () => {
    expect(formatToolData('lean-canvas', {})).toBe('')
  })
})

describe('formatToolData — unit-economics (legacy storage id)', () => {
  const data = {
    revenuePerClient: '1000',
    cogsPerUnit: '400',
    churnRateAnnual: '20',
    marketingCostPerLead: '50',
    conversionRate: '10',
    fossilAlternativePrice: '800',
  }

  it('computes LTV, CAC, LTV/CAC and green premium', () => {
    const t = text(formatToolData('unit-economics', data))
    // LTV = (1000 - 400) / 0.20 = 3000 ; CAC = 50 / 0.10 = 500 ; ratio = 6.0x
    expect(t).toContain('LTV $3,000')
    expect(t).toContain('CAC $500')
    expect(t).toContain('LTV / CAC 6.0x')
    // Green premium = (1000 - 800) / 800 = 25%
    expect(t).toContain('Green Premium 25.0%')
  })

  it('does not divide by zero with empty inputs', () => {
    const t = text(formatToolData('unit-economics', {}))
    expect(t).toContain('LTV $0')
    expect(t).toContain('CAC $0')
    expect(t).toContain('LTV / CAC 0.0x')
    expect(t).not.toMatch(/NaN|Infinity/)
  })
})

describe('formatToolData — cap-table (legacy storage id)', () => {
  it('computes ownership percentages from shares', () => {
    const html = formatToolData('cap-table', {
      founders: [
        { name: 'Ana', shares: '7500' },
        { name: 'Luis', shares: '2500' },
      ],
      rounds: [],
      optionPool: '10',
    })
    const t = text(html)
    expect(t).toContain('75.0%')
    expect(t).toContain('25.0%')
    expect(t).toContain('Option Pool 10%')
    expect(t).not.toContain('Rondas')
  })

  it('shows 0% for every founder when there are no shares', () => {
    const t = text(formatToolData('cap-table', { founders: [{ name: 'Ana', shares: '' }] }))
    expect(t).toContain('0.0%')
    expect(t).not.toMatch(/NaN/)
  })
})

describe('formatToolData — catalog ids', () => {
  const toolIds = new Set(TOOLS.map((t) => t.id))

  it('every formatter key is a current tool id from TOOLS', () => {
    const ids = getFormatterIds()
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(toolIds.has(id), id).toBe(true)
  })

  it('every legacy alias points to a registered formatter and is not itself a TOOLS id', () => {
    const formatterIds = new Set(getFormatterIds())
    for (const [legacy, current] of Object.entries(getLegacyFormatterAliases())) {
      expect(formatterIds.has(current), `${legacy} → ${current}`).toBe(true)
      expect(toolIds.has(legacy), legacy).toBe(false)
    }
  })

  it('uses the pitch deck formatter for the "pitch-deck-builder" catalog id', () => {
    const t = text(formatToolData('pitch-deck-builder', { s2_problem_stat: '40% del agua se pierde' }))
    expect(t).toContain('Estadística del problema')
    expect(t).not.toContain('s2_problem_stat')
  })

  it('renders the current PitchDeck field ids with their labels', () => {
    const t = text(formatToolData('pitch-deck-builder', { values: { problem_stat: '40% del agua se pierde', ask: '$1M' } }))
    expect(t).toContain('El Problema Estadística clave del problema 40% del agua se pierde')
    expect(t).toContain('El Ask específico $1M')
    expect(t).not.toContain('problem_stat')
  })

  it('resolves stage-qualified storage ids of transversal tools', () => {
    const t = text(formatToolData('pitch-deck-builder__stage2', { values: { tagline: 'Agua para todos' } }))
    expect(t).toContain('Tagline (1 línea) Agua para todos')
  })

  it('uses the pitch deck formatter for the legacy "pitch-deck" id', () => {
    const t = text(formatToolData('pitch-deck', { s2_problem_stat: '40% del agua se pierde' }))
    expect(t).toContain('Problema')
    expect(t).toContain('Estadística del problema 40% del agua se pierde')
  })

  it('uses the unit economics formatter for "ltv-unit-economics"', () => {
    const t = text(formatToolData('ltv-unit-economics', { values: { revenuePerClient: '1000', cogsPerUnit: '400', churnRateAnnual: '20' } }))
    expect(t).toContain('LTV $3,000')
  })

  it('uses the cap table formatter for "cap-table-fundraising"', () => {
    const t = text(formatToolData('cap-table-fundraising', { values: { founders: [{ name: 'Ana', shares: '1' }], rounds: [], optionPool: '10' } }))
    expect(t).toContain('Fundadores')
    expect(t).toContain('100.0%')
  })

  it('renders the current DataRoomBuilder shape for "data-room-builder"', () => {
    const t = text(formatToolData('data-room-builder', {
      values: {
        categories: [
          { name: 'Legal', documents: [{ name: 'Acta constitutiva', status: 'listo' }, { name: 'Poderes', status: 'pendiente' }] },
        ],
      },
    }))
    expect(t).toContain('Legal (1/2)')
    expect(t).toContain('Listo Acta constitutiva')
    expect(t).toContain('Pendiente Poderes')
    expect(t).not.toContain('Prioridad')
  })

  it('still renders the legacy data room shape', () => {
    const t = text(formatToolData('data-room', {
      categories: [{ label: 'Legal', docs: [{ label: 'Acta', status: 'done', priority: 'alta' }] }],
    }))
    expect(t).toContain('Legal (1/1)')
    expect(t).toContain('Completado Acta Prioridad: alta')
  })
})
