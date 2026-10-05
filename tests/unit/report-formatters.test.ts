import { describe, expect, it } from 'vitest'
import { formatToolData } from '@/lib/report-formatters'

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
  // BUG: FORMATTERS is keyed by legacy ids ('pitch-deck', 'unit-economics',
  // 'cap-table', 'data-room', …) while generateGlobalReport() calls
  // formatToolData(tool.id) with the current TOOLS ids ('pitch-deck-builder',
  // 'ltv-unit-economics', 'cap-table-fundraising', 'data-room-builder').
  // Only 'lean-canvas' matches, so every other tool falls back to the raw
  // key/value dump (e.g. "s2_problem_stat") instead of the curated layout.
  it.fails('uses the pitch deck formatter for the "pitch-deck-builder" catalog id', () => {
    const t = text(formatToolData('pitch-deck-builder', { s2_problem_stat: '40% del agua se pierde' }))
    expect(t).toContain('Estadística del problema')
    expect(t).not.toContain('s2_problem_stat')
  })

  it('uses the pitch deck formatter for the legacy "pitch-deck" id', () => {
    const t = text(formatToolData('pitch-deck', { s2_problem_stat: '40% del agua se pierde' }))
    expect(t).toContain('Problema')
    expect(t).toContain('Estadística del problema 40% del agua se pierde')
  })
})
