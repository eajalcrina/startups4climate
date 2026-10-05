'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import { ToolSection, ToolProgress, ToolActionBar, inputStyle, labelStyle, btnSmall } from './shared'

interface KeyResult {
  [key: string]: unknown
  description: string
  target: number
  current: number
  unit: string
}

interface Objective {
  [key: string]: unknown
  title: string
  key_results: KeyResult[]
}

interface Data {
  [key: string]: unknown
  quarter: string
  year: number
  objectives: Objective[]
}

const currentYear = new Date().getFullYear()

const DEFAULT: Data = {
  quarter: 'Q1',
  year: currentYear,
  objectives: [
    {
      title: '',
      key_results: [{ description: '', target: 100, current: 0, unit: '%' }],
    },
  ],
}

const progressColor = (pct: number) => {
  if (pct >= 70) return '#1F77F6'
  if (pct >= 40) return '#2A222B'
  return '#DC2626'
}

const ACCENT = '#1F77F6'

const krProgress = (kr: KeyResult) => {
  if (kr.target === 0) return 0
  return Math.min(Math.round((kr.current / kr.target) * 100), 100)
}

const objectiveScore = (obj: Objective) => {
  if (obj.key_results.length === 0) return 0
  const total = obj.key_results.reduce((sum, kr) => sum + krProgress(kr), 0)
  return Math.round(total / obj.key_results.length)
}

