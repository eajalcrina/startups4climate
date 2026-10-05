'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import { ToolSection, ToolActionBar, ToolProgress, inputStyle, textareaStyle, btnSmall } from './shared'

interface PipelineStage { name: string; description: string; avgDays: number | string; conversionRate: number | string }

interface Data {
  [key: string]: unknown
  stages: PipelineStage[]
  kpis: string
  scripts: string
  herramientas: string
}

const emptyStage = (): PipelineStage => ({ name: '', description: '', avgDays: '', conversionRate: '' })

const DEFAULT: Data = {
  stages: [emptyStage()],
  kpis: '',
  scripts: '',
  herramientas: '',
}

const ACCENT = '#1F77F6'

export default function SalesProcessMap({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'sales-process-map', DEFAULT)
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const updateStage = (i: number, field: keyof PipelineStage, value: string) => {
    setData(p => { const s = [...p.stages]; s[i] = { ...s[i], [field]: value }; return { ...p, stages: s } })
  }
  const addStage = () => setData(p => ({ ...p, stages: [...p.stages, emptyStage()] }))
  const removeStage = (i: number) => setData(p => ({ ...p, stages: p.stages.filter((_, idx) => idx !== i) }))

  /* Progress: stages with name, kpis, scripts, herramientas = 4 sections */
  const sections = [
    data.stages.some(s => s.name.trim().length > 0),
    data.kpis.trim().length > 0,
    data.scripts.trim().length > 0,
    data.herramientas.trim().length > 0,
  ]
  const filled = sections.filter(Boolean).length

  const handleReport = () => {
    const content = `
MAPA DEL PROCESO DE VENTAS

ETAPAS DEL PIPELINE:
${data.stages.map((s, i) => `${i + 1}. ${s.name || '(Sin nombre)'}
   Descripci\u00f3n: ${s.description || '-'}
   D\u00edas promedio: ${s.avgDays || '-'}
   Tasa de conversi\u00f3n: ${s.conversionRate || '-'}%`).join('\n')}

KPIs DE VENTAS:
${data.kpis || '(No completado)'}

SCRIPTS/TEMPLATES POR ETAPA:
${data.scripts || '(No completado)'}

HERRAMIENTAS DE VENTAS UTILIZADAS:
${data.herramientas || '(No completado)'}
    `.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filled} total={4} accentColor={ACCENT} />

      <ToolSection
        number={1}
        title="Etapas del pipeline"
        subtitle="Define cada paso de tu proceso de venta"
        insight="Documenta cada paso de tu proceso de venta actual. Sin un proceso repetible, no puedes escalar."
        insightSource="Aaron Ross, Predictable Revenue"
        defaultOpen
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {data.stages.map((s, i) => (
            <div key={i} style={{
              padding: '1rem',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-primary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Etapa {i + 1}</span>
                {data.stages.length > 1 && (
                  <button onClick={() => removeStage(i)} style={{ ...btnSmall, color: '#DC2626', border: '1px solid #DC262630', padding: '0.25rem 0.5rem' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <input value={s.name} onChange={e => updateStage(i, 'name', e.target.value)} placeholder="Nombre de la etapa" style={{ ...inputStyle, marginBottom: '0.5rem' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem' }}>
                <input value={s.description} onChange={e => updateStage(i, 'description', e.target.value)} placeholder="Descripci\u00f3n" style={inputStyle} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input type="number" value={s.avgDays} onChange={e => updateStage(i, 'avgDays', e.target.value)} placeholder="0" style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>d\u00edas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input type="number" value={s.conversionRate} onChange={e => updateStage(i, 'conversionRate', e.target.value)} placeholder="0" style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>%</span>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addStage} style={{ ...btnSmall, color: ACCENT, border: `1px solid ${ACCENT}30`, gap: '0.375rem' }}>
            <Plus size={14} /> Agregar etapa
          </button>
        </div>
      </ToolSection>

      <ToolSection
        number={2}
        title="KPIs de ventas"
        subtitle="M\u00e9tricas clave que mides en tu proceso de ventas"
        accentColor={ACCENT}
      >
        <textarea
          value={data.kpis}
          onChange={e => setData(p => ({ ...p, kpis: e.target.value }))}
          placeholder="\u00bfQu\u00e9 m\u00e9tricas mides en ventas? Deal size, ciclo de venta, win rate..."
          rows={4}
          style={textareaStyle}
        />
      </ToolSection>

      <ToolSection
        number={3}
        title="Scripts/templates por etapa"
        subtitle="Materiales de venta que usas en cada paso"
        accentColor={ACCENT}
      >
        <textarea
          value={data.scripts}
          onChange={e => setData(p => ({ ...p, scripts: e.target.value }))}
          placeholder="Describe los scripts de venta, emails o presentaciones que usas en cada etapa"
          rows={4}
          style={textareaStyle}
        />
      </ToolSection>

      <ToolSection
        number={4}
        title="Herramientas de ventas utilizadas"
        subtitle="Tu stack de herramientas para ventas"
        accentColor={ACCENT}
      >
        <textarea
          value={data.herramientas}
          onChange={e => setData(p => ({ ...p, herramientas: e.target.value }))}
          placeholder="CRM, herramientas de email, video calls, propuestas... \u00bfQu\u00e9 stack usas?"
          rows={4}
          style={textareaStyle}
        />
      </ToolSection>

      <ToolActionBar
        onSave={handleSave}
        onComplete={onComplete}
        onReport={handleReport}
        saved={saved}
        accentColor={ACCENT}
      />
    </div>
  )
}
