/* ════════════════════════════════════════════════════════════════════
   Startups4Climate · Diagnostic scoring v2.1 (pure logic, no React)
   PRD: docs/diagnostico-cuestionario.md
   Used by src/components/DiagnosticForm.tsx.
   Score total: suma de P1+P2+P4+P5+P7+P9 (rango 6–23; P7 máx=3)
   ════════════════════════════════════════════════════════════════════ */

/* ─── Dropdown Options ─── */
export const verticalOptions = [
  'Fintech',
  'Healthtech',
  'Edtech',
  'Agritech',
  'Cleantech / Energía',
  'Logística / Movilidad',
  'Proptech',
  'Biotech',
  'Deep Tech',
  'Otra',
]

/* ─── Questions (v2.1 — 9 preguntas) ─── */
export type QType = 'score' | 'tag'
export interface QOption { value: string; label: string; score?: number }
export interface Question {
  id: string
  key: string // scores/tags key (madurez, validacion, ...)
  text: string
  subtitle: string
  tooltip: string
  type: QType
  options: QOption[]
}

export const questions: Question[] = [
  {
    id: 'P1',
    key: 'madurez',
    text: '¿En qué fase de desarrollo se encuentra tu startup hoy?',
    subtitle: 'Nivel de Madurez',
    tooltip: 'Esta pregunta nos ayuda a ubicarte en el mapa de etapas de una startup de impacto y calibrar el resto del diagnóstico.',
    type: 'score',
    options: [
      { value: 'idea', label: 'Idea o prueba de concepto inicial', score: 1 },
      { value: 'prototype', label: 'Prototipo funcional o MVP lanzado', score: 2 },
      { value: 'pilots', label: 'Pilotos con clientes o primeros usuarios activos', score: 3 },
      { value: 'revenue', label: 'Ingresos recurrentes y tracción demostrada', score: 4 },
    ],
  },
  {
    id: 'P2',
    key: 'validacion',
    text: '¿Cuál es el estado actual de la validación de tu mercado?',
    subtitle: 'Validación Comercial',
    tooltip: 'La validación comercial es uno de los indicadores más importantes para inversores y para saber si tu solución tiene demanda real.',
    type: 'score',
    options: [
      { value: 'discovery', label: 'Validando el problema mediante entrevistas', score: 1 },
      { value: 'lois', label: 'Tenemos cartas de intención o pilotos no pagados', score: 2 },
      { value: 'paid_pilots', label: 'Pilotos pagados o primeros ingresos iniciales', score: 3 },
      { value: 'recurring', label: 'Ingresos recurrentes demostrados o contratos firmados', score: 4 },
    ],
  },
  {
    id: 'P3',
    key: 'modelo_negocio',
    text: '¿Cuál es tu modelo de ingresos principal?',
    subtitle: 'Modelo de Negocio',
    tooltip: 'Conocer tu modelo de ingresos nos permite recomendarte herramientas y marcos de trabajo específicos para tu tipo de startup.',
    type: 'tag',
    options: [
      { value: 'saas', label: 'Suscripción (SaaS)' },
      { value: 'venta', label: 'Venta directa' },
      { value: 'marketplace', label: 'Marketplace / comisiones' },
      { value: 'freemium', label: 'Freemium' },
      { value: 'licencia', label: 'Licenciamiento' },
    ],
  },
  {
    id: 'P4',
    key: 'impacto',
    text: '¿Cómo mides el impacto positivo de tu startup?',
    subtitle: 'Medición de Impacto',
    tooltip: 'En Startups4Climate, el impacto climático verificable es un criterio clave para acceder a fondos, alianzas y programas especializados.',
    type: 'score',
    options: [
      { value: 'none', label: 'Aún no medimos o solo tenemos una narrativa cualitativa', score: 1 },
      { value: 'basic', label: 'Tenemos métricas básicas internas de impacto', score: 2 },
      { value: 'reported', label: 'Reportamos impacto regularmente a stakeholders o clientes', score: 3 },
      { value: 'verified', label: 'Contamos con verificación de terceros o certificaciones', score: 4 },
    ],
  },
  {
    id: 'P5',
    key: 'financiamiento',
    text: '¿Cuánto capital buscas levantar en los próximos 12-18 meses?',
    subtitle: 'Necesidad de Financiamiento',
    tooltip: 'El monto que buscas levantar define qué tipo de inversores son relevantes para ti y qué nivel de preparación necesitas.',
    type: 'score',
    options: [
      { value: 'bootstrap', label: 'Bootstrapping o menos de $250k', score: 1 },
      { value: 'seed', label: 'Entre $250k y $1.5M', score: 2 },
      { value: 'seriesA', label: 'Entre $1.5M y $5M', score: 3 },
      { value: 'seriesB', label: 'Más de $5M', score: 4 },
    ],
  },
  {
    id: 'P6',
    key: 'equipo_tamano',
    text: '¿Cuántas personas hay en tu equipo fundador?',
    subtitle: 'Equipo Fundador',
    tooltip: 'La composición del equipo fundador influye directamente en cómo priorizas recursos y qué brechas debes cubrir primero.',
    type: 'tag',
    options: [
      { value: 'solo', label: 'Solo founder' },
      { value: 'dos', label: '2 co-founders' },
      { value: 'tres', label: '3+ co-founders' },
      { value: 'completo', label: 'Equipo completo (>5)' },
    ],
  },
  {
    id: 'P7',
    key: 'equipo',
    text: '¿Cuál es el balance actual del equipo fundador?',
    subtitle: 'Composición del Equipo',
    tooltip: 'El balance entre perfiles técnicos y de negocio es uno de los factores que más peso tiene para inversores en etapas tempranas.',
    type: 'score',
    options: [
      { value: 'tech', label: 'Perfil 100% técnico/científico', score: 1 },
      { value: 'biz', label: 'Principalmente negocio, buscando expertise técnico', score: 2 },
      { value: 'balanced', label: 'Equilibrado entre perfil técnico y de negocios', score: 3 },
    ],
  },
  {
    id: 'P8',
    key: 'cuello_botella',
    text: '¿Cuál es tu principal obstáculo hoy?',
    subtitle: 'Cuello de Botella Operativo',
    tooltip: 'Identificar tu cuello de botella nos permite darte recomendaciones concretas y priorizadas para los próximos 30 días.',
    type: 'tag',
    options: [
      { value: 'pmf', label: 'Encontrar product-market fit' },
      { value: 'clientes', label: 'Conseguir clientes' },
      { value: 'operaciones', label: 'Optimizar operaciones y controlar costos' },
      { value: 'financiero', label: 'Estructurar financieramente' },
      { value: 'inversion', label: 'Levantar inversión' },
    ],
  },
  {
    id: 'P9',
    key: 'data_room',
    text: '¿Si un inversor te pidiera acceso a tu Data Room hoy, qué tan listo estás?',
    subtitle: 'Preparación para Inversión',
    tooltip: 'La preparación para inversión no es solo tener un Pitch Deck. Este indicador mide el nivel de formalización de tu startup ante inversores profesionales.',
    type: 'score',
    options: [
      { value: 'none', label: 'No tenemos Data Room estructurado aún', score: 1 },
      { value: 'basic', label: 'Tenemos Pitch Deck básico y proyecciones a 12 meses', score: 2 },
      { value: 'ready', label: 'Modelo financiero y aspectos legales listos', score: 3 },
      { value: 'full', label: 'Todo lo anterior + métricas de tracción y auditorías listas', score: 4 },
    ],
  },
]

