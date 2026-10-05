import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_RULES,
  HERRAMIENTAS_POR_ETAPA,
  SCORE_KEYS,
  buildDimensionScores,
  classifyProfile,
  computeTotalScore,
  detectInconsistencies,
  mapToolByBottleneck,
  mapToolByRevenueModel,
  profiles,
  questions,
  verticalOptions,
} from '@/lib/diagnostic-scoring'

/**
 * Diagnostic scoring v2.1 (src/lib/diagnostic-scoring.ts, used by
 * src/components/DiagnosticForm.tsx):
 *   - 6 score questions: madurez, validacion, impacto, financiamiento,
 *     data_room (1-4 each) + equipo (1-3)  → min 6, max 23
 *   - ranges: 6-11 → etapa 1, 12-16 → etapa 2, 17-20 → etapa 3, 21-23 → etapa 4
 *   - totals outside every range fall back to etapa 1
 */

const scoreQuestions = questions.filter((q) => q.type === 'score')

function optionScores(key: string): number[] {
  const q = scoreQuestions.find((x) => x.key === key)
  if (!q) throw new Error(`no score question ${key}`)
  return q.options.map((o) => o.score ?? 0)
}

/** Answer every score question with its min or max option. */
function extremeScores(pick: 'min' | 'max'): Record<string, number> {
  const out: Record<string, number> = {}
  for (const q of scoreQuestions) {
    const values = q.options.map((o) => o.score ?? 0)
    out[q.key] = pick === 'min' ? Math.min(...values) : Math.max(...values)
  }
  return out
}

const MIN_TOTAL = computeTotalScore(extremeScores('min'))
const MAX_TOTAL = computeTotalScore(extremeScores('max'))

describe('question set', () => {
  it('has 9 questions, 6 of them scored, with the documented score keys', () => {
    expect(questions).toHaveLength(9)
    expect(scoreQuestions.map((q) => q.key).sort()).toEqual([...SCORE_KEYS].sort())
    for (const key of ['madurez', 'validacion', 'impacto', 'financiamiento', 'data_room']) {
      expect(optionScores(key), key).toEqual([1, 2, 3, 4])
    }
    expect(optionScores('equipo')).toEqual([1, 2, 3])
  })

  it('every score option has a score and tag options have none', () => {
    for (const q of questions) {
      for (const o of q.options) {
        if (q.type === 'score') expect(typeof o.score, `${q.id}.${o.value}`).toBe('number')
        else expect(o.score, `${q.id}.${o.value}`).toBeUndefined()
      }
    }
  })

  it('exposes the vertical dropdown options', () => {
    expect(verticalOptions).toContain('Otra')
    expect(new Set(verticalOptions).size).toBe(verticalOptions.length)
  })
})

describe('diagnostic scoring', () => {
  it('all-minimum answers total 6 and classify as ETAPA 1 (Pre-incubación)', () => {
    expect(MIN_TOTAL).toBe(6)
    const p = classifyProfile(MIN_TOTAL)
    expect(p.etapa).toBe(1)
    expect(p.name).toBe('ETAPA 1: Pre-incubación')
  })

  it('all-maximum answers total 23 and classify as ETAPA 4 (Escalamiento)', () => {
    expect(MAX_TOTAL).toBe(23)
    const p = classifyProfile(MAX_TOTAL)
    expect(p.etapa).toBe(4)
    expect(p.name).toBe('ETAPA 4: Escalamiento')
  })

  it('boundaries: 11→1, 12→2, 16→2, 17→3, 20→3, 21→4', () => {
    const cases: Array<[number, number]> = [[11, 1], [12, 2], [16, 2], [17, 3], [20, 3], [21, 4]]
    for (const [total, etapa] of cases) expect(classifyProfile(total).etapa, String(total)).toBe(etapa)
  })

  it('profile ranges are contiguous and cover exactly [min, max] of the question set', () => {
    expect(profiles.map((p) => p.etapa)).toEqual([1, 2, 3, 4])
    expect(profiles[0].range[0]).toBe(MIN_TOTAL)
    expect(profiles[profiles.length - 1].range[1]).toBe(MAX_TOTAL)
    for (let i = 1; i < profiles.length; i++) {
      expect(profiles[i].range[0], `etapa ${profiles[i].etapa}`).toBe(profiles[i - 1].range[1] + 1)
    }
    for (const p of profiles) expect(p.range[0]).toBeLessThanOrEqual(p.range[1])
  })

  it('totals below 6 or above 23 fall back to ETAPA 1', () => {
    for (const total of [0, 5, 24, 100, -1]) expect(classifyProfile(total).etapa, String(total)).toBe(1)
  })

  it('dimension_scores contain the 6 score keys with 0 for unanswered questions', () => {
    const dims = buildDimensionScores({ madurez: 3, equipo: 2 })
    expect(Object.keys(dims).sort()).toEqual([...SCORE_KEYS].sort())
    expect(dims).toEqual({ madurez: 3, validacion: 0, impacto: 0, financiamiento: 0, equipo: 2, data_room: 0 })
    expect(computeTotalScore({ madurez: 3, equipo: 2 })).toBe(5)
    expect(computeTotalScore({})).toBe(0)
  })
})

