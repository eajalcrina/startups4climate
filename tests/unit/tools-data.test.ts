import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  STAGE_META,
  TOOLS,
  TOOLS_BY_STAGE,
  TOOL_TO_PROFILE_MAP,
  TRANSVERSAL_PREAMBULOS,
  TRANSVERSAL_TOOLS,
  getToolById,
  getTransversalPreambulo,
  getTransversalToolsForStage,
} from '@/lib/tools-data'

const STAGES = [0, 1, 2, 3, 4] as const
const toolIds = new Set(TOOLS.map((t) => t.id))

describe('TOOLS catalog invariants', () => {
  it('is not empty', () => {
    expect(TOOLS.length).toBeGreaterThan(0)
  })

  it('has unique ids', () => {
    expect(toolIds.size).toBe(TOOLS.length)
  })

  it('uses kebab-case ids', () => {
    for (const t of TOOLS) expect(t.id, t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s has all required fields', (_id, t) => {
    for (const key of ['name', 'shortName', 'description', 'guidingQuestion', 'preambulo', 'estimatedTime'] as const) {
      expect(typeof t[key], key).toBe('string')
      expect(t[key].trim().length, key).toBeGreaterThan(0)
    }
    expect(Array.isArray(t.outputs)).toBe(true)
    expect(t.outputs.length).toBeGreaterThan(0)
    expect(Number.isInteger(t.stepNumber)).toBe(true)
    // Stage-0 pre-steps use -1 and 0 (rendered as stepNumber + 1).
    expect(t.stepNumber).toBeGreaterThanOrEqual(-1)
    expect(t.estimatedTime).toMatch(/\d+\s*min/)
  })

  it('every tool has a valid stage with matching stage metadata', () => {
    for (const t of TOOLS) {
      expect(STAGES, t.id).toContain(t.stage)
      const meta = STAGE_META[t.stage]
      expect(t.stageName, t.id).toBe(meta.name)
      expect(t.stageColor, t.id).toBe(meta.color)
      expect(t.stageBg, t.id).toBe(meta.bg)
      expect(t.stageBorder, t.id).toBe(meta.border)
    }
  })

  it('every tool has a known category', () => {
    for (const t of TOOLS) expect(CATEGORIES, t.id).toContain(t.category)
  })

  it('feedsInto only references existing tools (and never itself)', () => {
    for (const t of TOOLS) {
      for (const target of t.feedsInto ?? []) {
        expect(toolIds.has(target), `${t.id} -> ${target}`).toBe(true)
        expect(target).not.toBe(t.id)
      }
    }
  })

  it('stepNumbers are unique', () => {
    const steps = TOOLS.map((t) => t.stepNumber)
    expect(new Set(steps).size).toBe(steps.length)
  })

  it('stepNumbers never decrease from one stage to the next', () => {
    for (const s of [1, 2, 3, 4] as const) {
      const prevMax = Math.max(...TOOLS_BY_STAGE[(s - 1) as 0 | 1 | 2 | 3].map((t) => t.stepNumber))
      const curMin = Math.min(...TOOLS_BY_STAGE[s].map((t) => t.stepNumber))
      expect(curMin, `stage ${s}`).toBeGreaterThan(prevMax)
    }
  })

  it('at most one featured tool per stage', () => {
    for (const s of STAGES) {
      expect(TOOLS_BY_STAGE[s].filter((t) => t.featured).length, `stage ${s}`).toBeLessThanOrEqual(1)
    }
  })
})

describe('STAGE_META', () => {
  it('defines all five stages with name, color and advice', () => {
    for (const s of STAGES) {
      expect(STAGE_META[s].name.length).toBeGreaterThan(0)
      expect(STAGE_META[s].color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(STAGE_META[s].phaseAdvice.length).toBeGreaterThan(0)
    }
  })
})

describe('TOOLS_BY_STAGE', () => {
  it('partitions TOOLS exactly by stage', () => {
    const total = STAGES.reduce<number>((n, s) => n + TOOLS_BY_STAGE[s].length, 0)
    expect(total).toBe(TOOLS.length)
    for (const s of STAGES) {
      for (const t of TOOLS_BY_STAGE[s]) expect(t.stage).toBe(s)
    }
  })

  it('every stage has at least one tool', () => {
    for (const s of STAGES) expect(TOOLS_BY_STAGE[s].length, `stage ${s}`).toBeGreaterThan(0)
  })
})

describe('transversal tools', () => {
  it('TRANSVERSAL_TOOLS are exactly the tools flagged transversal', () => {
    expect(TRANSVERSAL_TOOLS.map((t) => t.id).sort()).toEqual(TOOLS.filter((t) => t.transversal).map((t) => t.id).sort())
  })

  it('every TRANSVERSAL_PREAMBULOS key is a real tool with a preambulo for stages 1-4', () => {
    for (const [id, byStage] of Object.entries(TRANSVERSAL_PREAMBULOS)) {
      expect(toolIds.has(id), id).toBe(true)
      for (const s of [1, 2, 3, 4] as const) expect(byStage[s]?.length, `${id} stage ${s}`).toBeGreaterThan(0)
    }
  })

  it('getTransversalToolsForStage tags each tool with the requested stage', () => {
    const list = getTransversalToolsForStage(3)
    expect(list).toHaveLength(TRANSVERSAL_TOOLS.length)
    for (const t of list) expect(t.transversalStage).toBe(3)
  })

  it('getTransversalPreambulo returns stage text or undefined', () => {
    expect(getTransversalPreambulo('lean-canvas', 2)).toBe(TRANSVERSAL_PREAMBULOS['lean-canvas'][2])
    expect(getTransversalPreambulo('does-not-exist', 2)).toBeUndefined()
  })
})

describe('getToolById', () => {
  it('finds existing tools and returns undefined otherwise', () => {
    const first = TOOLS[0]
    expect(getToolById(first.id)).toBe(first)
    expect(getToolById('nope')).toBeUndefined()
  })
})

describe('TOOL_TO_PROFILE_MAP', () => {
  it('only maps tools that exist in the catalog', () => {
    for (const id of Object.keys(TOOL_TO_PROFILE_MAP)) expect(toolIds.has(id), id).toBe(true)
  })

  it('traction-validation coerces numbers and derives has_paying_customers', () => {
    const fn = TOOL_TO_PROFILE_MAP['traction-validation']
    expect(fn({ payingCustomers: '12', mrr: '4500' })).toEqual({
      has_paying_customers: true,
      paying_customers_count: 12,
      monthly_revenue: 4500,
    })
    expect(fn({ payingCustomers: 'abc' })).toEqual({
      has_paying_customers: false,
      paying_customers_count: 0,
      monthly_revenue: 0,
    })
  })

  it('passion-purpose counts team members only when it is an array', () => {
    const fn = TOOL_TO_PROFILE_MAP['passion-purpose']
    expect(fn({ teamMembers: [{}, {}, {}] })).toEqual({ team_size: 3 })
    expect(fn({ teamMembers: 'x' })).toEqual({ team_size: undefined })
  })

  it('ltv-unit-economics and pricing-framework pass through fields', () => {
    expect(TOOL_TO_PROFILE_MAP['ltv-unit-economics']({ ltv: 900, cac: 300 })).toEqual({ ltv: 900, cac: 300 })
    expect(TOOL_TO_PROFILE_MAP['pricing-framework']({ selectedModel: 'saas' })).toEqual({ revenue_model: 'saas' })
  })
})