/* ─── Profiles (v2.1 rangos — base 23) ─── */
export interface Profile {
  range: [number, number]
  etapa: 1 | 2 | 3 | 4
  name: string
  tag: string
  emoji: string
  color: string
  description: string
}
export const profiles: Profile[] = [
  {
    range: [6, 11],
    etapa: 1,
    name: 'ETAPA 1: Pre-incubación',
    tag: 'Ideación',
    emoji: '🌱',
    color: '#DA4E24',
    description: 'Las startups en esta etapa están explorando un problema real y construyendo las bases de su solución. El foco debe estar en validar supuestos con usuarios reales antes de invertir recursos en desarrollo. Es normal no tener ingresos ni equipo completo aún — lo más valioso es la claridad del problema que resuelven.',
  },
  {
    range: [12, 16],
    etapa: 2,
    name: 'ETAPA 2: Incubación',
    tag: 'Validación',
    emoji: '🔬',
    color: '#1F77F6',
    description: 'Las startups en Etapa 2 ya tienen una hipótesis validada y están construyendo sus primeros flujos de clientes. El principal desafío es encontrar el product-market fit y estructurar un modelo de ingresos sostenible. Típicamente operan con recursos limitados y el equipo fundador cubre múltiples roles simultáneamente.',
  },
  {
    range: [17, 20],
    etapa: 3,
    name: 'ETAPA 3: Aceleración',
    tag: 'Crecimiento',
    emoji: '🚀',
    color: '#F0721D',
    description: 'Las startups en Etapa 3 tienen tracción demostrada y están optimizando sus motores de crecimiento. El foco está en escalar lo que ya funciona, profesionalizar el equipo y preparar la estructura para levantar capital institucional. La eficiencia operativa y la medición de métricas clave son críticas en esta fase.',
  },
  {
    range: [21, 23],
    etapa: 4,
    name: 'ETAPA 4: Escalamiento',
    tag: 'Escala',
    emoji: '🌍',
    color: '#1F77F6',
    description: 'Las startups en Etapa 4 tienen un modelo de negocio probado y están escalando operaciones, mercados o líneas de producto. El acceso a capital de mayor volumen, la gobernanza corporativa y la consolidación del impacto medible son las prioridades de esta etapa.',
  },
]