describe('detectInconsistencies', () => {
  const consistent = { madurez: 3, validacion: 3, impacto: 3, financiamiento: 3, equipo: 3, data_room: 3 }

  it('INC-01 when madurez<=2 and validacion=4', () => {
    expect(detectInconsistencies({ ...consistent, madurez: 2, validacion: 4 }, {})).toContain('INC-01')
    expect(detectInconsistencies({ ...consistent, madurez: 3, validacion: 4 }, {})).not.toContain('INC-01')
    expect(detectInconsistencies({ ...consistent, madurez: 2, validacion: 3 }, {})).not.toContain('INC-01')
  })

  it('INC-05 when |madurez - validacion| >= 3', () => {
    expect(detectInconsistencies({ ...consistent, madurez: 1, validacion: 4 }, {})).toContain('INC-05')
    expect(detectInconsistencies({ ...consistent, madurez: 4, validacion: 1 }, {})).toContain('INC-05')
    expect(detectInconsistencies({ ...consistent, madurez: 4, validacion: 2 }, {})).not.toContain('INC-05')
  })

  it('INC-07 when cuello_botella=operaciones and madurez<=2', () => {
    expect(detectInconsistencies({ ...consistent, madurez: 2 }, { cuello_botella: 'operaciones' })).toContain('INC-07')
    expect(detectInconsistencies({ ...consistent, madurez: 3 }, { cuello_botella: 'operaciones' })).not.toContain('INC-07')
    expect(detectInconsistencies({ ...consistent, madurez: 2 }, { cuello_botella: 'pmf' })).not.toContain('INC-07')
  })

  it('none for a consistent all-3 profile', () => {
    expect(detectInconsistencies(consistent, { cuello_botella: 'operaciones' })).toEqual([])
  })
})

