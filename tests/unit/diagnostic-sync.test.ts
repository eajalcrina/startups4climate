import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyDiagnosticToProfile, normalizeStage, normalizeVertical } from '@/lib/diagnostic-sync'
import { createFakeSupabase, hasOp, opArgs, type FakeResult, type RecordedQuery } from '../helpers/fake-supabase'

describe('normalizeVertical', () => {
  it('passes through values that already match the DB enum', () => {
    for (const v of ['fintech', 'healthtech', 'edtech', 'agritech_foodtech', 'cleantech_climatech', 'social_impact', 'other']) {
      expect(normalizeVertical(v)).toBe(v)
    }
  })

  it('maps DiagnosticForm Spanish labels to enum values', () => {
    expect(normalizeVertical('Agritech')).toBe('agritech_foodtech')
    expect(normalizeVertical('Cleantech / Energía')).toBe('cleantech_climatech')
    expect(normalizeVertical('Cleantech/Energía')).toBe('cleantech_climatech')
    expect(normalizeVertical('Cleantech / Energia')).toBe('cleantech_climatech')
    expect(normalizeVertical('Logística / Movilidad')).toBe('logistics_mobility')
    expect(normalizeVertical('Deep Tech')).toBe('biotech_deeptech')
    expect(normalizeVertical('Biotech')).toBe('biotech_deeptech')
    expect(normalizeVertical('Proptech')).toBe('other')
    expect(normalizeVertical('Otra')).toBe('other')
  })

  // Copy of `verticalOptions` in src/components/DiagnosticForm.tsx (not exported).
  // If a label is added there, it must be mapped here or it silently becomes "other".
  it('maps every DiagnosticForm dropdown label to a specific vertical', () => {
    const formLabels = ['Fintech', 'Healthtech', 'Edtech', 'Agritech', 'Cleantech / Energía', 'Logística / Movilidad', 'Biotech', 'Deep Tech']
    for (const label of formLabels) {
      expect(normalizeVertical(label), label).not.toBe('other')
    }
  })

  it('trims and lowercases input', () => {
    expect(normalizeVertical('  FinTech  ')).toBe('fintech')
  })

  it('falls back to "other" for empty or unknown values', () => {
    expect(normalizeVertical(null)).toBe('other')
    expect(normalizeVertical(undefined)).toBe('other')
    expect(normalizeVertical('')).toBe('other')
    expect(normalizeVertical('spacetech')).toBe('other')
  })
})

describe('normalizeStage', () => {
  it.each([
    [1, 'pre_incubation'],
    [2, 'incubation'],
    [3, 'acceleration'],
    [4, 'scaling'],
    ['1', 'pre_incubation'],
    ['Etapa 3', 'acceleration'],
    ['scaling', 'scaling'],
    [' INCUBATION ', 'incubation'],
  ])('maps %j to %s', (input, expected) => {
    expect(normalizeStage(input)).toBe(expected)
  })

  it.each([[0], [5], ['etapa 5'], ['seed'], [''], [null], [undefined]])('returns null for %j', (input) => {
    expect(normalizeStage(input)).toBeNull()
  })
})