export function classifyProfile(total: number): Profile {
  return profiles.find(p => total >= p.range[0] && total <= p.range[1]) || profiles[0]
}

/* ─── Adaptive warnings ─── */
export interface AdaptiveRule {
  id: 'ADAPT-01' | 'ADAPT-02' | 'ADAPT-03'
  qId: string
  message: string
  triggers: (scores: Record<string, number>, value: string) => boolean
}
export const ADAPTIVE_RULES: AdaptiveRule[] = [
  {
    id: 'ADAPT-01',
    qId: 'P2',
    message: 'Esta respuesta podría no ser consistente con la etapa de desarrollo que indicaste antes. ¿Quieres revisarla?',
    triggers: (s, v) => (s.madurez ?? 0) <= 2 && v === 'recurring',
  },
  {
    id: 'ADAPT-02',
    qId: 'P5',
    message: 'Buscar más de $1.5M en etapa de idea es poco común. Asegúrate de que esta cifra refleja tu plan real de levantamiento.',
    triggers: (s, v) => (s.madurez ?? 0) === 1 && (v === 'seriesA' || v === 'seriesB'),
  },
  {
    id: 'ADAPT-03',
    qId: 'P9',
    message: 'Esta opción es más común en startups con tracción demostrada. Si la seleccionas, explícanos más en tu sesión estratégica.',
    triggers: (s, v) => (s.madurez ?? 0) <= 2 && v === 'full',
  },
]

/* ─── Inconsistencies ─── */
export type IncId = 'INC-01' | 'INC-02' | 'INC-03' | 'INC-04' | 'INC-05' | 'INC-06' | 'INC-07'
export const INC_MESSAGES: Record<IncId, string> = {
  'INC-01': 'Reportas ingresos recurrentes pero una etapa de desarrollo inicial. ¿Es posible que tu producto esté más avanzado de lo que indicaste, o que los ingresos sean de una actividad previa?',
  'INC-02': 'Tienes documentación de inversión avanzada pero tu producto está en etapa de idea. Esto puede ser positivo si vienes de otra startup, pero vale la pena alinearlo con un mentor.',
  'INC-03': 'Buscar más de $1.5M en etapa de idea requiere una tesis de inversión muy sólida. Asegúrate de que este número está respaldado por un modelo financiero claro.',
  'INC-04': 'Tienes un Data Room estructurado pero aún no has validado comercialmente. Esto puede ser una fortaleza si vienes de otra startup, o una señal de que estás sobre-documentando antes de validar.',
  'INC-05': 'Existe una brecha significativa entre la madurez de tu producto y tu validación comercial. ¿Estás construyendo sin hablar suficientemente con clientes, o validando sin tener producto?',
  'INC-06': 'Tu equipo es 100% técnico pero tiene documentación financiera avanzada. ¿Tienes un CFO o asesor financiero externo? Si no, considera incorporar uno.',
  'INC-07': 'Declaras que tu cuello de botella es la eficiencia operativa, pero tu startup aún no tiene ingresos demostrados. Es posible que el obstáculo real sea conseguir los primeros clientes antes de optimizar procesos.',
}

