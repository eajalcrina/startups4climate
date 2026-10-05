interface StartupData {
  name?: string
  vertical?: string
  country?: string
  stage?: string
  diagnostic_score?: number
  team_size?: number
  revenue_model?: string
  monthly_revenue?: number
  tam_usd?: number
  has_paying_customers?: boolean
  paying_customers_count?: number
  description?: string
  website?: string
}

interface ToolProgress {
  tool_id: string
  completed: boolean
  data?: Record<string, unknown>
}

interface ProfileData {
  id: string
  email: string
  role?: string
  full_name?: string
  org_id?: string | null
  startup_name?: string
  stage?: string
  diagnostic_score?: number
}

export function buildStartupContext(
  startup: StartupData | null,
  progress: ToolProgress[] | null,
  profile?: ProfileData | null,
  userContext?: Record<string, unknown>
): string {
  const parts: string[] = []

  // Always include founder info from profile first
  if (profile) {
    if (profile.full_name) parts.push(`FOUNDER: ${profile.full_name}`)
    if (profile.role) parts.push(`ROL DEL FOUNDER: ${profile.role}`)
  }

  if (startup) {
    parts.push(`STARTUP: ${startup.name || 'Sin nombre'}`)
    parts.push(`VERTICAL: ${startup.vertical || 'No definida'}`)
    parts.push(`PAIS: ${startup.country || 'No definido'}`)
    parts.push(`ETAPA: ${startup.stage || profile?.stage || 'No definida'}`)
    parts.push(`SCORE DIAGNOSTICO: ${startup.diagnostic_score || profile?.diagnostic_score || 'No completado'}/100`)
    parts.push(`EQUIPO: ${startup.team_size || 'No definido'} personas`)
    parts.push(`MODELO DE INGRESOS: ${startup.revenue_model || 'No definido'}`)
    parts.push(`INGRESOS MENSUALES: ${startup.monthly_revenue ? '$' + startup.monthly_revenue + ' USD' : 'No reportados'}`)
    parts.push(`TAM: ${startup.tam_usd ? '$' + startup.tam_usd + ' USD' : 'No calculado'}`)
    parts.push(`CLIENTES PAGANDO: ${startup.has_paying_customers ? 'Si (' + startup.paying_customers_count + ')' : 'No'}`)
    if (startup.description) parts.push(`DESCRIPCION: ${startup.description}`)
    if (startup.website) parts.push(`WEBSITE: ${startup.website}`)
  } else if (profile) {
    // Fallback: use profile data when startups table has no row
    if (profile.startup_name) {
      parts.push(`STARTUP: ${profile.startup_name}`)
    } else {
      parts.push('STARTUP: Sin nombre')
    }
    if (profile.stage) parts.push(`ETAPA: ${profile.stage}`)
    if (profile.diagnostic_score) parts.push(`SCORE DIAGNÓSTICO: ${profile.diagnostic_score}/100`)
    parts.push('(Datos detallados de la startup aún no registrados. Pide al founder que complete su perfil para darte más contexto.)')
  } else {
    parts.push('No hay datos de la startup ni del founder registrados aún.')
  }

  // Completed tools from Supabase (real users)
  const completedTools = progress?.filter((p) => p.completed) || []

  // Merge client-side profile context (from localStorage / auth)
  // For demo users this is the primary source of truth
  if (userContext && Object.keys(userContext).length > 0) {
    if (userContext.name) parts.push(`FOUNDER (nombre): ${userContext.name}`)
    if (userContext.startup) parts.push(`STARTUP (nombre): ${userContext.startup}`)
    if (userContext.stage) parts.push(`ETAPA (perfil): ${userContext.stage}`)
    if (userContext.diagnosticScore) parts.push(`SCORE DIAGNOSTICO (perfil): ${userContext.diagnosticScore}/100`)
    if (userContext.vertical) parts.push(`VERTICAL (perfil): ${userContext.vertical}`)
    if (userContext.country) parts.push(`PAÍS (perfil): ${userContext.country}`)
    if (userContext.region) parts.push(`REGIÓN: ${userContext.region}`)
    if (userContext.role) parts.push(`ROL DEL FOUNDER: ${userContext.role}`)
    if (userContext.experience) parts.push(`EXPERIENCIA: ${userContext.experience}`)
    if (userContext.description || userContext.descripcion) parts.push(`DESCRIPCIÓN: ${userContext.description || userContext.descripcion}`)
    if (userContext.teamSize) parts.push(`EQUIPO: ${userContext.teamSize} personas`)
    if (userContext.foundedYear) parts.push(`AÑO FUNDACIÓN: ${userContext.foundedYear}`)
    if (userContext.businessModel) parts.push(`MODELO DE NEGOCIO: ${userContext.businessModel}`)
    if (userContext.currentMRR) parts.push(`MRR ACTUAL: $${userContext.currentMRR} USD`)
    if (userContext.totalFunding) parts.push(`FUNDING TOTAL: $${userContext.totalFunding} USD`)
    if (userContext.pricingModel) parts.push(`PRICING: ${userContext.pricingModel}`)
    if (userContext.mainCustomers) parts.push(`CLIENTES PRINCIPALES: ${userContext.mainCustomers}`)
    if (Array.isArray(userContext.certifications) && userContext.certifications.length > 0)
      parts.push(`CERTIFICACIONES: ${(userContext.certifications as string[]).join(', ')}`)
    if (Array.isArray(userContext.sdgImpact) && userContext.sdgImpact.length > 0)
      parts.push(`ODS DE IMPACTO: ${(userContext.sdgImpact as string[]).join(', ')}`)
    if (userContext.mainChallenges) parts.push(`PRINCIPALES RETOS: ${userContext.mainChallenges}`)
    if (userContext.website) parts.push(`WEBSITE: ${userContext.website}`)
    if (userContext.linkedin) parts.push(`LINKEDIN: ${userContext.linkedin}`)
  }

  // Completed tool count — merge from both sources
  const clientCompletedTools = Array.isArray(userContext?.completedTools)
    ? (userContext!.completedTools as string[])
    : []
  const totalCompleted = completedTools.length > 0
    ? completedTools.length
    : clientCompletedTools.length

  parts.push(`\nHERRAMIENTAS COMPLETADAS: ${totalCompleted}/30`)

  if (completedTools.length > 0) {
    parts.push(`HERRAMIENTAS (Supabase): ${completedTools.map((t) => t.tool_id).join(', ')}`)
  }
  if (clientCompletedTools.length > 0 && completedTools.length === 0) {
    parts.push(`HERRAMIENTAS COMPLETADAS (lista): ${clientCompletedTools.join(', ')}`)
  }

  // Rich tool data summaries from localStorage (available for demo + real users)
  if (userContext?.toolData && typeof userContext.toolData === 'object') {
    const toolData = userContext.toolData as Record<string, Record<string, unknown>>
    const toolSections: string[] = []

    const TOOL_LABELS: Record<string, string> = {
      'passion-purpose': 'Pasión y propósito',
      'market-segmentation': 'Segmentación de mercado',
      'beachhead-market': 'Mercado de entrada',
      'end-user-profile': 'Perfil del usuario',
      'lean-canvas': 'Lean Canvas',
      'tam-calculator': 'TAM/SAM/SOM',
      'mvbp-definition': 'MVBP Definition',
      'traction-validation': 'Tracción y validación',
      'ltv-unit-economics': 'Unit Economics',
      'unit-economics': 'Unit Economics',
      'product-plan-scaling': 'Plan de producto y escalado',
      'pitch-deck-builder': 'Pitch Deck',
      'cap-table-fundraising': 'Cap Table y fundraising',
      'data-room-builder': 'Data Room',
      'financial-model-builder': 'Modelo financiero',
    }

    for (const [toolId, data] of Object.entries(toolData)) {
      if (!data || Object.keys(data).length === 0) continue
      const label = TOOL_LABELS[toolId] || toolId
      const lines: string[] = [`[${label}]`]

      // Extract meaningful values concisely
      for (const [k, v] of Object.entries(data)) {
        if (v === null || v === undefined || v === '') continue
        const strVal = Array.isArray(v)
          ? (v as unknown[]).map((x) => (typeof x === 'object' ? JSON.stringify(x).slice(0, 80) : String(x))).slice(0, 3).join(' | ')
          : typeof v === 'object'
            ? JSON.stringify(v).slice(0, 150)
            : String(v).slice(0, 200)
        lines.push(`  ${k}: ${strVal}`)
      }
      toolSections.push(lines.join('\n'))
    }

    if (toolSections.length > 0) {
      parts.push(`\nDATOS DETALLADOS DE HERRAMIENTAS COMPLETADAS:\n${toolSections.join('\n\n')}`)
    }
  }

  return parts.join('\n')
}