export default function OKRTracker({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'okr-tracker', DEFAULT)
  const [saved, setSaved] = useState(false)

  const overallScore = useMemo(() => {
    if (data.objectives.length === 0) return 0
    const total = data.objectives.reduce((sum, obj) => sum + objectiveScore(obj), 0)
    return Math.round(total / data.objectives.length)
  }, [data.objectives])

  const updateObjectiveTitle = (i: number, title: string) => {
    setData(p => {
      const objectives = [...p.objectives]
      objectives[i] = { ...objectives[i], title }
      return { ...p, objectives }
    })
  }

  const updateKR = (objIdx: number, krIdx: number, field: keyof KeyResult, value: string | number) => {
    setData(p => {
      const objectives = [...p.objectives]
      const krs = [...objectives[objIdx].key_results]
      krs[krIdx] = { ...krs[krIdx], [field]: value }
      objectives[objIdx] = { ...objectives[objIdx], key_results: krs }
      return { ...p, objectives }
    })
  }

  const addObjective = () => setData(p => ({
    ...p,
    objectives: [...p.objectives, { title: '', key_results: [{ description: '', target: 100, current: 0, unit: '%' }] }],
  }))

  const removeObjective = (i: number) => setData(p => ({ ...p, objectives: p.objectives.filter((_, idx) => idx !== i) }))

  const addKR = (objIdx: number) => {
    setData(p => {
      const objectives = [...p.objectives]
      objectives[objIdx] = {
        ...objectives[objIdx],
        key_results: [...objectives[objIdx].key_results, { description: '', target: 100, current: 0, unit: '%' }],
      }
      return { ...p, objectives }
    })
  }

  const removeKR = (objIdx: number, krIdx: number) => {
    setData(p => {
      const objectives = [...p.objectives]
      objectives[objIdx] = {
        ...objectives[objIdx],
        key_results: objectives[objIdx].key_results.filter((_, i) => i !== krIdx),
      }
      return { ...p, objectives }
    })
  }

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  // Progress: count objectives with title filled
  const filledSections = data.objectives.filter(obj => obj.title.trim()).length + (data.quarter ? 1 : 0)
  const totalSections = data.objectives.length + 1

  const handleReport = () => {
    const content = `
OKR TRACKER — ${data.quarter} ${data.year}

SCORE GENERAL: ${overallScore}%

${data.objectives.map((obj, i) => `OBJETIVO ${i + 1}: ${obj.title || '(Sin título)'} — Score: ${objectiveScore(obj)}%
${obj.key_results.map((kr, j) => `  KR ${j + 1}: ${kr.description || '(Sin descripción)'}
    Progreso: ${kr.current}/${kr.target} ${kr.unit} (${krProgress(kr)}%)`).join('\n')}`).join('\n\n')}
    `.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledSections} total={totalSections} accentColor={ACCENT} />

      {/* Quarter selector */}
      <ToolSection
        number={1}
        title="Período y contexto"
        subtitle="Define el trimestre y año para tus OKRs"
        insight="Los OKRs no son una lista de tareas. Son compromisos ambiciosos y medibles que alinean a todo el equipo."
        insightSource="John Doerr, Measure What Matters"
        defaultOpen
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Trimestre</label>
            <select value={data.quarter} onChange={e => setData(p => ({ ...p, quarter: e.target.value }))} style={{ ...inputStyle, width: 'auto' }}>
              {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Año</label>
            <input type="number" value={data.year || ''} onChange={e => setData(p => ({ ...p, year: Number(e.target.value) }))} placeholder="2026" style={{ ...inputStyle, width: 100 }} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={labelStyle}>Score general:</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.5rem', fontWeight: 700, color: progressColor(overallScore) }}>{overallScore}%</span>
          </div>
        </div>
      </ToolSection>

      {/* Objectives */}
      {data.objectives.map((obj, objIdx) => {
        const score = objectiveScore(obj)
        return (
          <ToolSection
            key={objIdx}
            number={objIdx + 2}
            title={`Objetivo ${objIdx + 1}${obj.title ? ': ' + obj.title : ''}`}
            subtitle={`Score: ${score}%`}
            accentColor={ACCENT}
          >
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <input value={obj.title} onChange={e => updateObjectiveTitle(objIdx, e.target.value)} placeholder="Título del objetivo" style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
              {data.objectives.length > 1 && (
                <button onClick={() => removeObjective(objIdx)} style={{ ...btnSmall, color: '#DC2626', borderColor: '#DC262630' }}><Trash2 size={12} /> Eliminar</button>
              )}
            </div>

            {obj.key_results.map((kr, krIdx) => {
              const pct = krProgress(kr)
              return (
                <div key={krIdx} style={{ padding: '0.75rem', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: '0.625rem', background: 'var(--color-bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Key Result {krIdx + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 700, color: progressColor(pct) }}>{pct}%</span>
                      {obj.key_results.length > 1 && (
                        <button onClick={() => removeKR(objIdx, krIdx)} style={{ ...btnSmall, color: '#DC2626', borderColor: '#DC262630', padding: '0.2rem 0.4rem' }}><Trash2 size={10} /></button>
                      )}
                    </div>
                  </div>
                  <input value={kr.description} onChange={e => updateKR(objIdx, krIdx, 'description', e.target.value)} placeholder="Descripción del key result" style={{ ...inputStyle, marginBottom: '0.5rem' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>Meta</label>
                      <input type="number" value={kr.target || ''} onChange={e => updateKR(objIdx, krIdx, 'target', Number(e.target.value))} placeholder="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>Actual</label>
                      <input type="number" value={kr.current || ''} onChange={e => updateKR(objIdx, krIdx, 'current', Number(e.target.value))} placeholder="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>Unidad</label>
                      <input value={kr.unit} onChange={e => updateKR(objIdx, krIdx, 'unit', e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--color-bg-muted)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: progressColor(pct), transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
            <button onClick={() => addKR(objIdx)} style={{ ...btnSmall, color: ACCENT, borderColor: `${ACCENT}30` }}><Plus size={12} /> Agregar Key Result</button>
          </ToolSection>
        )
      })}

      <button onClick={addObjective} style={{ ...btnSmall, color: ACCENT, borderColor: `${ACCENT}30`, padding: '0.625rem 1rem', fontSize: '0.8125rem', alignSelf: 'flex-start' }}><Plus size={14} /> Agregar objetivo</button>

      <ToolActionBar onSave={handleSave} onComplete={onComplete} onReport={handleReport} saved={saved} accentColor={ACCENT} />
    </div>
  )
}
