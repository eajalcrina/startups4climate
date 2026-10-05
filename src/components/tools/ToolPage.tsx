'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Target,
  Save,
  Share2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ToolCategoryIcon } from '../illustrations/ToolCategoryIcons'
import {
  getToolById,
  getTransversalPreambulo,
  STAGE_META,
} from '@/lib/tools-data'
import { markToolCompleted, markReportGenerated, getProgress } from '@/lib/progress'
import { generateToolReport } from '@/lib/pdf-generator'
import { Callout, InsightBox, SectionHeader } from '@/components/ui'
import { SectionsProvider } from '@/contexts/SectionsContext'
import { SectionBadge } from '@/components/tools/SectionBadge'
import { ContextPanel } from '@/components/tools/ContextPanel'

// Dynamic imports — only loads the tool component the user navigates to (bundle-dynamic-imports)
// Note: New tools will show "en construcción" until their components are created
const TOOL_COMPONENTS: Record<string, React.ComponentType<ToolComponentProps>> = {
  'founder-profile': dynamic(() => import('./FounderProfile')),
  'problem-exploration': dynamic(() => import('./ProblemExploration')),
  'problem-selection': dynamic(() => import('./ProblemSelection')),
  'empathy-map': dynamic(() => import('./EmpathyMap')),
  'interview-guide': dynamic(() => import('./InterviewGuide')),
  'initial-idea': dynamic(() => import('./InitialIdea')),
  'passion-purpose': dynamic(() => import('./PassionPurpose')),
  'market-segmentation': dynamic(() => import('./MarketSegmentation')),
  'beachhead-market': dynamic(() => import('./BeachheadMarket')),
  'end-user-profile': dynamic(() => import('./EndUserProfile')),
  'tam-calculator': dynamic(() => import('./TAMCalculator')),
  'persona-profile': dynamic(() => import('./PersonaProfile')),
  'full-lifecycle-usecase': dynamic(() => import('./FullLifecycleUseCase')),
  'product-specification': dynamic(() => import('./ProductSpecification')),
  'quantified-value-prop': dynamic(() => import('./QuantifiedValueProp')),
  'first-10-customers': dynamic(() => import('./FirstTenCustomers')),
  'core-competitive-position': dynamic(() => import('./CoreCompetitivePosition')),
  'lean-canvas': dynamic(() => import('./LeanCanvas')),
  'decision-making-unit': dynamic(() => import('./DecisionMakingUnit')),
  'customer-acquisition-process': dynamic(() => import('./CustomerAcquisitionProcess')),
  'business-model-design': dynamic(() => import('./BusinessModelDesign')),
  'pricing-framework': dynamic(() => import('./PricingFramework')),
  'ltv-unit-economics': dynamic(() => import('./UnitEconomics')),
  'sales-process-map': dynamic(() => import('./SalesProcessMap')),
  'key-assumptions': dynamic(() => import('./KeyAssumptions')),
  'key-experiments': dynamic(() => import('./KeyExperiments'), { ssr: false }),
  'mvbp-definition': dynamic(() => import('./MVBPDefinition')),
  'traction-validation': dynamic(() => import('./TractionValidation')),
  'product-plan-scaling': dynamic(() => import('./ProductPlanScaling')),
  'pitch-deck-builder': dynamic(() => import('./PitchDeck')),
  'cap-table-fundraising': dynamic(() => import('./CapTable')),
  'competitor-analysis': dynamic(() => import('./CompetitorAnalysis')),
  'data-room-builder': dynamic(() => import('./DataRoomBuilder')),
  'okr-tracker': dynamic(() => import('./OKRTracker')),
  'regulatory-compass': dynamic(() => import('./RegulatoryCompass')),
  'impact-metrics': dynamic(() => import('./ImpactMetrics')),
  'financial-model-builder': dynamic(() => import('./FinancialModelBuilder')),
}

export interface ToolComponentProps {
  userId: string
  onComplete: () => void
  onGenerateReport: (content: string) => void
  /** Storage key — differs from toolId for transversal tools viewed in a specific stage */
  toolStorageId?: string
}