describe('ADAPTIVE_RULES', () => {
  it('trigger only for their question id and conditions', () => {
    const byId = Object.fromEntries(ADAPTIVE_RULES.map((r) => [r.id, r]))
    expect(byId['ADAPT-01'].qId).toBe('P2')
    expect(byId['ADAPT-02'].qId).toBe('P5')
    expect(byId['ADAPT-03'].qId).toBe('P9')

    // Each rule's qId points at a real question and the trigger values exist there
    for (const r of ADAPTIVE_RULES) expect(questions.some((q) => q.id === r.qId), r.id).toBe(true)

    expect(byId['ADAPT-01'].triggers({ madurez: 2 }, 'recurring')).toBe(true)
    expect(byId['ADAPT-01'].triggers({ madurez: 3 }, 'recurring')).toBe(false)
    expect(byId['ADAPT-01'].triggers({ madurez: 1 }, 'paid_pilots')).toBe(false)

    expect(byId['ADAPT-02'].triggers({ madurez: 1 }, 'seriesA')).toBe(true)
    expect(byId['ADAPT-02'].triggers({ madurez: 1 }, 'seriesB')).toBe(true)
    expect(byId['ADAPT-02'].triggers({ madurez: 2 }, 'seriesB')).toBe(false)
    expect(byId['ADAPT-02'].triggers({ madurez: 1 }, 'seed')).toBe(false)

    expect(byId['ADAPT-03'].triggers({ madurez: 2 }, 'full')).toBe(true)
    expect(byId['ADAPT-03'].triggers({ madurez: 3 }, 'full')).toBe(false)
    expect(byId['ADAPT-03'].triggers({ madurez: 1 }, 'basic')).toBe(false)

    // Unanswered madurez counts as 0
    expect(byId['ADAPT-01'].triggers({}, 'recurring')).toBe(true)

    // The component only evaluates rules whose qId matches the current question
    const matching = (qId: string, value: string) =>
      ADAPTIVE_RULES.filter((r) => r.qId === qId && r.triggers({ madurez: 1 }, value)).map((r) => r.id)
    expect(matching('P2', 'recurring')).toEqual(['ADAPT-01'])
    expect(matching('P5', 'recurring')).toEqual([])
    expect(matching('P1', 'full')).toEqual([])
  })
})

describe('tool mapping', () => {
  const allTools = new Set(Object.values(HERRAMIENTAS_POR_ETAPA).flat())
  const bottlenecks = ['pmf', 'clientes', 'operaciones', 'financiero', 'inversion']

  it('mapToolByBottleneck returns early-stage tools for etapa<=2 and late-stage otherwise', () => {
    const early: Record<string, string> = {
      pmf: 'Perfil del Usuario',
      clientes: 'Primeros 10 Clientes',
      operaciones: 'Lean Canvas',
      financiero: 'Lean Canvas',
      inversion: 'Propuesta de Valor',
    }
    const late: Record<string, string> = {
      pmf: 'Validación de Tracción',
      clientes: 'Proceso de Ventas',
      operaciones: 'Unit Economics',
      financiero: 'Modelo de Negocio',
      inversion: 'Pitch Deck',
    }
    for (const cb of bottlenecks) {
      for (const etapa of [1, 2]) expect(mapToolByBottleneck(cb, etapa), `${cb}/${etapa}`).toBe(early[cb])
      for (const etapa of [3, 4]) expect(mapToolByBottleneck(cb, etapa), `${cb}/${etapa}`).toBe(late[cb])
    }
    for (const etapa of [1, 2, 3, 4]) {
      expect(mapToolByBottleneck(undefined, etapa)).toBe(HERRAMIENTAS_POR_ETAPA[etapa][0])
    }
    for (const cb of bottlenecks) for (const etapa of [1, 2, 3, 4]) expect(allTools.has(mapToolByBottleneck(cb, etapa))).toBe(true)
  })

  it('mapToolByRevenueModel always returns a tool from HERRAMIENTAS_POR_ETAPA or the documented fallbacks', () => {
    const fallbacks = new Set(['Primeros 10 Clientes', 'Lean Canvas', 'Propuesta de Valor'])
    for (const modelo of ['saas', 'venta', 'marketplace', 'freemium', 'licencia', undefined, 'otro']) {
      for (const etapa of [1, 2, 3, 4]) {
        const tool = mapToolByRevenueModel(modelo, etapa)
        expect(HERRAMIENTAS_POR_ETAPA[etapa].includes(tool) || fallbacks.has(tool), `${modelo}/${etapa} → ${tool}`).toBe(true)
      }
    }
    expect(mapToolByRevenueModel('saas', 3)).toBe('Unit Economics')
    expect(mapToolByRevenueModel('saas', 1)).toBe(HERRAMIENTAS_POR_ETAPA[1][0])
    expect(mapToolByRevenueModel('licencia', 4)).toBe('Cap Table')
    expect(mapToolByRevenueModel(undefined, 2)).toBe(HERRAMIENTAS_POR_ETAPA[2][1])
  })
})
