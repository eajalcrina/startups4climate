'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Info, AlertTriangle, Sparkles, Target, Wrench, Mail, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { applyDiagnosticToProfile } from '@/lib/diagnostic-sync'

/* ════════════════════════════════════════════════════════════════════
   Startups4Climate · DiagnosticForm v2.1
   PRD: docs/diagnostico-cuestionario.md
   Flujo: Paso 0 (contacto) → P1..P9 → Paso 10 (loading) → Paso 11 (resultados)
   Score total: suma de P1+P2+P4+P5+P7+P9 (rango 6–23; P7 máx=3)
   ════════════════════════════════════════════════════════════════════ */

/* ─── Schema (Paso 0 — Datos de contacto) ─── */
const contactSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  startup_name: z.string().min(2, 'Nombre de startup requerido'),
  vertical: z.string().min(1, 'Selecciona vertical'),
  startup_description: z.string().min(10, 'Mínimo 10 caracteres'),
  phone: z.string().optional(),
  website: z.string().optional(),
  como_nos_conocio: z.string().optional(),
})

type ContactData = z.infer<typeof contactSchema>

/* ─── Dropdown Options ─── */
const verticalOptions = [
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

const comoNosConocioOptions = [
  'Redes sociales',
  'Recomendación de un amigo o colega',
  'Google / búsqueda web',
  'Evento o conferencia',
  'Prensa o medios',
  'Otro',
]

const phoneCountryOptions = [
  { name: 'México', flag: '\u{1F1F2}\u{1F1FD}', code: '+52' },
  { name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', code: '+54' },
  { name: 'Brasil', flag: '\u{1F1E7}\u{1F1F7}', code: '+55' },
  { name: 'Chile', flag: '\u{1F1E8}\u{1F1F1}', code: '+56' },
  { name: 'Colombia', flag: '\u{1F1E8}\u{1F1F4}', code: '+57' },
  { name: 'Perú', flag: '\u{1F1F5}\u{1F1EA}', code: '+51' },
  { name: 'Ecuador', flag: '\u{1F1EA}\u{1F1E8}', code: '+593' },
  { name: 'Bolivia', flag: '\u{1F1E7}\u{1F1F4}', code: '+591' },
  { name: 'Paraguay', flag: '\u{1F1F5}\u{1F1FE}', code: '+595' },
  { name: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', code: '+598' },
  { name: 'Venezuela', flag: '\u{1F1FB}\u{1F1EA}', code: '+58' },
  { name: 'Costa Rica', flag: '\u{1F1E8}\u{1F1F7}', code: '+506' },
  { name: 'Guatemala', flag: '\u{1F1EC}\u{1F1F9}', code: '+502' },
  { name: 'Honduras', flag: '\u{1F1ED}\u{1F1F3}', code: '+504' },
  { name: 'El Salvador', flag: '\u{1F1F8}\u{1F1FB}', code: '+503' },
  { name: 'Nicaragua', flag: '\u{1F1F3}\u{1F1EE}', code: '+505' },
  { name: 'Panamá', flag: '\u{1F1F5}\u{1F1E6}', code: '+507' },
]

/* ─── Questions (v2.1 — 9 preguntas) ─── */
type QType = 'score' | 'tag'
interface QOption { value: string; label: string; score?: number }
interface Question {
  id: string
  key: string // scores/tags key (madurez, validacion, ...)
  text: string
  subtitle: string
  tooltip: string
  type: QType
  options: QOption[]
}

const questions: Question[] = [
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
interface Profile {
  range: [number, number]
  etapa: 1 | 2 | 3 | 4
  name: string
  tag: string
  emoji: string
  color: string
  description: string
}
const profiles: Profile[] = [
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

function classifyProfile(total: number): Profile {
  return profiles.find(p => total >= p.range[0] && total <= p.range[1]) || profiles[0]
}

/* ─── Adaptive warnings ─── */
interface AdaptiveRule {
  id: 'ADAPT-01' | 'ADAPT-02' | 'ADAPT-03'
  qId: string
  message: string
  triggers: (scores: Record<string, number>, value: string) => boolean
}
const ADAPTIVE_RULES: AdaptiveRule[] = [
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
type IncId = 'INC-01' | 'INC-02' | 'INC-03' | 'INC-04' | 'INC-05' | 'INC-06' | 'INC-07'
const INC_MESSAGES: Record<IncId, string> = {
  'INC-01': 'Reportas ingresos recurrentes pero una etapa de desarrollo inicial. ¿Es posible que tu producto esté más avanzado de lo que indicaste, o que los ingresos sean de una actividad previa?',
  'INC-02': 'Tienes documentación de inversión avanzada pero tu producto está en etapa de idea. Esto puede ser positivo si vienes de otra startup, pero vale la pena alinearlo con un mentor.',
  'INC-03': 'Buscar más de $1.5M en etapa de idea requiere una tesis de inversión muy sólida. Asegúrate de que este número está respaldado por un modelo financiero claro.',
  'INC-04': 'Tienes un Data Room estructurado pero aún no has validado comercialmente. Esto puede ser una fortaleza si vienes de otra startup, o una señal de que estás sobre-documentando antes de validar.',
  'INC-05': 'Existe una brecha significativa entre la madurez de tu producto y tu validación comercial. ¿Estás construyendo sin hablar suficientemente con clientes, o validando sin tener producto?',
  'INC-06': 'Tu equipo es 100% técnico pero tiene documentación financiera avanzada. ¿Tienes un CFO o asesor financiero externo? Si no, considera incorporar uno.',
  'INC-07': 'Declaras que tu cuello de botella es la eficiencia operativa, pero tu startup aún no tiene ingresos demostrados. Es posible que el obstáculo real sea conseguir los primeros clientes antes de optimizar procesos.',
}

function detectInconsistencies(scores: Record<string, number>, tags: Record<string, string>): IncId[] {
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

/* ─── Dimension labels + strength/improvement messages ─── */
const DIM_LABELS: Record<string, string> = {
  madurez: 'Madurez del producto',
  validacion: 'Validación comercial',
  impacto: 'Medición de impacto',
  financiamiento: 'Necesidad de financiamiento',
  equipo: 'Balance del equipo fundador',
  data_room: 'Preparación para inversión',
}
const DIM_MAX: Record<string, number> = {
  madurez: 4, validacion: 4, impacto: 4, financiamiento: 4, equipo: 3, data_room: 4,
}
const DIM_MESSAGES: Record<string, { low: string; high: string }> = {
  madurez: {
    low: 'Tu producto está en etapa muy inicial. Prioriza construir y lanzar un MVP funcional lo antes posible.',
    high: 'Tu producto tiene un nivel de madurez sólido para tu etapa, lo que facilita la conversación con clientes e inversores.',
  },
  validacion: {
    low: 'Aún no tienes evidencia comercial. Las entrevistas con usuarios son tu herramienta más valiosa ahora mismo.',
    high: 'Tienes evidencia comercial real, una ventaja competitiva significativa frente a startups en etapas similares.',
  },
  impacto: {
    low: 'Tu medición de impacto es todavía cualitativa. Para acceder a fondos de impacto climático, necesitarás métricas verificables.',
    high: 'Tu capacidad de medir y reportar impacto te abre puertas a fondos especializados y alianzas estratégicas.',
  },
  financiamiento: {
    low: 'Define con precisión cuánto capital necesitas y para qué. La claridad financiera acelera las conversaciones con inversores.',
    high: 'Tienes claridad sobre tus necesidades de capital, lo que facilita identificar los inversores correctos.',
  },
  equipo: {
    low: 'Un equipo 100% técnico o 100% de negocios puede ser una brecha crítica. Considera sumar co-founders o advisors que complementen el perfil faltante.',
    high: 'Tu equipo tiene un balance sólido entre perfiles técnicos y de negocio, uno de los factores más valorados por inversores tempranos.',
  },
  data_room: {
    low: 'No tener un Data Room limita tu capacidad de responder a oportunidades de inversión. Empieza con un Pitch Deck básico.',
    high: 'Tu nivel de preparación documental es una ventaja real al momento de acercarte a inversores institucionales.',
  },
}
const TEAM_NOTES: Record<string, string | null> = {
  solo: 'Como solo founder, es especialmente importante construir una red de advisors y mentores que complementen tus capacidades.',
  dos: null,
  tres: null,
  completo: 'Con un equipo de más de 5 personas, la alineación de roles y la gobernanza interna se vuelven críticas para mantener velocidad.',
}

/* ─── Roadmaps por cuello de botella ─── */
interface Roadmap { bullets: string[]; tools: string[] }
const ROADMAPS: Record<string, Roadmap> = {
  pmf: {
    bullets: [
      'Realiza al menos 10 entrevistas de problema con usuarios potenciales esta semana',
      'Define tu hipótesis de PMF en una sola frase: "[Segmento] usa [producto] para [trabajo a realizar]"',
      'Establece una métrica de retención como proxy de PMF (DAU/MAU, churn mensual, NPS)',
      'Revisa tu propuesta de valor con al menos 3 usuarios reales antes de hacer cambios al producto',
    ],
    tools: ['Perfil del Usuario', 'Segmentación de Mercado'],
  },
  clientes: {
    bullets: [
      'Mapea tus primeros 10 clientes potenciales con nombre, empresa y contacto directo',
      'Define un proceso de ventas de 3 pasos reproducible antes de contratar a alguien de ventas',
      'Establece una métrica de conversión semanal (contactos → demos → cierres) y revísala cada lunes',
      'Identifica cuál es tu canal de adquisición con mayor tasa de conversión y dóblalo',
    ],
    tools: ['Primeros 10 Clientes', 'Proceso de Ventas'],
  },
  operaciones: {
    bullets: [
      'Mapea tu cadena de valor completa e identifica los 3 procesos con mayor costo o mayor fricción operativa',
      'Calcula tus Unit Economics actuales por línea de producto o segmento: CAC, LTV y margen bruto',
      'Define un baseline de eficiencia operativa con al menos una métrica por proceso crítico (tiempo de ciclo, costo por unidad, tasa de error)',
      'Prioriza una sola iniciativa de reducción de costos o automatización para los próximos 30 días, con métrica de éxito clara y responsable asignado',
    ],
    tools: ['Unit Economics', 'Modelo de Negocio', 'Framework de Pricing'],
  },
  financiero: {
    bullets: [
      'Construye un modelo financiero básico con proyecciones a 18 meses (ingresos, costos fijos/variables, runway)',
      'Calcula tus Unit Economics: CAC, LTV, margen bruto y punto de equilibrio',
      'Identifica tus 3 principales palancas de eficiencia de costos y simula el impacto de mejorar cada una',
      'Define una política de pricing clara antes de escalar ventas',
    ],
    tools: ['Unit Economics', 'Modelo de Negocio'],
  },
  inversion: {
    bullets: [
      'Estructura tu Data Room con los elementos mínimos: Pitch Deck, modelo financiero a 18 meses y cap table',
      'Identifica 5 fondos alineados a tu vertical de impacto climático en LATAM y verifica sus tesis de inversión',
      'Prepara un resumen ejecutivo de 1 página (executive summary) antes de contactar a cualquier inversor',
      'Practica tu pitch con al menos 3 personas externas antes de una reunión con inversores reales',
    ],
    tools: ['Pitch Deck', 'Validación de Tracción'],
  },
}

/* ─── Catálogo de herramientas ─── */
const HERRAMIENTAS_POR_ETAPA: Record<number, string[]> = {
  1: ['Propósito & Equipo', 'Segmentación de Mercado', 'Mercado inicial', 'Perfil del Usuario'],
  2: ['Propuesta de Valor', 'Primeros 10 Clientes', 'Lean Canvas', 'Especificación de Producto'],
  3: ['Unit Economics', 'Proceso de Ventas', 'Modelo de Negocio', 'Framework de Pricing'],
  4: ['Pitch Deck', 'Cap Table', 'Plan de Producto', 'Validación de Tracción'],
}

function mapToolByBottleneck(cb: string | undefined, etapa: number): string {
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
function mapToolByRevenueModel(modelo: string | undefined, etapa: number): string {
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

/* ─── Styles ─── */
const inputStyle = {
  width: '100%',
  padding: '0.625rem 0',
  borderRadius: 0,
  borderTop: 'none',
  borderRight: 'none',
  borderLeft: 'none',
  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  color: 'var(--color-ink)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  background: 'transparent',
  letterSpacing: '-0.01em',
} as const

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.45)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  marginBottom: '0.375rem',
} as const

const rowStyle = { display: 'flex', gap: '1rem', flexWrap: 'wrap' as const }
const halfColStyle = { flex: '1 1 220px', minWidth: 0 }

const LOCAL_PROGRESS_KEY = 's4c_diagnostic_progress'
const LOCAL_PENDING_KEY = 's4c_diagnostic_pending'
const historyKey = (userId: string) => `s4c_${userId}_diagnostic_history`

export interface DiagnosticHistoryEntry {
  id: string
  created_at: string
  score: number
  profile_tag: string
  profile_etapa: 1 | 2 | 3 | 4
  profile_name: string
  profile_emoji: string
  profile_color: string
  dimension_scores: Record<string, number>
  tags: Record<string, string>
  inconsistencias: string[]
}

export interface DiagnosticFormProps {
  embedded?: boolean
  userId?: string | null
  prefilledContact?: {
    nombre?: string
    email?: string
    startup_name?: string
    vertical?: string
    startup_description?: string
    phone?: string
    website?: string
    country?: string
    como_nos_conocio?: string
  }
  onBack?: () => void
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Component                                                            */
/* ═══════════════════════════════════════════════════════════════════ */

export default function DiagnosticForm({ embedded = false, userId = null, prefilledContact, onBack }: DiagnosticFormProps = {}) {
  // Paso 0..9 = contact + 9 questions; 10 = loading; 11 = results
  const [step, setStep] = useState(embedded ? 1 : 0)
  const [answers, setAnswers] = useState<Record<string, string>>(
    embedded && prefilledContact ? { ...prefilledContact } as Record<string, string> : {}
  )
  const [scores, setScores] = useState<Record<string, number>>({})
  const [tags, setTags] = useState<Record<string, string>>({})
  const [adaptiveOverrides, setAdaptiveOverrides] = useState<string[]>([])
  const [pendingAnswer, setPendingAnswer] = useState<null | { qIndex: number; value: string; score?: number; type: QType; key: string }>(null)
  const [activeWarning, setActiveWarning] = useState<AdaptiveRule | null>(null)

  const [totalScore, setTotalScore] = useState(0)
  const [profile, setProfile] = useState<Profile>(profiles[0])
  const [inconsistencies, setInconsistencies] = useState<IncId[]>([])
  const [percentil, setPercentil] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [countUp, setCountUp] = useState(0)
  const [phoneCountryCode, setPhoneCountryCode] = useState('+52')
  const [comoNosConocio, setComoNosConocio] = useState('')

  // Auth integration for result CTAs
  const { user, openAuthModal } = useAuth()
  const router = useRouter()
  const [emailSendStatus, setEmailSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailSendError, setEmailSendError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
  })

  /* ─── Restore progress from localStorage on mount ─── */
  const [restorePrompt, setRestorePrompt] = useState<null | { paso: number }>(null)
  useEffect(() => {
    if (embedded) return
    try {
      const raw = localStorage.getItem(LOCAL_PROGRESS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data?.version !== '2.1' || !data?.paso_actual || data.paso_actual === 0) return
      setRestorePrompt({ paso: data.paso_actual })
    } catch { /* noop */ }
  }, [embedded])

  const resumeProgress = () => {
    try {
      const raw = localStorage.getItem(LOCAL_PROGRESS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.paso_0) {
        setAnswers(data.paso_0)
        if (data.paso_0.phoneCountryCode) setPhoneCountryCode(data.paso_0.phoneCountryCode)
        if (data.paso_0.como_nos_conocio) setComoNosConocio(data.paso_0.como_nos_conocio)
        reset(data.paso_0)
      }
      if (data.scores) setScores(data.scores)
      if (data.tags) setTags(data.tags)
      if (data.answers) setAnswers(prev => ({ ...prev, ...data.answers }))
      if (data.adaptive_overrides) setAdaptiveOverrides(data.adaptive_overrides)
      setStep(Math.min(data.paso_actual, 9))
    } catch { /* noop */ }
    setRestorePrompt(null)
  }
  const discardProgress = () => {
    try { localStorage.removeItem(LOCAL_PROGRESS_KEY) } catch { /* noop */ }
    setRestorePrompt(null)
  }

  /* ─── Persist progress on every change ─── */
  useEffect(() => {
    if (embedded) return
    if (step === 0 || step >= 10) return
    try {
      localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify({
        version: '2.1',
        timestamp: new Date().toISOString(),
        paso_actual: step,
        paso_0: { ...answers, phoneCountryCode, como_nos_conocio: comoNosConocio },
        answers,
        scores,
        tags,
        adaptive_overrides: adaptiveOverrides,
      }))
    } catch { /* noop */ }
  }, [step, answers, scores, tags, adaptiveOverrides, phoneCountryCode, comoNosConocio])

  /* ─── Submit contact form → Paso 1 ─── */
  const handleContactSubmit = (data: ContactData) => {
    const phone = data.phone ? `${phoneCountryCode} ${data.phone}` : ''
    const country = phoneCountryOptions.find(c => c.code === phoneCountryCode)?.name || ''
    setAnswers(prev => ({ ...prev, ...data, phone, country, como_nos_conocio: comoNosConocio }))
    setStep(1)
  }

  /* ─── Handle answer click ─── */
  const handleAnswer = (qIndex: number, value: string, score: number | undefined, type: QType, key: string) => {
    const q = questions[qIndex]
    // Check adaptive rule
    const rule = ADAPTIVE_RULES.find(r => r.qId === q.id && r.triggers(scores, value))
    if (rule && !adaptiveOverrides.includes(rule.id)) {
      setActiveWarning(rule)
      setPendingAnswer({ qIndex, value, score, type, key })
      // also visually mark the pending selection
      setAnswers(prev => ({ ...prev, [q.id]: value }))
      return
    }
    applyAnswer(qIndex, value, score, type, key)
  }

  const applyAnswer = (qIndex: number, value: string, score: number | undefined, type: QType, key: string) => {
    const qId = questions[qIndex].id
    const updatedAnswers = { ...answers, [qId]: value }
    setAnswers(updatedAnswers)
    let updatedScores = scores
    let updatedTags = tags
    if (type === 'score' && score !== undefined) {
      updatedScores = { ...scores, [key]: score }
      setScores(updatedScores)
    } else if (type === 'tag') {
      updatedTags = { ...tags, [key]: value }
      setTags(updatedTags)
    }
    setActiveWarning(null)
    setPendingAnswer(null)
    setTimeout(() => {
      if (qIndex < questions.length - 1) {
        setStep(qIndex + 2) // qIndex 0 = step 1, so qIndex+2 = next step
      } else {
        // final question — go to loading
        setStep(10)
      }
    }, 350)
  }

  const keepAdaptiveOverride = () => {
    if (!activeWarning || !pendingAnswer) return
    setAdaptiveOverrides(prev => prev.includes(activeWarning.id) ? prev : [...prev, activeWarning.id])
    applyAnswer(pendingAnswer.qIndex, pendingAnswer.value, pendingAnswer.score, pendingAnswer.type, pendingAnswer.key)
  }
  const cancelAdaptiveAndReset = () => {
    if (!activeWarning || !pendingAnswer) return
    const qId = questions[pendingAnswer.qIndex].id
    setAnswers(prev => {
      const next = { ...prev }
      delete next[qId]
      return next
    })
    setActiveWarning(null)
    setPendingAnswer(null)
  }

  /* ─── Loading step → compute, persist, fetch percentil ─── */
  useEffect(() => {
    if (step !== 10 || submitted) return

    let total = 0
    Object.values(scores).forEach(v => { total += v || 0 })
    const matched = classifyProfile(total)
    const incs = detectInconsistencies(scores, tags)

    setTotalScore(total)
    setProfile(matched)
    setInconsistencies(incs)

    /* DB inserts — log errors para que leads no se pierdan silenciosamente */
    const insertLead = async () => {
      try {
        const { error } = await supabase.from('diagnostic_leads').insert({
          nombre: answers.nombre,
          email: (answers.email || '').toLowerCase(),
          startup_name: answers.startup_name,
          startup_description: answers.startup_description || null,
          vertical: answers.vertical || null,
          country: answers.country || null,
          phone: answers.phone || null,
          website: answers.website || null,
          score: total,
          profile: matched.tag,
          answers: {
            ...answers,
            como_nos_conocio: comoNosConocio,
            inconsistencias: incs,
            adaptive_overrides: adaptiveOverrides,
            perfil_etapa: matched.etapa,
            diagnostic_version: '2.1',
          },
          tags: {
            modelo_negocio: tags.modelo_negocio,
            equipo_tamano: tags.equipo_tamano,
            cuello_botella: tags.cuello_botella,
          },
          source: embedded ? 'tools' : 'landing',
        })
        if (error) console.error('[S4C Sync] diagnostic_leads insert failed:', error)
      } catch (err) {
        console.error('[S4C Sync] diagnostic_leads insert threw:', err)
      }
    }

    const insertDiagnostic = async () => {
      try {
        const dimensionScores = {
          madurez: scores.madurez || 0,
          validacion: scores.validacion || 0,
          impacto: scores.impacto || 0,
          financiamiento: scores.financiamiento || 0,
          equipo: scores.equipo || 0,
          data_room: scores.data_room || 0,
        }
        // Solo intentar vincular a profile si hay sesión autenticada
        let foundUserId: string | null = null
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user?.id) {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle()
          foundUserId = profileRow?.id ?? null
        }
        const { error } = await supabase.from('diagnostics').insert({
          user_id: foundUserId,
          score: total,
          profile: matched.tag,
          answers,
          dimension_scores: dimensionScores,
        })
        if (error) console.error('[S4C Sync] diagnostics insert failed:', error)

        // If the user is authenticated, also propagate the diagnostic into
        // their profile + startup row so they don't have to re-enter
        // vertical / country / stage in /tools/completar-perfil.
        if (foundUserId) {
          await applyDiagnosticToProfile(supabase, foundUserId, {
            total_score: total,
            perfil_etapa: matched.etapa,
            dimension_scores: dimensionScores,
            answers,
            tags,
          })
        }
      } catch (err) {
        console.error('[S4C Sync] diagnostics insert threw:', err)
      }
    }

    const fetchPercentil = async () => {
      try {
        // Optional RPC — if it doesn't exist yet, this silently fails and we render without percentil
        const { data } = await supabase.rpc('calcular_percentil', { p_score: total })
        if (typeof data === 'number') setPercentil(data)
      } catch { /* noop */ }
    }

    insertLead()
    insertDiagnostic()
    fetchPercentil()

    try {
      if (!embedded) {
        localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify({
          version: '2.1',
          timestamp: new Date().toISOString(),
          total_score: total,
          perfil_etapa: matched.etapa,
          perfil_nombre: matched.name,
          dimension_scores: scores,
          tags,
          inconsistencias: incs,
          answers: { ...answers, como_nos_conocio: comoNosConocio },
        }))
        // clear in-progress form now that we have a pending result
        localStorage.removeItem(LOCAL_PROGRESS_KEY)
      }
      // Append to per-user history (only when we know the user)
      if (userId) {
        const k = historyKey(userId)
        const prev: DiagnosticHistoryEntry[] = JSON.parse(localStorage.getItem(k) || '[]')
        const entry: DiagnosticHistoryEntry = {
          id: `diag-${Date.now()}`,
          created_at: new Date().toISOString(),
          score: total,
          profile_tag: matched.tag,
          profile_etapa: matched.etapa,
          profile_name: matched.name,
          profile_emoji: matched.emoji,
          profile_color: matched.color,
          dimension_scores: { ...scores },
          tags: { ...tags },
          inconsistencias: incs,
        }
        localStorage.setItem(k, JSON.stringify([entry, ...prev]))
      }
    } catch { /* noop */ }

    // Minimum 3s for analysis effect
    const t = setTimeout(() => {
      setSubmitted(true)
      setStep(11)
    }, 3000)
    return () => clearTimeout(t)
  }, [step, submitted, scores, tags, answers, adaptiveOverrides, comoNosConocio, embedded, userId])

  /* ─── Count-up animation ─── */
  useEffect(() => {
    if (step === 11 && countUp < totalScore) {
      const t = setTimeout(() => setCountUp(c => c + 1), 70)
      return () => clearTimeout(t)
    }
  }, [step, countUp, totalScore])

  /* ─── Derived for results ─── */
  const dimensions = useMemo(() => {
    return Object.keys(DIM_LABELS).map(k => {
      const raw = scores[k] || 0
      const max = DIM_MAX[k]
      const normalized = Math.round((raw / max) * 100)
      return { key: k, label: DIM_LABELS[k], raw, max, normalized }
    })
  }, [scores])

  const sortedDims = useMemo(() => [...dimensions].sort((a, b) => b.normalized - a.normalized), [dimensions])
  const fortalezas = sortedDims.slice(0, 2)
  const mejoras = sortedDims.slice(-2).reverse()

  const roadmap = ROADMAPS[tags.cuello_botella || ''] || ROADMAPS.pmf

  const recommendedTools = useMemo(() => {
    const etapa = profile.etapa
    const t1 = mapToolByBottleneck(tags.cuello_botella, etapa)
    const t2 = mapToolByRevenueModel(tags.modelo_negocio, etapa)
    const etapaSig = Math.min(etapa + 1, 4)
    const t3 = HERRAMIENTAS_POR_ETAPA[etapaSig][0]
    // dedup (keep first occurrence)
    const out: string[] = []
    for (const t of [t1, t2, t3]) if (!out.includes(t)) out.push(t)
    // fill if we lost one to dedup
    while (out.length < 3) {
      const extra = HERRAMIENTAS_POR_ETAPA[etapa].find(x => !out.includes(x))
      if (!extra) break
      out.push(extra)
    }
    return out
  }, [profile, tags])

  const puntosFaltantes = useMemo(() => {
    const limites: Record<number, number> = { 1: 11, 2: 16, 3: 20, 4: 23 }
    if (profile.etapa >= 4) return null
    return limites[profile.etapa] - totalScore + 1
  }, [profile, totalScore])

  /* Progress bar: 12 pasos visibles (0..11), progreso lineal en 0..10 */
  const progress = step <= 10 ? (step / 10) * 100 : 100

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-ink)'
  }
  const handleBlur = (fieldName: keyof ContactData) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = errors[fieldName] ? '#DC2626' : 'var(--color-border)'
  }

  return (
    <section id="diagnostico" style={{ position: 'relative', padding: 'clamp(4rem, 8vw, 6rem) 0', background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
      <div className="orb orb-ember orb-sm" style={{ top: '20%', right: '-200px', opacity: 0.18 }} aria-hidden />
      <div className="orb orb-electric orb-sm" style={{ bottom: '10%', left: '-200px', opacity: 0.18 }} aria-hidden />
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{
          borderRadius: 24,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(14, 14, 14, 0.85)',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
        }}>
          {/* Top gradient accent */}
          <div style={{
            height: 3,
            background: 'linear-gradient(90deg, #DA4E24, #F0721D, #1F77F6)',
          }} />

          {/* Progress bar */}
          {step < 11 && (
            <div style={{ padding: '1rem 2rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                  {step === 0 ? 'Datos de contacto' : step <= 9 ? `Paso ${step + 1} de 11` : 'Procesando…'}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%', borderRadius: 2, background: 'var(--color-accent-primary)' }}
                />
              </div>
            </div>
          )}

          {/* Restore progress prompt */}
          {restorePrompt && step === 0 && (
            <div style={{
              margin: '1rem 2rem 0',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(31,119,246,0.08)',
              border: '1px solid rgba(31,119,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-ink)', flex: 1 }}>
                ¿Continuar donde lo dejaste? Tienes un diagnóstico en progreso (Paso {restorePrompt.paso + 1} de 11).
              </span>
              <button
                onClick={resumeProgress}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
                  background: '#1F77F6', color: '#fff', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                }}
              >Continuar</button>
              <button
                onClick={discardProgress}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
                  background: 'transparent', color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                }}
              >Empezar de nuevo</button>
            </div>
          )}

          <div style={{ padding: '1.5rem 2rem 2rem' }}>
            <AnimatePresence mode="wait">
              {/* ─── Paso 0: Contact form ─── */}
              {step === 0 && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-accent-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.625rem' }}>
                    [ DIAGNÓSTICO DE PREPARACIÓN ]
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-ink)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                    Mide el estado real de tu startup
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.25rem' }}>
                    9 preguntas · 3 min · Startup Readiness Score + roadmap de 30 días personalizado.
                  </p>
                  <form onSubmit={handleSubmit(handleContactSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <div style={rowStyle}>
                      <div style={halfColStyle}>
                        <label style={labelStyle}>Tu nombre</label>
                        <input
                          {...register('nombre')}
                          type="text"
                          autoComplete="name"
                          autoCapitalize="words"
                          placeholder="María García"
                          style={{ ...inputStyle, borderColor: errors.nombre ? '#DC2626' : 'var(--color-border)' }}
                          onFocus={handleFocus} onBlur={handleBlur('nombre')}
                        />
                        {errors.nombre && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#DC2626', marginTop: '0.125rem' }}>{errors.nombre.message}</p>}
                      </div>
                      <div style={halfColStyle}>
                        <label style={labelStyle}>Email</label>
                        <input
                          {...register('email')}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="maria@startup.com"
                          style={{ ...inputStyle, borderColor: errors.email ? '#DC2626' : 'var(--color-border)' }}
                          onFocus={handleFocus} onBlur={handleBlur('email')}
                        />
                        {errors.email && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#DC2626', marginTop: '0.125rem' }}>{errors.email.message}</p>}
                      </div>
                    </div>

                    <div style={rowStyle}>
                      <div style={halfColStyle}>
                        <label style={labelStyle}>Nombre de tu startup</label>
                        <input
                          {...register('startup_name')}
                          type="text"
                          autoComplete="organization"
                          placeholder="Mi Startup"
                          style={{ ...inputStyle, borderColor: errors.startup_name ? '#DC2626' : 'var(--color-border)' }}
                          onFocus={handleFocus} onBlur={handleBlur('startup_name')}
                        />
                        {errors.startup_name && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#DC2626', marginTop: '0.125rem' }}>{errors.startup_name.message}</p>}
                      </div>
                      <div style={halfColStyle}>
                        <label style={labelStyle}>Vertical</label>
                        <select
                          {...register('vertical')}
                          aria-label="Vertical de tu startup"
                          defaultValue=""
                          style={{
                            ...inputStyle,
                            borderColor: errors.vertical ? '#DC2626' : 'var(--color-border)',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 1rem center',
                            paddingRight: '2.5rem',
                          }}
                          onFocus={handleFocus} onBlur={handleBlur('vertical')}
                        >
                          <option value="" disabled>Selecciona vertical</option>
                          {verticalOptions.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        {errors.vertical && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#DC2626', marginTop: '0.125rem' }}>{errors.vertical.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Describe brevemente tu idea</label>
                      <textarea
                        {...register('startup_description')}
                        placeholder="¿Qué problema resuelve tu startup y para quién?"
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical' as const, minHeight: 64, borderColor: errors.startup_description ? '#DC2626' : 'var(--color-border)' }}
                        onFocus={handleFocus} onBlur={handleBlur('startup_description')}
                      />
                      {errors.startup_description && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#DC2626', marginTop: '0.125rem' }}>{errors.startup_description.message}</p>}
                    </div>

                    <div style={rowStyle}>
                      <div style={{ flex: '0 0 auto', minWidth: 130 }}>
                        <label style={labelStyle}>País</label>
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          aria-label="Código de país para WhatsApp"
                          style={{
                            ...inputStyle,
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            paddingRight: '1.75rem',
                          }}
                          onFocus={handleFocus}
                        >
                          {phoneCountryOptions.map(c => (
                            <option key={c.code + c.name} value={c.code}>{c.flag} {c.code}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <label style={labelStyle}>Teléfono (WhatsApp)</label>
                        <input
                          {...register('phone')}
                          placeholder="55 1234 5678"
                          style={{ ...inputStyle, borderColor: errors.phone ? '#DC2626' : 'var(--color-border)' }}
                          onFocus={handleFocus} onBlur={handleBlur('phone')}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Sitio web (opcional)</label>
                      <input
                        {...register('website')}
                        placeholder="https://..."
                        style={{ ...inputStyle, borderColor: errors.website ? '#DC2626' : 'var(--color-border)' }}
                        onFocus={handleFocus} onBlur={handleBlur('website')}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>¿Cómo nos conociste? (opcional)</label>
                      <select
                        value={comoNosConocio}
                        onChange={(e) => setComoNosConocio(e.target.value)}
                        aria-label="¿Cómo nos conociste?"
                        style={{
                          ...inputStyle,
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          paddingRight: '2.5rem',
                        }}
                        onFocus={handleFocus}
                      >
                        <option value="">Prefiero no decir</option>
                        {comoNosConocioOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <button
                      type="submit"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        width: '100%', padding: '1rem', borderRadius: 'var(--radius-full)',
                        background: 'var(--color-accent-primary)', color: '#fff',
                        fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(218,78,36,0.25), 0 1px 2px rgba(0,0,0,0.4)',
                        transition: 'background 0.2s, transform 0.2s var(--ease-spring), box-shadow 0.2s ease',
                        marginTop: '0.25rem',
                        letterSpacing: '-0.01em',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      Comenzar Diagnóstico <ArrowRight size={18} />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ─── Paso 1–9: Questions ─── */}
              {step >= 1 && step <= 9 && (() => {
                const qIndex = step - 1
                const q = questions[qIndex]
                return (
                  <motion.div
                    key={`q-${step}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <button
                      onClick={() => { setActiveWarning(null); setPendingAnswer(null); setStep(step - 1) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        background: 'none', border: 'none',
                        fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                        color: 'var(--color-text-muted)', cursor: 'pointer',
                        marginBottom: '1rem', padding: 0,
                      }}
                    >
                      <ArrowLeft size={16} /> Anterior
                    </button>

                    <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-primary)', marginBottom: '0.5rem' }}>
                      {q.subtitle}
                    </p>
                    <h3 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontSize: 'var(--text-heading-lg)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-ink)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                      <span>{q.text}</span>
                      <span title={q.tooltip} aria-label={q.tooltip} style={{ display: 'inline-flex', marginTop: 4, cursor: 'help', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        <Info size={16} />
                      </span>
                    </h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                      {q.tooltip}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.options.map((opt, optIdx) => {
                        const selected = answers[q.id] === opt.value
                        const isWarned = activeWarning && activeWarning.qId === q.id && pendingAnswer?.value === opt.value
                        const optionLabel = String.fromCharCode(65 + optIdx) // A, B, C, D…
                        return (
                          <div key={opt.value}>
                            <button
                              onClick={() => handleAnswer(qIndex, opt.value, opt.score, q.type, q.key)}
                              disabled={!!activeWarning && !isWarned}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '1rem',
                                padding: '0.875rem 1.25rem',
                                borderRadius: 0,
                                border: 'none',
                                borderBottom: selected
                                  ? '1px solid rgba(255,255,255,0.5)'
                                  : '1px solid rgba(255,255,255,0.07)',
                                background: selected ? 'rgba(255,255,255,0.03)' : 'transparent',
                                cursor: activeWarning && !isWarned ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.18s ease',
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.875rem',
                                fontWeight: selected ? 500 : 400,
                                color: selected ? '#ffffff' : 'rgba(255,255,255,0.55)',
                                width: '100%',
                                opacity: activeWarning && !isWarned ? 0.45 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!selected && !activeWarning) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = selected ? 'rgba(255,255,255,0.03)' : 'transparent'
                                e.currentTarget.style.color = selected ? '#ffffff' : 'rgba(255,255,255,0.55)'
                              }}
                            >
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: selected ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.25)',
                                flexShrink: 0,
                                marginTop: '0.125rem',
                                letterSpacing: '0.05em',
                                minWidth: 14,
                                transition: 'color 0.18s ease',
                              }}>{optionLabel}</span>
                              {opt.label}
                            </button>

                            {/* Adaptive warning inline */}
                            {isWarned && activeWarning && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                  margin: '0.5rem 0 0.25rem',
                                  padding: '0.75rem 1rem',
                                  borderRadius: 'var(--radius-md)',
                                  background: 'rgba(240,114,29,0.08)',
                                  border: '1px solid rgba(240,114,29,0.35)',
                                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <AlertTriangle size={16} color="#F0721D" style={{ flexShrink: 0, marginTop: 2 }} />
                                  <div>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 700, color: '#F0721D', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, marginBottom: 2 }}>Nota</p>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--color-ink)', margin: 0 }}>
                                      {activeWarning.message}
                                    </p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 24, flexWrap: 'wrap' }}>
                                  <button
                                    onClick={cancelAdaptiveAndReset}
                                    style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)', background: 'transparent', color: 'var(--color-ink)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                                  >Cambiar respuesta</button>
                                  <button
                                    onClick={keepAdaptiveOverride}
                                    style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)', background: '#F0721D', color: '#fff', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                  >Mantener y continuar</button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })()}

              {/* ─── Paso 10: Loading ─── */}
              {step === 10 && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '3rem 0' }}
                >
                  <Loader2 size={40} color="var(--color-accent-primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                    Analizando tu startup…
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Calculando tu Startup Readiness Score y preparando tu roadmap personalizado.
                  </p>
                </motion.div>
              )}

              {/* ─── Paso 11: Resultados enriquecidos ─── */}
              {step === 11 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Headline & Technical Metrics Grid */}
                  <div style={{ marginBottom: '2.5rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: 'var(--color-accent-primary)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '0.75rem',
                      }}
                    >
                      [ 03 / DIAGNÓSTICO ESTRATÉGICO ]
                    </span>
                    <h2
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                        fontWeight: 500,
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        margin: '0 0 1.5rem 0',
                        color: '#ffffff',
                      }}
                    >
                      Diagnóstico de <span className="text-ember">{answers.startup_name || 'tu Startup'}</span>
                    </h2>

                    {/* Technical KPI grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                      className="kpi-grid"
                    >
                      <div
                        style={{
                          padding: '1.25rem 1rem',
                          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        className="kpi-cell"
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.55rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '0.5rem',
                          }}
                        >
                          Readiness Score
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '2.2rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            color: profile.color,
                          }}
                        >
                          {countUp}
                          <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.3)', marginLeft: '0.25rem' }}>/23</span>
                        </span>
                      </div>
                      <div
                        style={{
                          padding: '1.25rem 1rem',
                          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        className="kpi-cell"
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.55rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '0.5rem',
                          }}
                        >
                          Fase Estratégica
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.2rem',
                            fontWeight: 500,
                            color: '#ffffff',
                            display: 'block',
                            marginTop: '0.25rem',
                            lineHeight: 1.2,
                          }}
                        >
                          {profile.name}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: '1.25rem 1rem',
                        }}
                        className="kpi-cell no-border"
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.55rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '0.5rem',
                          }}
                        >
                          Percentil Relativo
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '2.2rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            color: '#ffffff',
                          }}
                        >
                          {percentil}
                          <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.3)', marginLeft: '0.1rem' }}>%</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Discretionary Stage Visualizer */}
                  <div style={{ marginBottom: '2.5rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '1rem',
                      }}
                    >
                      [ PIPELINE DE PREPARACIÓN DE STARTUP ]
                    </span>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.75rem',
                      }}
                      className="stage-pipeline"
                    >
                      {[
                        { name: 'Pre-incubación', step: 1 },
                        { name: 'Incubación', step: 2 },
                        { name: 'Aceleración', step: 3 },
                        { name: 'Escalamiento', step: 4 },
                      ].map((st) => {
                        const isActive = profile.etapa === st.step
                        const isPast = profile.etapa > st.step
                        return (
                          <div key={st.step}>
                            <div
                              style={{
                                height: 5,
                                background: isActive
                                  ? profile.color
                                  : isPast
                                  ? 'rgba(255, 255, 255, 0.35)'
                                  : 'rgba(255, 255, 255, 0.08)',
                                borderRadius: 1,
                                transition: 'all 0.3s ease',
                                marginBottom: '0.5rem',
                              }}
                            />
                            <span
                              style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.68rem',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                                display: 'block',
                                textAlign: 'center',
                              }}
                            >
                              {st.name} {isActive && '●'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Stage Description Block */}
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '2.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      [ CORE FINDINGS / SÍNTESIS DE LA ETAPA ]
                    </span>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        color: 'var(--color-text-secondary)',
                        margin: 0,
                      }}
                    >
                      {profile.description}
                    </p>
                    {puntosFaltantes !== null && (
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.78rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginTop: '0.75rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          paddingTop: '0.75rem',
                          margin: '0.75rem 0 0 0',
                        }}
                      >
                        Faltan <span style={{ color: profile.color, fontWeight: 700 }}>{puntosFaltantes}</span> puntos de madurez técnica para calificar al siguiente nivel estratégico ({profile.etapa === 1 ? 'Incubación' : profile.etapa === 2 ? 'Aceleración' : 'Escalamiento'}).
                      </p>
                    )}
                  </div>

                  {/* Core Dimensions Scores */}
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '2.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '1rem',
                      }}
                    >
                      [ DIMENSIONAL PROFILE ]
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {dimensions.map(d => {
                        const isStrength = fortalezas.find(f => f.key === d.key) !== undefined
                        const isGap = mejoras.find(m => m.key === d.key) !== undefined
                        const barColor = isStrength ? 'var(--color-accent-secondary)' : isGap ? 'var(--color-accent-primary)' : profile.color
                        return (
                          <div key={d.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#ffffff', fontWeight: 500 }}>
                                {d.label}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>
                                {d.raw}/{d.max}
                              </span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${d.normalized}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                style={{ height: '100%', borderRadius: 2, background: barColor }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Fortalezas y Mejoras (2 Columns) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1.25rem',
                      marginBottom: '2.5rem',
                    }}
                    className="results-grid"
                  >
                    {/* Strengths */}
                    <div
                      style={{
                        padding: '1.25rem 1.5rem',
                        background: 'rgba(31, 119, 246, 0.02)',
                        border: '1px solid rgba(31, 119, 246, 0.15)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            color: '#5C9BFF',
                            letterSpacing: '0.08em',
                          }}
                        >
                          [ CORE STRENGTHS ]
                        </span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {fortalezas.map(f => {
                          const level = f.raw >= 3 ? 'high' : 'low'
                          return (
                            <li key={f.key} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
                              <strong style={{ color: '#ffffff', fontWeight: 500 }}>{f.label}:</strong> {DIM_MESSAGES[f.key][level]}
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    {/* Improvement Gaps */}
                    <div
                      style={{
                        padding: '1.25rem 1.5rem',
                        background: 'rgba(240, 114, 29, 0.02)',
                        border: '1px solid rgba(240, 114, 29, 0.15)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            color: '#F0721D',
                            letterSpacing: '0.08em',
                          }}
                        >
                          [ IMPROVEMENT GAPS ]
                        </span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {mejoras.map(m => (
                          <li key={m.key} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
                            <strong style={{ color: '#ffffff', fontWeight: 500 }}>{m.label}:</strong> {DIM_MESSAGES[m.key].low}
                          </li>
                        ))}
                      </ul>
                      {tags.equipo_tamano && TEAM_NOTES[tags.equipo_tamano] && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(240,114,29,0.15)' }}>
                          <strong>Nota equipo:</strong> {TEAM_NOTES[tags.equipo_tamano]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 30-Day Roadmap */}
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '2.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.6rem',
                          color: '#EAF0F6',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        [ ACCIONES INMEDIATAS - SIGUIENTES 30 DÍAS ]
                      </span>
                    </div>
                    <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      {roadmap.bullets.map((b, i) => (
                        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
                          {b}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Recommended Tools Grid */}
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '2.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '1.25rem',
                      }}
                    >
                      [ HERRAMIENTAS Y PLANTILLAS RECOMENDADAS ]
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {recommendedTools.map((tool, i) => {
                        const isAspirational = i === 2
                        return (
                          <div
                            key={tool + i}
                            style={{
                              padding: '1rem 1.25rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.015)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                            }}
                            className="tool-rec-card"
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500, color: '#ffffff', margin: '0 0 0.25rem 0' }}>
                                {i + 1}. {tool} {isAspirational && (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: profile.color, marginLeft: '0.5rem', border: `1px solid ${profile.color}40`, padding: '1px 5px', borderRadius: 2 }}>
                                    HOJA DE RUTA
                                  </span>
                                )}
                              </p>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                {i === 0 && `Alineado a tu cuello de botella prioritario: ${tags.cuello_botella || 'tu etapa'}`}
                                {i === 1 && `Específica para tu modelo de negocio: ${tags.modelo_negocio || 'tu etapa'}`}
                                {i === 2 && `Preparación recomendada para la siguiente etapa.`}
                              </p>
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: profile.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              VER RECURSO →
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Adaptive Warnings / Inconsistencias */}
                  {inconsistencies.length > 0 && (
                    <div style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(240, 114, 29, 0.015)',
                      border: '1px solid rgba(240, 114, 29, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '2.5rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600, color: '#F0721D', letterSpacing: '0.08em' }}>
                          [ TENSIONES METODOLÓGICAS DETECTADAS ]
                        </span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                        Tus respuestas presentan algunos contrastes que nuestro framework metodológico señala como inconsistencias. Te sugerimos revisar las siguientes áreas clave:
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {inconsistencies.map(id => (
                          <li key={id} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--color-text-secondary)', display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: '#F0721D' }}>↳</span>
                            <span>{INC_MESSAGES[id]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CTAs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {embedded && onBack && (
                      <button
                        onClick={onBack}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-full)',
                          background: 'var(--color-accent-primary)', color: '#fff',
                          fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        Volver al historial de diagnósticos <ArrowRight size={18} />
                      </button>
                    )}
                    {!embedded && (
                      <>
                        {/* Primary CTA */}
                        <button
                          type="button"
                          onClick={() => {
                            if (user) {
                              router.push(`/tools?source=diagnostic&score=${totalScore}&etapa=${profile.etapa}`)
                            } else {
                              openAuthModal('register')
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-full)',
                            background: 'var(--color-accent-primary)', color: '#fff',
                            fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700,
                            border: 'none', cursor: 'pointer',
                            transition: 'background 0.2s, transform 0.2s var(--ease-spring)',
                            letterSpacing: '-0.01em',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-hover)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-primary)' }}
                        >
                          {user ? 'Acceder a mis Herramientas' : 'Crear cuenta y desbloquear herramientas'} <ArrowRight size={18} />
                        </button>

                        {/* Secondary CTA */}
                        <button
                          type="button"
                          disabled={emailSendStatus === 'sending' || emailSendStatus === 'sent'}
                          onClick={async () => {
                            if (!answers.email) {
                              setEmailSendError('No tenemos tu email para enviar los resultados.')
                              setEmailSendStatus('error')
                              return
                            }
                            setEmailSendStatus('sending')
                            setEmailSendError(null)
                            try {
                              const res = await fetch('/api/diagnostic/email-results', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  email: (answers.email || '').toLowerCase(),
                                  nombre: answers.nombre,
                                  startup_name: answers.startup_name,
                                  total_score: totalScore,
                                  perfil_nombre: profile.name,
                                  perfil_etapa: profile.etapa,
                                  dimension_scores: scores,
                                  recommended_tools: recommendedTools,
                                  roadmap: roadmap.bullets,
                                  inconsistencias: inconsistencies.map(id => INC_MESSAGES[id]),
                                }),
                              })
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}))
                                throw new Error(data.error || 'No se pudo enviar el email')
                              }
                              setEmailSendStatus('sent')
                            } catch (err) {
                              console.error('[S4C Sync] email-results client failed:', err)
                              setEmailSendError(err instanceof Error ? err.message : 'Error desconocido')
                              setEmailSendStatus('error')
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-full)',
                            background: emailSendStatus === 'sent' ? 'rgba(31,119,246,0.08)' : 'transparent',
                            border: `1px solid ${emailSendStatus === 'sent' ? '#1F77F6' : 'rgba(255,255,255,0.25)'}`,
                            color: emailSendStatus === 'sent' ? '#1F77F6' : '#ffffff',
                            fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 700,
                            cursor: emailSendStatus === 'sending' || emailSendStatus === 'sent' ? 'default' : 'pointer',
                            transition: 'all 0.2s var(--ease-smooth)',
                            letterSpacing: '-0.01em',
                            opacity: emailSendStatus === 'sending' ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => { if (emailSendStatus === 'idle') e.currentTarget.style.borderColor = '#ffffff' }}
                          onMouseLeave={(e) => { if (emailSendStatus === 'idle') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
                        >
                          {emailSendStatus === 'sending' && (<><Loader2 size={16} className="animate-spin" /> Enviando...</>)}
                          {emailSendStatus === 'sent' && (<><CheckCircle2 size={16} /> Resultados enviados a tu email</>)}
                          {(emailSendStatus === 'idle' || emailSendStatus === 'error') && (<><Mail size={16} /> Enviarme los resultados por email</>)}
                        </button>
                        {emailSendStatus === 'error' && emailSendError && (
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#DA4E24', textAlign: 'center', margin: 0 }}>
                            {emailSendError}
                          </p>
                        )}

                        {/* WhatsApp CTA */}
                        <a
                          href={`https://wa.me/51989338401?text=${encodeURIComponent(
                            `Hola, soy ${answers.nombre || ''} de ${answers.startup_name || 'una startup de impacto'}. ` +
                            `Acabo de completar el diagnóstico S4C (perfil: ${profile.name}, etapa ${profile.etapa}, score ${totalScore}). ` +
                            `Quiero agendar una sesión estratégica con el equipo de Startups4Climate.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-full)',
                            background: 'transparent',
                            border: '1.5px solid rgba(37,211,102,0.4)',
                            color: '#25D366',
                            fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 700,
                            textDecoration: 'none',
                            transition: 'all 0.2s var(--ease-smooth)',
                            letterSpacing: '-0.01em',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,211,102,0.1)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <MessageCircle size={16} /> Agenda una sesión estratégica por WhatsApp
                        </a>
                      </>
                    )}
                  </div>

                  {/* Confirmación de recibido */}
                  {!embedded && (
                    <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
                        <CheckCircle2 size={14} color="#1F77F6" /> Guardamos tu diagnóstico. Si te registras, podrás seguir tu evolución en el tiempo.
                      </p>
                    </div>
                  )}

                  {/* Micro CSS styles for Step 11 responsiveness */}
                  <style>{`
                    @media (max-width: 600px) {
                      .results-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1rem !important;
                      }
                      .stage-pipeline {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 0.75rem !important;
                      }
                      .kpi-grid {
                        grid-template-columns: 1fr !important;
                      }
                      .kpi-cell {
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                      }
                      .kpi-cell.no-border {
                        border-bottom: none !important;
                      }
                    }
                  `}</style>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
