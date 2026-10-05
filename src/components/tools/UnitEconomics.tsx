'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import { ToolSection, ToolActionBar, ToolProgress, labelStyle } from './shared'

const DEFAULT_INPUTS: Record<string, string> = {
  revenuePerClient: '50000',
  cogsPerUnit: '15000',
  installationCost: '8000',
  salesCycleMonths: '9',
  churnRateAnnual: '8',
  fossilAlternativePrice: '45000',
  marketingCostPerLead: '500',
  conversionRate: '10',
}

const ACCENT = '#1F77F6'

export default function UnitEconomics({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [inputs, setInputs] = useToolState(userId, 'unit-economics', DEFAULT_INPUTS)
  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: e.target.value }))

  const calc = useMemo(() => {
    const rev = parseFloat(inputs.revenuePerClient) || 0
    const cogs = parseFloat(inputs.cogsPerUnit) || 0
    const install = parseFloat(inputs.installationCost) || 0
    const cycle = parseFloat(inputs.salesCycleMonths) || 1
    const churn = parseFloat(inputs.churnRateAnnual) / 100 || 0.1
    const fossil = parseFloat(inputs.fossilAlternativePrice) || 0
    const mktg = parseFloat(inputs.marketingCostPerLead) || 0
    const conv = parseFloat(inputs.conversionRate) / 100 || 0.1

    const cac = (mktg / conv) + (rev * (cycle / 12) * 0.2)
    const grossMargin = rev - cogs
    const grossMarginPct = rev > 0 ? (grossMargin / rev) * 100 : 0
    const ltv = rev > 0 ? grossMargin / churn : 0
    const ltvCacRatio = cac > 0 ? ltv / cac : 0
    const paybackMonths = grossMargin > 0 ? (cac / (grossMargin / 12)) : 0
    const greenPremium = fossil > 0 ? ((rev - fossil) / fossil) * 100 : 0
    const parityGap = rev - fossil

    // suppress unused var
    void install

    return {
      cac: Math.round(cac),
      grossMargin: Math.round(grossMargin),
      grossMarginPct: Math.round(grossMarginPct),
      ltv: Math.round(ltv),
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      paybackMonths: Math.round(paybackMonths),
      greenPremium: Math.round(greenPremium * 10) / 10,
      parityGap: Math.round(parityGap),
    }
  }, [inputs])

  /* Progress: count non-empty input fields */
  const filledCount = Object.values(inputs).filter(v => v.trim().length > 0).length
  const totalFields = Object.keys(DEFAULT_INPUTS).length

  const handleReport = () => {
    const content = `
UNIT ECONOMICS & GREEN PREMIUM

Entradas del Modelo:
  Ingresos por cliente (anual): $${parseInt(inputs.revenuePerClient).toLocaleString('es')}
  COGS por unidad: $${parseInt(inputs.cogsPerUnit).toLocaleString('es')}
  Costo de instalaci\u00f3n: $${parseInt(inputs.installationCost).toLocaleString('es')}
  Ciclo de ventas: ${inputs.salesCycleMonths} meses
  Churn rate anual: ${inputs.churnRateAnnual}%
  Precio alternativa f\u00f3sil: $${parseInt(inputs.fossilAlternativePrice).toLocaleString('es')}
  Costo de marketing por lead: $${parseInt(inputs.marketingCostPerLead).toLocaleString('es')}
  Tasa de conversi\u00f3n: ${inputs.conversionRate}%

Resultados:

Customer Acquisition Cost (CAC): $${calc.cac.toLocaleString('es')}
Margen Bruto por cliente: $${calc.grossMargin.toLocaleString('es')} (${calc.grossMarginPct}%)
Lifetime Value (LTV): $${calc.ltv.toLocaleString('es')}
Ratio LTV/CAC: ${calc.ltvCacRatio}x ${calc.ltvCacRatio >= 3 ? '\u2713 Saludable (\u22653x)' : calc.ltvCacRatio >= 1 ? '\u26a0 Mejorable (<3x)' : '\u2717 Cr\u00edtico (<1x)'}
Payback Period: ${calc.paybackMonths} meses ${calc.paybackMonths <= 18 ? '\u2713 Saludable (\u226418m)' : '\u26a0 Largo (>18m)'}

Green Premium: ${calc.greenPremium > 0 ? '+' : ''}${calc.greenPremium}% vs. alternativa f\u00f3sil
  ${calc.parityGap > 0 ? `Tu soluci\u00f3n cuesta $${Math.abs(calc.parityGap).toLocaleString('es')} m\u00e1s que la alternativa f\u00f3sil. Cuantifica el valor de las externalidades positivas (reducci\u00f3n de CO2, subsidios, incentivos).` : `Tu soluci\u00f3n ya est\u00e1 en paridad o por debajo de la alternativa f\u00f3sil. Ventaja competitiva demostrada.`}

Recomendaciones:
${calc.ltvCacRatio < 3 ? '  \u2192 Optimiza tu proceso de ventas o reduce costo de adquisici\u00f3n con referidos y partnerships.' : '  \u2192 Ratio LTV/CAC saludable. Considera invertir m\u00e1s en ventas para escalar.'}
${calc.paybackMonths > 18 ? '  \u2192 Considera modelo HaaS/PPA para reducir la inversi\u00f3n inicial del cliente y acelerar el ciclo.' : '  \u2192 Payback period competitivo. Usa este dato como argumento de venta.'}
${calc.greenPremium > 15 ? '  \u2192 Green premium alto. Cuantifica CO2 reducido y busca contratos con empresas con compromisos net-zero.' : '  \u2192 Trabaja hacia paridad de precio para desbloquear mercados masivos sin depender del premium verde.'}
    `.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledCount} total={totalFields} accentColor={ACCENT} />

      <ToolSection
        number={1}
        title="Par\u00e1metros del modelo"
        subtitle="Define las variables de tu unit economics"
        insight="Si tu LTV/CAC ratio es menor a 3:1, est\u00e1s quemando cash m\u00e1s r\u00e1pido de lo que generas valor."
        insightSource="Stanford GSB, Venture Capital"
        defaultOpen
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <NumberInput label="Ingresos anuales por cliente (USD)" value={inputs.revenuePerClient} onChange={set('revenuePerClient')} prefix="$" />
          <NumberInput label="COGS por unidad (USD)" value={inputs.cogsPerUnit} onChange={set('cogsPerUnit')} prefix="$" hint="Costo de fabricaci\u00f3n/instalaci\u00f3n por cliente" />
          <NumberInput label="Costo de instalaci\u00f3n (USD)" value={inputs.installationCost} onChange={set('installationCost')} prefix="$" />
          <NumberInput label="Ciclo de ventas (meses)" value={inputs.salesCycleMonths} onChange={set('salesCycleMonths')} suffix="meses" />
          <NumberInput label="Churn rate anual (%)" value={inputs.churnRateAnnual} onChange={set('churnRateAnnual')} suffix="%" />
          <NumberInput label="Precio alternativa f\u00f3sil (USD/a\u00f1o)" value={inputs.fossilAlternativePrice} onChange={set('fossilAlternativePrice')} prefix="$" hint="Costo del servicio equivalente con tecnolog\u00eda convencional" />
          <NumberInput label="Costo de marketing por lead (USD)" value={inputs.marketingCostPerLead} onChange={set('marketingCostPerLead')} prefix="$" />
          <NumberInput label="Tasa de conversi\u00f3n lead \u2192 cliente (%)" value={inputs.conversionRate} onChange={set('conversionRate')} suffix="%" />
        </div>
      </ToolSection>

      <ToolSection
        number={2}
        title="Resultados"
        subtitle="M\u00e9tricas calculadas autom\u00e1ticamente"
        defaultOpen
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <MetricCard label="Customer Acquisition Cost" value={`$${calc.cac.toLocaleString('es')}`} sub="Costo de adquirir un cliente" color={ACCENT} />
          <MetricCard label="Margen Bruto" value={`$${calc.grossMargin.toLocaleString('es')}`} sub={`${calc.grossMarginPct}% sobre ingresos`} color={calc.grossMarginPct > 50 ? ACCENT : '#2A222B'} />
          <MetricCard label="Lifetime Value (LTV)" value={`$${calc.ltv.toLocaleString('es')}`} sub="Valor total del cliente" color="#DA4E24" />

          {/* LTV/CAC Ratio */}
          <div style={{
            background: 'var(--color-bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '1rem',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>LTV / CAC Ratio</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.75rem', fontWeight: 700, color: calc.ltvCacRatio >= 3 ? ACCENT : calc.ltvCacRatio >= 1 ? '#2A222B' : '#DC2626' }}>
                {calc.ltvCacRatio}x
              </span>
              {calc.ltvCacRatio >= 3 ? <TrendingUp size={16} color={ACCENT} /> : <TrendingDown size={16} color="#2A222B" />}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {calc.ltvCacRatio >= 3 ? 'Saludable \u2014 objetivo \u22653x' : calc.ltvCacRatio >= 1 ? 'Mejorable \u2014 objetivo \u22653x' : 'Cr\u00edtico \u2014 revisar modelo'}
            </div>
            <div style={{ marginTop: '0.5rem', height: 4, borderRadius: 2, background: 'var(--color-border)' }}>
              <div style={{ height: '100%', borderRadius: 2, background: calc.ltvCacRatio >= 3 ? ACCENT : '#2A222B', width: `${Math.min(100, (calc.ltvCacRatio / 5) * 100)}%`, transition: 'width 0.6s' }} />
            </div>
          </div>

          {/* Green Premium */}
          <div style={{
            background: 'var(--color-bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '1rem',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Green Premium</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.75rem', fontWeight: 700, color: calc.greenPremium > 0 ? '#2A222B' : ACCENT }}>
              {calc.greenPremium > 0 ? '+' : ''}{calc.greenPremium}%
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {calc.greenPremium > 0 ? `$${Math.abs(calc.parityGap).toLocaleString('es')} sobre alternativa f\u00f3sil` : 'En paridad o por debajo del f\u00f3sil'}
            </div>
          </div>
        </div>
      </ToolSection>

      <ToolActionBar
        onSave={handleSave}
        onComplete={() => { handleReport(); onComplete() }}
        onReport={handleReport}
        saved={saved}
        accentColor={ACCENT}
      />
    </div>
  )
}

function NumberInput({ label, value, onChange, prefix, suffix, hint }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  prefix?: string; suffix?: string; hint?: string;
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ ...labelStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {label}
      </label>
      {hint && <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{hint}</div>}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 10,
        border: `1px solid ${focused ? ACCENT : 'var(--color-border)'}`,
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
        transition: 'border 0.15s',
        boxShadow: focused ? `0 0 0 2px ${ACCENT}14` : 'none',
      }}>
        {prefix && <span style={{ padding: '0 0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>{prefix}</span>}
        <input type="number" value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, padding: '0.5625rem 0.625rem', border: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none' }}
        />
        {suffix && <span style={{ padding: '0 0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', borderLeft: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'var(--color-bg-primary)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>{sub}</div>
    </div>
  )
}