export default function ToolPage({ toolId, transversalStage }: { toolId: string; transversalStage?: 0 | 1 | 2 | 3 | 4 }) {
  const { user } = useAuth()
  const tool = useMemo(() => getToolById(toolId), [toolId])

  // For transversal tools viewed in a specific stage, use a stage-qualified storage key
  const isTransversalView = !!tool?.transversal && !!transversalStage
  const storageId = isTransversalView ? `${toolId}__stage${transversalStage}` : toolId

  // Override preambulo with stage-specific text for transversal tools
  const preambulo = isTransversalView
    ? (getTransversalPreambulo(toolId, transversalStage) ?? tool?.preambulo)
    : tool?.preambulo

  // Override stage display for transversal tools viewed in another stage
  const displayStageName = isTransversalView
    ? STAGE_META[transversalStage].name
    : tool?.stageName
  const displayStageColor = isTransversalView
    ? STAGE_META[transversalStage].color
    : tool?.stageColor
  const displayStageBg = isTransversalView
    ? STAGE_META[transversalStage].bg
    : tool?.stageBg
  const displayStageBorder = isTransversalView
    ? STAGE_META[transversalStage].border
    : tool?.stageBorder

  const [preambOpen, setPreambOpen] = useState(true)
  const [completed, setCompleted] = useState(() => {
    if (!user) return false
    const p = getProgress(user.id)
    return p[storageId]?.completed ?? false
  })
  const [reportGenerated, setReportGenerated] = useState(() => {
    if (!user) return false
    const p = getProgress(user.id)
    return p[storageId]?.reportGenerated ?? false
  })

  const handleComplete = useCallback(() => {
    if (!user) return
    markToolCompleted(user.id, storageId).catch((err) => {
      console.error('[S4C Sync] Failed to mark tool completed:', err)
    })
    setCompleted(true)
  }, [user, storageId])

  const handleGenerateReport = useCallback(
    (content: string) => {
      if (!user || !tool) return
      markReportGenerated(user.id, storageId).catch((err) => {
        console.error('[S4C Sync] Failed to mark report generated:', err)
      })
      setReportGenerated(true)
      generateToolReport(tool, user, storageId, content)
    },
    [user, storageId, tool]
  )

  if (!tool || !user) return null

  const ToolComponent = TOOL_COMPONENTS[toolId]

  // "Contexto estratégico" sentence used in the Callout — derived from guidingQuestion
  const strategicContext = tool.guidingQuestion
    ? `Responder bien a esta pregunta te acerca al siguiente hito de ${displayStageName?.toLowerCase() ?? 'tu etapa'}: ${tool.guidingQuestion}`
    : `Esta herramienta es clave para avanzar en ${displayStageName?.toLowerCase() ?? 'tu etapa actual'}. Tómate el tiempo para responder con datos reales, no con suposiciones.`

  return (
    <SectionsProvider>
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-primary)' }}>
      {/* Top bar */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 1.5rem',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          gap: '0.5rem',
        }}
        className="lg:top-0 top-11"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <Link
            href="/tools"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <ChevronRight size={12} color="var(--color-border)" />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}
          >
            {displayStageName}
          </span>
          <ChevronRight size={12} color="var(--color-border)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {tool.shortName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          <SectionBadge />
          {reportGenerated && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 8,
                background: 'rgba(31,119,246,0.07)',
                border: '1px solid rgba(31,119,246,0.15)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'var(--color-accent-secondary)',
                textTransform: 'uppercase',
              }}
            >
              <FileText size={11} />
              Reporte generado
            </div>
          )}
          {completed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 8,
                background: `${displayStageColor}10`,
                border: `1px solid ${displayStageColor}22`,
                fontFamily: 'var(--font-body)',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: displayStageColor,
                textTransform: 'uppercase',
              }}
            >
              <CheckCircle2 size={11} />
              Completado
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        <div className="tool-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 228px', gap: '1.5rem', alignItems: 'start', paddingTop: '1.5rem' }}>
        <div>{/* left column start */}
        {/* Tool header — two-column: metadata left, "Lo que producirás" checklist right */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ marginBottom: '2rem' }}
        >
          <div
            style={{
              background: 'rgba(10,10,10,0.82)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              padding: '1rem 1.5rem',
              position: 'sticky',
              top: 44,
              zIndex: 40,
              margin: '0 -1.5rem',
            }}
          >

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
                gap: '1.25rem',
                alignItems: 'center',
              }}
              className="tool-header-grid"
            >
              {/* LEFT — metadata */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', minWidth: 0 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: displayStageBg,
                    border: `1px solid ${displayStageBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    flexDirection: 'column',
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.5rem',
                      color: displayStageColor,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      opacity: 0.75,
                      marginBottom: 1,
                    }}
                  >
                    Paso
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1.125rem',
                      color: displayStageColor,
                      fontWeight: 700,
                    }}
                  >
                    {(tool.stepNumber + 1).toString().padStart(2, '0')}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.625rem',
                        borderRadius: 8,
                        background: displayStageBg,
                        border: `1px solid ${displayStageBorder}`,
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        color: displayStageColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {displayStageName}{isTransversalView && ' · Transversal'}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.625rem',
                        borderRadius: 8,
                        background: 'var(--color-bg-muted)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.625rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      <ToolCategoryIcon category={tool.category} width={11} height={11} color="var(--color-text-muted)" />
                      {tool.category}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.625rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      <Clock size={10} />
                      {tool.estimatedTime}
                    </span>
                  </div>
                  <h1
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)',
                      fontWeight: 400,
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em',
                      marginBottom: '0.5rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {tool.shortName}
                  </h1>
                  {tool.guidingQuestion && (
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.35)',
                        marginBottom: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {tool.guidingQuestion}
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT — "Lo que producirás" checklist */}
              <div
                className="tool-header-outputs"
                style={{
                  background: 'var(--color-bg-muted)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  padding: '1rem 1.125rem',
                  minWidth: 0,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '0.625rem',
                  }}
                >
                  <Target size={12} color={displayStageColor} strokeWidth={2.25} />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Lo que producirás
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {tool.outputs.map((out) => (
                    <li
                      key={out}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.375rem',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.6875rem',
                        color: 'rgba(255,255,255,0.60)',
                        lineHeight: 1.4,
                      }}
                    >
                      <CheckCircle2
                        size={11}
                        color="#3B82F6"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                      {out}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Responsive stack on narrow viewports */}
            <style>{`
              @media (max-width: 720px) {
                .tool-header-grid {
                  grid-template-columns: 1fr !important;
                  gap: 1.25rem !important;
                }
              }
            `}</style>
          </div>
        </motion.div>

        {/* Preámbulo — Why you need this tool */}
        {preambulo && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            style={{ marginBottom: '1.5rem' }}
          >
            <button
              onClick={() => setPreambOpen(!preambOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: preambOpen ? '14px 14px 0 0' : 14,
                background: 'var(--color-bg-card)',
                borderTop: '1px solid var(--color-border)',
                borderRight: '1px solid var(--color-border)',
                borderLeft: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${displayStageColor}10`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <BookOpen size={18} color={displayStageColor} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}>
                  ¿Por qué necesitas esta herramienta?
                </span>
                <span style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.125rem',
                }}>
                  Lee el contexto antes de comenzar
                </span>
              </div>
              <ChevronDown
                size={18}
                color="var(--color-text-muted)"
                style={{
                  transition: 'transform 0.2s',
                  transform: preambOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
            {preambOpen && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  background: 'var(--color-bg-card)',
                  borderRight: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                  borderLeft: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 14px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
                  gap: '1.5rem',
                  alignItems: 'start',
                }}
                className="tool-preamb-grid"
              >
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.8,
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}>
                  {preambulo}
                </p>
                <div
                  style={{
                    background: displayStageBg,
                    border: `1px solid ${displayStageBorder}`,
                    borderRadius: 12,
                    padding: '0.125rem 0',
                  }}
                >
                  <Callout type="important" title="Contexto estratégico">
                    {strategicContext}
                  </Callout>
                </div>
                <style>{`
                  @media (max-width: 720px) {
                    .tool-preamb-grid {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>
              </div>
            )}
          </motion.div>
        )}

        {/* "Cómo usar esta herramienta" — 3 inline tips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          style={{
            marginBottom: '1.5rem',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '0.875rem 1.125rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem 1.25rem',
          }}
          aria-label="Cómo usar esta herramienta"
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            Cómo usar
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.625rem 1rem',
              flex: 1,
              minWidth: 0,
            }}
          >
            {[
              { icon: Target, text: 'Completa los campos con tu realidad actual' },
              { icon: Save, text: 'Guarda tu progreso — se sincroniza automáticamente' },
              { icon: Share2, text: 'Genera un reporte al terminar para compartirlo' },
            ].map(({ icon: Icon, text }, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: `${displayStageColor}12`,
                    color: displayStageColor,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={12} strokeWidth={2.25} />
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tool content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {ToolComponent ? (
            <ToolComponent
              userId={user.id}
              onComplete={handleComplete}
              onGenerateReport={handleGenerateReport}
              toolStorageId={storageId}
            />
          ) : (
            <div
              style={{
                background: 'var(--color-bg-card)',
                borderRadius: 16,
                border: '1px solid var(--color-border)',
                padding: '3rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Herramienta en construcción...
            </div>
          )}
          {/* Recommendations after completion */}
          {completed && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <SectionHeader
                kicker="Siguiente paso"
                title="Recomendaciones para mejorar"
                description="Cuatro acciones simples para sacar el máximo valor de lo que acabas de completar."
              />
              <InsightBox variant="tip" title="Itera con datos reales, no con suposiciones">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    lineHeight: 1.6,
                  }}
                >
                  <li>Revisa tus respuestas con tu equipo cofundador y busca puntos ciegos.</li>
                  <li>Valida la información con datos reales de tu mercado, no suposiciones.</li>
                  <li>Genera el reporte y compártelo con un mentor o advisor para feedback externo.</li>
                  <li>Itera: esta herramienta no se llena una sola vez. Vuelve a ella conforme avances.</li>
                </ul>
              </InsightBox>
            </div>
          )}
        </motion.div>
        </div>{/* left column end */}

        {/* Right: ContextPanel */}
        <div>
          <ContextPanel toolId={toolId} activeSectionLabel="" />
        </div>
        </div>{/* tool-content-grid end */}

        <style>{`
          @media (max-width: 768px) {
            .tool-content-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
    </SectionsProvider>
  )
}