export function detectInconsistencies(scores: Record<string, number>, tags: Record<string, string>): IncId[] {
  const r: IncId[] = []
  if ((scores.madurez ?? 0) <= 2 && (scores.validacion ?? 0) === 4) r.push('INC-01')
  if ((scores.madurez ?? 0) === 1 && (scores.data_room ?? 0) >= 3) r.push('INC-02')
  if ((scores.madurez ?? 0) === 1 && (scores.financiamiento ?? 0) >= 3) r.push('INC-03')
  if ((scores.validacion ?? 0) <= 1 && (scores.data_room ?? 0) === 4) r.push('INC-04')
  if (Math.abs((scores.madurez ?? 0) - (scores.validacion ?? 0)) >= 3) r.push('INC-05')
  if ((scores.equipo ?? 0) === 1 && (scores.data_room ?? 0) >= 3) r.push('INC-06')
  if (tags.cuello_botella === 'operaciones' && (scores.madurez ?? 0) <= 2) r.push('INC-07')
  return r
}

/* ─── Totals ─── */
/** Score keys (dimensions) summed into the total, in display order. */
export const SCORE_KEYS = ['madurez', 'validacion', 'impacto', 'financiamiento', 'equipo', 'data_room'] as const
export type ScoreKey = (typeof SCORE_KEYS)[number]

/** Sum of every answered score question. */
export function computeTotalScore(scores: Record<string, number>): number {
  let total = 0
  Object.values(scores).forEach(v => { total += v || 0 })
  return total
}

/** Per-dimension scores as persisted in `diagnostics.dimension_scores` (0 = unanswered). */
export function buildDimensionScores(scores: Record<string, number>): Record<ScoreKey, number> {
  return {
    madurez: scores.madurez || 0,
    validacion: scores.validacion || 0,
    impacto: scores.impacto || 0,
    financiamiento: scores.financiamiento || 0,
    equipo: scores.equipo || 0,
    data_room: scores.data_room || 0,
  }
}

/* ─── Catálogo de herramientas ─── */
export const HERRAMIENTAS_POR_ETAPA: Record<number, string[]> = {
  1: ['Propósito & Equipo', 'Segmentación de Mercado', 'Mercado inicial', 'Perfil del Usuario'],
  2: ['Propuesta de Valor', 'Primeros 10 Clientes', 'Lean Canvas', 'Especificación de Producto'],
  3: ['Unit Economics', 'Proceso de Ventas', 'Modelo de Negocio', 'Framework de Pricing'],
  4: ['Pitch Deck', 'Cap Table', 'Plan de Producto', 'Validación de Tracción'],
}

export function mapToolByBottleneck(cb: string | undefined, etapa: number): string {
  const early = etapa <= 2
  switch (cb) {
    case 'pmf': return early ? 'Perfil del Usuario' : 'Validación de Tracción'
    case 'clientes': return early ? 'Primeros 10 Clientes' : 'Proceso de Ventas'
    case 'operaciones': return early ? 'Lean Canvas' : 'Unit Economics'
    case 'financiero': return early ? 'Lean Canvas' : 'Modelo de Negocio'
    case 'inversion': return early ? 'Propuesta de Valor' : 'Pitch Deck'
    default: return HERRAMIENTAS_POR_ETAPA[etapa][0]
  }
}
export function mapToolByRevenueModel(modelo: string | undefined, etapa: number): string {
  const list = HERRAMIENTAS_POR_ETAPA[etapa]
  switch (modelo) {
    case 'saas': return list.includes('Unit Economics') ? 'Unit Economics' : list[0]
    case 'venta': return list.includes('Proceso de Ventas') ? 'Proceso de Ventas' : 'Primeros 10 Clientes'
    case 'marketplace': return list.includes('Modelo de Negocio') ? 'Modelo de Negocio' : 'Lean Canvas'
    case 'freemium': return list.includes('Framework de Pricing') ? 'Framework de Pricing' : 'Propuesta de Valor'
    case 'licencia': return list.includes('Cap Table') ? 'Cap Table' : 'Propuesta de Valor'
    default: return list[1] || list[0]
  }
}
