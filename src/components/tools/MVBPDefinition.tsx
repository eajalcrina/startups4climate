'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import { ToolSection, ToolActionBar, ToolProgress, inputStyle, textareaStyle, btnSmall } from './shared'

interface Data {
  nombre: string
  featuresIncluidas: string[]
  featuresExcluidas: string[]
  criterioExito: string
  timeline: string
  recursos: string
}

const DEFAULT: Data = {
  nombre: '',
  featuresIncluidas: [''],
  featuresExcluidas: [''],
  criterioExito: '',
  timeline: '',
  recursos: '',
}

export default function MVBPDefinition({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'mvbp-definition', DEFAULT)
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const updateList = (field: 'featuresIncluidas' | 'featuresExcluidas', i: number, v: string) => {
    setData(p => { const list = [...p[field]]; list[i] = v; return { ...p, [field]: list } })
  }
  const addToList = (field: 'featuresIncluidas' | 'featuresExcluidas') => setData(p => ({ ...p, [field]: [...p[field], ''] }))
  const removeFromList = (field: 'featuresIncluidas' | 'featuresExcluidas', i: number) => setData(p => ({ ...p, [field]: p[field].filter((_, idx) => idx !== i) }))

  /* ── Progress ── */
  const fields = [data.nombre, data.criterioExito, data.timeline, data.recursos]
  const listsFilled = [
    data.featuresIncluidas.some(f => f.trim()),
    data.featuresExcluidas.some(f => f.trim()),
  ]
  const filled = fields.filter(f => f.trim()).length + listsFilled.filter(Boolean).length
  const total = 6

  const handleReport = () => {
    const content = `
DEFINICIÓN DEL MVBP

NOMBRE DEL MVBP: ${data.nombre || '(No completado)'}

FEATURES INCLUIDAS:
${data.featuresIncluidas.filter(f => f.trim()).map((f, i) => `${i + 1}. ${f}`).join('\n') || '(No completado)'}

FEATURES EXCLUIDAS:
${data.featuresExcluidas.filter(f => f.trim()).map((f, i) => `${i + 1}. ${f}`).join('\n') || '(No completado)'}

CRITERIO DE ÉXITO MÍNIMO:
${data.criterioExito || '(No completado)'}

TIMELINE DE DESARROLLO:
${data.timeline || '(No completado)'}

RECURSOS NECESARIOS:
${data.recursos || '(No completado)'}
    `.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filled} total={total} accentColor="#1F77F6" />

      <ToolSection
        number={1}
        title="Nombre del MVBP"
        subtitle="Define la identidad de tu producto mínimo viable de negocio"
        insight="Tu MVBP (Minimum Viable Business Product) no es el producto con menos features — es el producto más pequeño por el que alguien pagaría."
        insightSource="MIT Disciplined Entrepreneurship, Step 16"
        defaultOpen
      >
        <input value={data.nombre} onChange={e => setData(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre o versión del producto mínimo viable de negocio" style={inputStyle} />
      </ToolSection>

      <ToolSection number={2} title="Features incluidas" subtitle="Lo esencial que debe tener tu MVBP">
        {data.featuresIncluidas.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 6, borderRadius: 3, background: '#1F77F6', flexShrink: 0, marginTop: '0.5rem', marginBottom: '0.5rem' }} />
            <input value={f} onChange={e => updateList('featuresIncluidas', i, e.target.value)} placeholder={`Feature incluida ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
            {data.featuresIncluidas.length > 1 && (
              <button onClick={() => removeFromList('featuresIncluidas', i)} style={{ ...btnSmall, color: '#DC2626', border: '1px solid #DC262630' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => addToList('featuresIncluidas')} style={{ ...btnSmall, color: '#1F77F6', border: '1px solid #1F77F630' }}>
          <Plus size={14} /> Agregar feature
        </button>
      </ToolSection>

      <ToolSection number={3} title="Features excluidas" subtitle="Lo que deliberadamente dejas fuera">
        {data.featuresExcluidas.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 6, borderRadius: 3, background: '#DC2626', flexShrink: 0, marginTop: '0.5rem', marginBottom: '0.5rem' }} />
            <input value={f} onChange={e => updateList('featuresExcluidas', i, e.target.value)} placeholder={`Feature excluida ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
            {data.featuresExcluidas.length > 1 && (
              <button onClick={() => removeFromList('featuresExcluidas', i)} style={{ ...btnSmall, color: '#DC2626', border: '1px solid #DC262630' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => addToList('featuresExcluidas')} style={{ ...btnSmall, color: '#DC2626', border: '1px solid #DC262630' }}>
          <Plus size={14} /> Agregar feature
        </button>
      </ToolSection>

      <ToolSection number={4} title="Criterio de éxito mínimo" subtitle="Define cuándo considerar exitoso el MVBP">
        <textarea value={data.criterioExito} onChange={e => setData(p => ({ ...p, criterioExito: e.target.value }))} placeholder="¿Qué debe lograr el MVBP para considerarse exitoso?" rows={4} style={textareaStyle} />
      </ToolSection>

      <ToolSection number={5} title="Timeline de desarrollo" subtitle="Hitos, plazos y sprints">
        <textarea value={data.timeline} onChange={e => setData(p => ({ ...p, timeline: e.target.value }))} placeholder="¿Cuál es el plan de desarrollo? Hitos, plazos, sprints..." rows={4} style={textareaStyle} />
      </ToolSection>

      <ToolSection number={6} title="Recursos necesarios" subtitle="Equipo, herramientas y presupuesto">
        <textarea value={data.recursos} onChange={e => setData(p => ({ ...p, recursos: e.target.value }))} placeholder="¿Qué recursos necesitas? Equipo, herramientas, presupuesto..." rows={4} style={textareaStyle} />
      </ToolSection>

      <ToolActionBar onSave={handleSave} onComplete={onComplete} onReport={handleReport} saved={saved} />
    </div>
  )
}