describe('applyDiagnosticToProfile', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  type Db = {
    existingStartup?: { id: string; name: string; country: string | null } | null
    profileStartupName?: string | null
    profileUpdateError?: string
    upsertError?: string
  }

  function fakeDb(db: Db) {
    return createFakeSupabase((q: RecordedQuery): FakeResult => {
      if (q.table === 'profiles' && hasOp(q, 'update')) {
        return { error: db.profileUpdateError ? { message: db.profileUpdateError } : null }
      }
      if (q.table === 'startups' && hasOp(q, 'upsert')) {
        return { error: db.upsertError ? { message: db.upsertError } : null }
      }
      if (q.table === 'startups' && hasOp(q, 'select')) {
        return { data: db.existingStartup ?? null, error: null }
      }
      if (q.table === 'profiles' && hasOp(q, 'select')) {
        return { data: db.profileStartupName === undefined ? null : { startup_name: db.profileStartupName }, error: null }
      }
      throw new Error(`unexpected query on ${q.table}`)
    })
  }

  const payload = {
    total_score: 18,
    perfil_etapa: 3,
    dimension_scores: { madurez: 3, validacion: 3, impacto: 3, financiamiento: 3, equipo: 3, data_room: 3 },
    answers: { vertical: 'Agritech', country: 'Chile', nombre: 'Ana' },
  }

  it('rejects a missing userId without touching the DB', async () => {
    const fake = fakeDb({})
    expect(await applyDiagnosticToProfile(fake.client, '', payload)).toEqual({ ok: false, error: 'missing userId' })
    expect(fake.queries).toHaveLength(0)
  })

  it('updates the profile with stage, score and raw answers', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: 'EcoBio' })
    const res = await applyDiagnosticToProfile(fake.client, 'u1', payload)
    expect(res).toEqual({ ok: true })

    const [update] = fake.callsTo('profiles', 'update')
    expect(opArgs(update, 'update')).toEqual([
      { diagnostic_data: payload.answers, stage: 'acceleration', diagnostic_score: 18 },
    ])
    expect(opArgs(update, 'eq')).toEqual(['id', 'u1'])
  })

  it('inserts a new startup using profiles.startup_name and normalized fields', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: '  EcoBio Perú  ' })
    await applyDiagnosticToProfile(fake.client, 'u1', payload)

    const [upsert] = fake.callsTo('startups', 'upsert')
    expect(opArgs(upsert, 'upsert')).toEqual([
      {
        founder_id: 'u1',
        vertical: 'agritech_foodtech',
        country: 'Chile',
        diagnostic_answers: payload.answers,
        score_by_dimension: payload.dimension_scores,
        stage: 'acceleration',
        diagnostic_score: 18,
        name: 'EcoBio Perú',
      },
      { onConflict: 'founder_id' },
    ])
  })

  it('falls back to "Mi startup" when the profile has no startup name', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: '   ' })
    await applyDiagnosticToProfile(fake.client, 'u1', payload)
    const [upsert] = fake.callsTo('startups', 'upsert')
    expect((opArgs(upsert, 'upsert')?.[0] as Record<string, unknown>).name).toBe('Mi startup')
  })

  it('preserves the existing startup name and country when not provided', async () => {
    const fake = fakeDb({ existingStartup: { id: 's1', name: 'Nombre editado', country: 'Colombia' } })
    await applyDiagnosticToProfile(fake.client, 'u1', { ...payload, answers: { vertical: 'fintech' } })
    const row = opArgs(fake.callsTo('startups', 'upsert')[0], 'upsert')?.[0] as Record<string, unknown>
    expect(row.name).toBe('Nombre editado')
    expect(row.country).toBe('Colombia')
    // No profile lookup needed when the startup already exists.
    expect(fake.queries.filter((q) => q.table === 'profiles' && hasOp(q, 'select'))).toHaveLength(0)
  })

  it('defaults country to Perú when neither answers nor existing row has one', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: 'X' })
    await applyDiagnosticToProfile(fake.client, 'u1', { total_score: 8, perfil_etapa: 1, answers: {} })
    const row = opArgs(fake.callsTo('startups', 'upsert')[0], 'upsert')?.[0] as Record<string, unknown>
    expect(row.country).toBe('Perú')
    expect(row.vertical).toBe('other')
    expect(row.stage).toBe('pre_incubation')
  })

  it('omits stage and score when the payload does not provide valid ones', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: 'X' })
    await applyDiagnosticToProfile(fake.client, 'u1', { perfil_etapa: 'unknown', answers: {} })
    const profileRow = opArgs(fake.callsTo('profiles', 'update')[0], 'update')?.[0] as Record<string, unknown>
    expect(profileRow).not.toHaveProperty('stage')
    expect(profileRow).not.toHaveProperty('diagnostic_score')
    const startupRow = opArgs(fake.callsTo('startups', 'upsert')[0], 'upsert')?.[0] as Record<string, unknown>
    expect(startupRow).not.toHaveProperty('stage')
    expect(startupRow).not.toHaveProperty('diagnostic_score')
  })

  it('keeps a total_score of 0 (does not treat it as missing)', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: 'X' })
    await applyDiagnosticToProfile(fake.client, 'u1', { total_score: 0, answers: {} })
    const profileRow = opArgs(fake.callsTo('profiles', 'update')[0], 'update')?.[0] as Record<string, unknown>
    expect(profileRow.diagnostic_score).toBe(0)
  })

  it('continues to the startup upsert even if the profile update fails', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: 'X', profileUpdateError: 'rls' })
    const res = await applyDiagnosticToProfile(fake.client, 'u1', payload)
    expect(res.ok).toBe(true)
    expect(fake.callsTo('startups', 'upsert')).toHaveLength(1)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[S4C Sync]'), expect.anything())
  })

  it('reports failure when the startup upsert fails', async () => {
    const fake = fakeDb({ existingStartup: null, profileStartupName: 'X', upsertError: 'check constraint' })
    expect(await applyDiagnosticToProfile(fake.client, 'u1', payload)).toEqual({ ok: false, error: 'check constraint' })
  })

  it('is idempotent: same input produces identical writes', async () => {
    const a = fakeDb({ existingStartup: { id: 's1', name: 'A', country: null } })
    const b = fakeDb({ existingStartup: { id: 's1', name: 'A', country: null } })
    await applyDiagnosticToProfile(a.client, 'u1', payload)
    await applyDiagnosticToProfile(b.client, 'u1', payload)
    expect(a.queries).toEqual(b.queries)
  })
})
