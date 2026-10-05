/**
 * Demo user fixtures and founder seed data (localStorage) for the public
 * demo routes. Moved out of AuthContext; AuthContext re-exports the ids
 * and isDemoUserId so existing imports keep working.
 */
import type { AppUser } from '@/context/AuthContext'

export const DEMO_FOUNDER_ID = 'demo-founder-0000-0000-0000-000000000001'
export const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000002'
export const DEMO_ORG_ID = 'demo-org-0000-0000-0000-000000000003'
export const DEMO_SUPERADMIN_ID = 'demo-super-0000-0000-0000-000000000004'

export const DEMO_FOUNDER_USER: AppUser = {
  id: DEMO_FOUNDER_ID,
  email: 'demo.founder@s4c.demo',
  role: 'founder',
  org_id: null,
  full_name: 'Ana Quispe (Demo)',
  startup_name: 'EcoBio Perú',
  stage: 'ideacion',
  diagnosticScore: 84,
  created_at: new Date().toISOString(),
}

export const DEMO_ADMIN_USER: AppUser = {
  id: DEMO_ADMIN_ID,
  email: 'demo.admin@s4c.demo',
  role: 'admin_org',
  org_id: DEMO_ORG_ID,
  full_name: 'Universidad BioInnova',
  startup_name: null,
  stage: null,
  diagnosticScore: null,
  created_at: new Date().toISOString(),
}

export const DEMO_SUPERADMIN_USER: AppUser = {
  id: DEMO_SUPERADMIN_ID,
  email: 'minpro@s4c.demo',
  role: 'superadmin',
  org_id: null,
  full_name: 'Ministerio de la Producción (Demo)',
  startup_name: null,
  stage: null,
  diagnosticScore: null,
  created_at: new Date().toISOString(),
}

/** True if a user id belongs to one of our demo fixtures. */
export function isDemoUserId(id: string | null | undefined): boolean {
  return id === DEMO_FOUNDER_ID || id === DEMO_ADMIN_ID || id === DEMO_SUPERADMIN_ID
}

/** Seed some example tool progress into localStorage so demo founder has content. */
export function seedDemoFounderData() {
  if (typeof window === 'undefined') return
  const SEED_VERSION = '5'  // Bump this when seed data changes
  const versionKey = `s4c_${DEMO_FOUNDER_ID}_seed_version`
  try {
    const currentVersion = localStorage.getItem(versionKey)
    if (currentVersion === SEED_VERSION) return
  } catch { /* ignore */ }
  const key = `s4c_${DEMO_FOUNDER_ID}_tool_progress`

  const now = new Date().toISOString()
  const seeded = {
    // ─── Stage 1: Descubrimiento (all completed) ───
    'passion-purpose': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        pasion: 'Reducir la contaminación plástica en la Amazonía peruana mediante biomateriales innovadores derivados de residuos agroindustriales locales.',
        proposito: 'Crear una economía circular que empodere a comunidades amazónicas, transformando residuos en empaques de alta performance que compitan con el plástico convencional.',
        problemaReal: 'América Latina genera 541,000 toneladas de plástico de un solo uso al año en el sector food service. El 91% termina en vertederos o ecosistemas naturales. Las alternativas importadas cuestan 3-4x más.',
        motivacionPersonal: 'Crecí en Puerto Maldonado viendo cómo la contaminación plástica afectaba los ríos amazónicos. Mi tesis en la PUCP fue sobre biomateriales con fibra de coco.',
      },
    },
    'market-segmentation': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        segmentos: 'Restaurantes sostenibles premium, cadenas de hoteles eco-certificados, retail orgánico y supermercados con línea verde, servicios de catering corporativo, foodservice institucional (universidades, hospitales).',
        criteriosSegmentacion: 'Volumen de compra mensual de empaques, compromiso con sostenibilidad (certificaciones), capacidad de pago premium (15-20% sobre convencional), ubicación geográfica (Lima, Cusco, Arequipa).',
        segmentoPrioritario: 'Restaurantes premium y cadenas de hoteles en Lima con certificación o compromiso ESG — 800+ establecimientos identificados, ticket promedio alto, decisión de compra rápida.',
      },
    },
    'beachhead-market': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        mercado: 'Restaurantes boutique y cadenas gastronómicas premium en Lima Metropolitana (Miraflores, Barranco, San Isidro). 800 locales estimados, con gasto promedio en empaques de $1,200/mes.',
        tamanoMercado: '800 restaurantes × $1,200/mes × 12 = $11.5M/año en Lima solamente.',
        razones: '1. Alta disposición a pagar por sostenibilidad (marca premium). 2. Regulación municipal que prohíbe plásticos de un solo uso desde 2024. 3. Presión de consumidores (78% prefiere restaurantes eco-friendly según Datum 2025). 4. Red de chefs influyentes que actúan como early adopters.',
        estrategiaEntrada: 'Partner con la Sociedad Peruana de Gastronomía (APEGA) para acceso directo a decisores. Piloto con 5 restaurantes top en Miraflores como caso de éxito.',
      },
    },
    'end-user-profile': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        nombre: 'Carlos, Gerente de Operaciones de restaurante premium',
        edad: '35-50 años',
        rol: 'Gerente de operaciones o dueño de restaurante/cadena gastronómica',
        frustraciones: 'Costos crecientes de empaques importados, presión regulatoria para eliminar plásticos, clientes que exigen prácticas sostenibles, proveedores de empaques eco poco confiables.',
        necesidades: 'Empaques compostables que sean resistentes (no se filtren ni se rompan), precio competitivo vs importados, suministro confiable y puntual, historia de impacto para comunicar a clientes.',
        comportamiento: 'Compra quincenal o mensual, decide en 2-3 semanas, prueba con pedido pequeño antes de comprometer volumen. Valora relación directa con proveedor.',
      },
    },
    'tam-calculator': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        tam: '2400000000',
        sam: '340000000',
        som: '18000000',
        metodologia: 'TAM: Mercado global de empaques sostenibles para food service en LATAM ($2.4B, Mordor Intelligence 2025). SAM: Perú + Colombia + Chile — restaurantes, hoteles y retail con compromiso sostenible ($340M). SOM: Lima + Cusco + Arequipa, segmento premium con capacidad de distribución actual ($18M en 24 meses).',
        fuentesDatos: 'Mordor Intelligence 2025, Euromonitor Perú, INEI censo económico, APEGA base de datos.',
        supuestos: 'Penetración del 5.3% del SAM en 24 meses, precio promedio por cliente $950/mes, retención del 85%.',
      },
    },
    'persona-profile': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        nombre: 'María del Carmen Rodríguez',
        cargo: 'Directora de Compras, cadena de restaurantes "Sabores del Pacífico" (12 locales)',
        edad: '42 años',
        ubicacion: 'Lima, Perú',
        objetivos: 'Reducir huella de carbono de la cadena en 30% para 2027. Cumplir con ordenanza municipal anti-plástico. Mantener costos operativos estables.',
        dolores: 'Proveedores de empaques eco que no cumplen entregas a tiempo. Empaques compostables importados que cuestan 3.5x más. Empaques que se rompen con sopas y líquidos calientes.',
        canalPreferido: 'WhatsApp Business para pedidos rápidos, reunión presencial para cerrar contrato anual.',
        presupuesto: '$14,400/año en empaques para 12 locales.',
      },
    },

    // ─── Stage 2: Validación (all completed) ───
    'full-lifecycle-usecase': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        casoDeUso: 'Restaurante premium pide empaques para delivery/takeout → EcoBio entrega en 48h → Chef empaca comida → Cliente recibe empaque con branding del restaurante + sello compostable → Cliente desecha en basura orgánica → Empaque se descompone en 90 días → Restaurante recibe reporte de impacto mensual.',
        puntosDeFriccion: '1. Primer pedido requiere calibración de tamaños. 2. Capacitación al staff sobre almacenamiento (evitar humedad). 3. Integración con sistema de pedidos del restaurante.',
        metricas: 'Tiempo de entrega: 48h Lima, 72h provincias. Tasa de reorden: 92%. NPS: 78. Vida útil del empaque: 6 meses almacenado, 90 días para descomposición.',
      },
    },
    'product-specification': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        producto: 'Línea de empaques compostables EcoBio: contenedores (500ml, 750ml, 1000ml), platos (7", 9"), bowls (12oz, 16oz, 32oz), vasos para bebidas calientes (8oz, 12oz, 16oz).',
        material: 'Fibra de bagazo de caña + almidón de yuca amazónica. Recubrimiento impermeabilizante con cera de carnaúba (100% vegetal).',
        especificaciones: 'Resistencia térmica: -20°C a 120°C. Resistencia a líquidos: 4+ horas sin filtración. Microondeable. Certificación compostable EN 13432. Libre de PFAS.',
        diferenciador: '40% más barato que alternativas importadas europeas. Materia prima 100% local. Huella de carbono 73% menor que plástico convencional.',
      },
    },
    'quantified-value-prop': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        propuesta: 'EcoBio reduce tu gasto en empaques sostenibles en 40% vs importados europeos, mientras eliminas el 100% del plástico de un solo uso y comunicas impacto real a tus clientes.',
        metricasValor: 'Ahorro promedio: $480/mes por local vs empaques importados. Reducción de CO2: 2.3 toneladas/año por restaurante. Cumplimiento regulatorio inmediato. Incremento de 12% en percepción de marca según encuesta a comensales.',
        evidencia: 'Piloto con 5 restaurantes en Miraflores (3 meses): ahorro promedio de $520/mes, cero quejas por calidad, 94% satisfacción del staff.',
      },
    },
    'first-10-customers': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        clientes: [
          { nombre: 'Sabores del Pacífico (12 locales)', estado: 'Contrato anual', mrr: '$4,800' },
          { nombre: 'Hotel Belmond Miraflores', estado: 'Contrato anual', mrr: '$3,200' },
          { nombre: 'Central Restaurante', estado: 'Contrato semestral', mrr: '$2,100' },
          { nombre: 'Maido', estado: 'Contrato semestral', mrr: '$1,800' },
          { nombre: 'Hilton Lima Miraflores', estado: 'Contrato anual', mrr: '$5,600' },
          { nombre: 'Astrid & Gastón', estado: 'Contrato trimestral', mrr: '$1,900' },
          { nombre: 'La Mar Cebichería', estado: 'Contrato semestral', mrr: '$2,400' },
          { nombre: 'Marriott Lima', estado: 'Contrato anual', mrr: '$4,200' },
          { nombre: 'IK Restaurante', estado: 'Contrato trimestral', mrr: '$1,600' },
          { nombre: 'Panchita (Grupo Acurio)', estado: 'Piloto', mrr: '$1,100' },
        ],
        payingCustomers: 23,
        totalMRR: '$47,000',
        estrategia: 'Venta directa B2B con demo de producto en restaurante. Piloto gratuito de 2 semanas (50 unidades). Conversión de piloto a contrato: 87%.',
        aprendizajes: 'Los hoteles tienen ciclos de compra más largos (45-60 días) pero tickets 3x mayores. Restaurantes cierran en 2-3 semanas. El boca a boca entre chefs es el canal #1.',
      },
    },
    'core-competitive-position': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        posicion: 'Único fabricante de empaques compostables con materia prima 100% amazónica en Perú. Combinación de precio competitivo (40% menos que importados) + supply chain local + certificación internacional.',
        competidores: '1. Biopak (Australia) — premium, 3x precio. 2. Vegware (UK) — buena calidad, importación cara y lenta. 3. EcoProducts (US) — no distribuye en Perú. 4. Artesanos locales — sin escala ni certificación.',
        ventajaDefendible: 'Patentes en proceso (3) sobre formulación de biomaterial con fibras amazónicas. Contratos de suministro exclusivo con 4 cooperativas agrícolas en Madre de Dios. Certificación EN 13432 (barrera de entrada de 18 meses).',
        moat: 'Vertically integrated: controlamos desde la materia prima (alianzas con cooperativas) hasta la entrega. Esto nos da 62% de margen bruto vs 35-40% de revendedores de importados.',
      },
    },
    'lean-canvas': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        problem: '1. Empaques de plástico de un solo uso contaminan y enfrentan prohibiciones regulatorias crecientes.\n2. Alternativas compostables importadas cuestan 3-4x más, haciendo inviable la transición.\n3. No existe un fabricante local de empaques compostables certificados en Perú.',
        customerSegments: 'Restaurantes premium y cadenas gastronómicas en Lima (primary). Hoteles eco-certificados (secondary). Retail orgánico y catering corporativo (tertiary).',
        uvp: 'Empaques 100% compostables hechos con fibras amazónicas — 40% más baratos que importados, con certificación internacional y entrega en 48h.',
        solution: 'Línea completa de empaques compostables (contenedores, platos, bowls, vasos) fabricados con bagazo de caña + almidón de yuca amazónica.',
        channels: 'Venta directa B2B, partnerships con APEGA y gremios hoteleros, marketplace propio para reorden automatizado.',
        revenueStreams: 'Venta de empaques (suscripción mensual recurrente), branding personalizado (+15% premium), reportes de impacto ambiental para ESG.',
        costStructure: 'Materia prima (23%), manufactura (18%), logística (12%), equipo (35%), marketing (7%), overhead (5%).',
        keyMetrics: 'MRR, churn rate, margen bruto, NPS, toneladas de plástico evitadas.',
        unfairAdvantage: '3 patentes en proceso, contratos exclusivos con cooperativas amazónicas, certificación EN 13432.',
      },
    },
    'competitor-analysis': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        competidores: [
          { nombre: 'Biopak', fortalezas: 'Marca global, amplio catálogo', debilidades: 'Precio 3x mayor, no tiene presencia local en Perú', amenaza: 'Media' },
          { nombre: 'Vegware', fortalezas: 'Buena calidad, certificaciones europeas', debilidades: 'Tiempos de importación de 6-8 semanas, costo de flete', amenaza: 'Media' },
          { nombre: 'Artesanos locales', fortalezas: 'Precio bajo, producción local', debilidades: 'Sin certificación, calidad inconsistente, no escalan', amenaza: 'Baja' },
        ],
        ventajaCompetitiva: 'Somos el único jugador que combina: fabricación local (entrega 48h), precio competitivo (40% menos que importados), certificación internacional (EN 13432), y materia prima amazónica sostenible.',
        estrategiaDefensiva: 'Patentes + contratos de suministro exclusivo + certificaciones = barrera de entrada de 18-24 meses para cualquier competidor.',
      },
    },
    'impact-metrics': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        co2Avoided: '847 toneladas CO2eq/año (proyección a 100 clientes)',
        wasteDiverted: '234 toneladas de plástico de un solo uso evitadas/año',
        comunidadesBeneficiadas: '4 cooperativas agrícolas en Madre de Dios (120+ familias)',
        empleosGenerados: '8 directos + 45 indirectos (cooperativas y logística)',
        metricaODS: 'ODS 12 (Producción responsable): 100% productos compostables. ODS 13 (Acción climática): reducción de 73% en huella de carbono vs plástico. ODS 8 (Trabajo decente): salarios 30% sobre promedio regional para cooperativistas.',
        impactoActual: 'A la fecha: 38 toneladas de plástico evitadas, 127 toneladas CO2eq reducidas, 4 cooperativas con contratos estables.',
        metodologiaMedicion: 'LCA (Life Cycle Assessment) validado por SGS Perú. Medición trimestral con reportes a clientes.',
      },
    },

    // ─── Stage 3: Aceleración (mostly completed) ───
    'decision-making-unit': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        decisor: 'Gerente de Operaciones o Director de Compras (firma contrato, aprueba presupuesto)',
        influenciador: 'Chef ejecutivo (valida calidad del producto), Gerente de Sostenibilidad/ESG (valida impacto ambiental)',
        usuario: 'Staff de cocina y empaque (usa el producto diariamente)',
        bloqueador: 'Área financiera (si el precio no es competitivo), Legal (revisión de contrato de suministro)',
        procesoPago: 'Factura a 30 días para contratos anuales, pago contra entrega para pedidos spot. Moneda: PEN o USD.',
        tiempoDecision: 'Restaurantes independientes: 2-3 semanas. Cadenas/hoteles: 45-60 días. Corporativos: 60-90 días.',
      },
    },
    'customer-acquisition-process': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        etapas: '1. Prospección (LinkedIn, APEGA, referidos) → 2. Demo en restaurante (muestra gratis) → 3. Piloto 2 semanas (50 unidades) → 4. Evaluación con chef y operaciones → 5. Propuesta comercial → 6. Cierre de contrato',
        tasaConversion: 'Prospecto → Demo: 35%. Demo → Piloto: 72%. Piloto → Contrato: 87%. Total funnel: 22%.',
        cac: '$3,200 (incluye muestras, tiempo de vendedor, demo)',
        tiempoCierre: 'Promedio 28 días para restaurantes, 52 días para hoteles.',
        canalMasEfectivo: 'Referidos de chefs existentes (CAC: $1,800, conversión 45%). LinkedIn outbound (CAC: $4,100, conversión 18%).',
      },
    },
    'business-model-design': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        modelo: 'B2B SaaS + Product: suscripción mensual para pedidos recurrentes de empaques con plataforma de reorden + reportes de impacto.',
        flujos: '1. Venta de empaques (85% revenue) — suscripción mensual con descuento por volumen. 2. Branding personalizado (10%) — impresión del logo del cliente en empaques (+15% premium). 3. Reportes de impacto ESG (5%) — dashboard y certificado trimestral.',
        unitEconomics: 'ARPU: $2,040/mes. Gross margin: 62%. Contribution margin: 48%.',
        escalabilidad: 'Modelo replicable en Colombia y Chile sin necesidad de planta propia (partner manufacturing). Plataforma de reorden automatiza el 70% de pedidos recurrentes.',
      },
    },
    'pricing-framework': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        estrategia: 'Value-based pricing: posicionamos al 60% del precio de importados europeos pero 15-20% sobre plástico convencional. El valor percibido (cumplimiento regulatorio + marketing sostenible) justifica el premium.',
        planes: [
          { nombre: 'Starter', precio: '$800/mes', incluye: 'Hasta 2,000 unidades, 3 productos, entrega quincenal' },
          { nombre: 'Growth', precio: '$1,800/mes', incluye: 'Hasta 5,000 unidades, catálogo completo, entrega semanal, branding básico' },
          { nombre: 'Enterprise', precio: '$4,500+/mes', incluye: 'Volumen ilimitado, branding premium, reportes ESG, account manager dedicado' },
        ],
        descuentos: 'Contrato anual: -10%. Contrato semestral: -5%. Referido: $200 crédito para ambas partes.',
      },
    },
    'ltv-unit-economics': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        ltv: '28500',
        cac: '3200',
        ltvCacRatio: '8.9',
        paybackMonths: '4.2',
        churnRate: '8% anual (< 1% mensual)',
        arpu: '$2,040/mes',
        grossMargin: '62%',
        contributionMargin: '48%',
        cohortAnalysis: 'Cohorte Q3 2025: 100% retención a 6 meses. Cohorte Q1 2026: 96% retención a 3 meses. Expansión neta: 115% (clientes aumentan pedidos con el tiempo).',
      },
    },
    'sales-process-map': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        proceso: '1. Identificación (LinkedIn Sales Navigator + base APEGA) → 2. Contacto inicial (email personalizado + WhatsApp) → 3. Demo presencial con muestras → 4. Piloto gratuito 2 semanas → 5. Follow-up con métricas del piloto → 6. Propuesta comercial → 7. Negociación → 8. Firma contrato → 9. Onboarding (capacitación staff) → 10. Primera entrega',
        herramientas: 'CRM: HubSpot (free). Comunicación: WhatsApp Business. Propuestas: Canva + Google Docs. Facturación: Nubefact.',
        kpis: 'Meetings/semana: 8. Pilotos activos: 4-5. Win rate: 22%. Deal size promedio: $24,500/año.',
        equipo: '1 sales lead (Ana) + 1 SDR (medio tiempo). Plan: contratar 2 SDRs al cerrar ronda.',
      },
    },
    'okr-tracker': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        periodo: 'Q2 2026',
        okrs: [
          {
            objetivo: 'Alcanzar $60K MRR para fin de Q2',
            resultados: [
              { kr: 'Cerrar 8 nuevos clientes Enterprise', progreso: 65 },
              { kr: 'Aumentar ARPU a $2,400/mes', progreso: 80 },
              { kr: 'Reducir churn a < 5% anual', progreso: 90 },
            ],
          },
          {
            objetivo: 'Preparar operaciones para escalar a Colombia',
            resultados: [
              { kr: 'Firmar 1 partner de manufactura en Bogotá', progreso: 40 },
              { kr: 'Obtener certificación INVIMA', progreso: 20 },
              { kr: 'Pipeline de 15 prospectos en Colombia', progreso: 55 },
            ],
          },
          {
            objetivo: 'Cerrar ronda pre-seed de $500K',
            resultados: [
              { kr: 'Pitch a 20 inversionistas', progreso: 70 },
              { kr: 'Terminar due diligence con 3 fondos interesados', progreso: 45 },
              { kr: 'Data room completo y actualizado', progreso: 85 },
            ],
          },
        ],
      },
    },
    'regulatory-compass': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        regulaciones: [
          { nombre: 'Ley 30884 — Plásticos de un solo uso (Perú)', estado: 'Cumplimiento total', impacto: 'Positivo — genera demanda de nuestros productos' },
          { nombre: 'EN 13432 — Compostabilidad', estado: 'Certificación obtenida (SGS)', impacto: 'Diferenciador clave vs competencia local' },
          { nombre: 'DIGESA — Registro sanitario', estado: 'Vigente hasta 2028', impacto: 'Requisito para venta a food service' },
          { nombre: 'Ordenanza municipal Lima — Prohibición plásticos', estado: 'Cumplimiento total', impacto: 'Acelera conversión de clientes en Lima' },
        ],
        riesgos: 'Si se relaja la regulación anti-plástico, la presión de precio vs convencional aumenta. Mitigación: nuestro precio ya es solo 15-20% sobre convencional.',
        patentes: '3 patentes en proceso ante INDECOPI: formulación de biomaterial (PE-2024-001234), proceso de recubrimiento (PE-2024-001567), sistema de compostaje acelerado (PE-2025-000891).',
      },
    },

    // ─── Stage 4: Escalamiento (partially started) ───
    'key-assumptions': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        supuestos: [
          { supuesto: 'La regulación anti-plástico se mantendrá o endurecerá en LATAM', riesgo: 'Medio', validacion: 'Validado — 14 países LATAM con legislación activa, tendencia global irreversible' },
          { supuesto: 'Podemos mantener 62% de margen bruto al escalar', riesgo: 'Alto', validacion: 'Parcialmente validado — negociando contratos de suministro a 2 años para fijar costos' },
          { supuesto: 'El CAC se mantiene bajo $4,000 al entrar a nuevos mercados', riesgo: 'Alto', validacion: 'No validado — Colombia puede requerir CAC mayor por falta de marca' },
          { supuesto: 'Podemos replicar manufactura con partners en otros países', riesgo: 'Medio', validacion: 'En validación — 2 partners potenciales en Colombia identificados' },
        ],
      },
    },
    'mvbp-definition': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        hipotesis: 'Si ofrecemos una bandeja de empaque compostable hecha 100% con cáscara de cacao y bagazo de yuca a un precio 35% menor que las alternativas importadas europeas, los cafés y restaurantes premium de Lima estarán dispuestos a sustituir sus envases de plástico de un solo uso, validando demanda real para escalar producción industrial.',
        mvbp: 'Bandeja compostable EcoBio T1 (300ml/500ml/750ml) — fabricada con cáscara de cacao seca y bagazo de yuca amazónica, recubrimiento de cera de carnaúba. Producción artesanal en taller de Puerto Maldonado: 8,000 unidades/semana.',
        descripcionMVP: 'Distribuimos la bandeja T1 a 3 cafés boutique en Lima (Bisetti Barranco, Tostaduría Bisetti Miraflores, Café Verde San Isidro) con un piloto de 6 semanas. Cada local recibe 1,200 unidades/semana, capacitación al staff sobre almacenamiento, y un dashboard semanal con kg de plástico evitados. Pago: factura a 30 días, precio S/0.85 por unidad vs S/1.30 de la alternativa europea.',
        criteriosExito: [
          { criterio: 'Tasa de reorden ≥ 80% al final del piloto', meta: '80%', resultado: '100% (3/3 cafés renovaron)' },
          { criterio: 'Cero quejas estructurales (rotura, filtración)', meta: '0', resultado: '0 quejas en 21,600 unidades' },
          { criterio: 'NPS del staff ≥ 60', meta: '60', resultado: '74' },
          { criterio: 'Margen bruto ≥ 55%', meta: '55%', resultado: '61%' },
          { criterio: 'Disposición a pagar precio premium en producción industrial', meta: 'Sí', resultado: 'Sí — 3/3 firmaron carta de intención por 6 meses' },
        ],
        funcionalidades: '1. Bandeja resistente a líquidos calientes hasta 95°C por 4h. 2. Microondeable hasta 3 minutos. 3. Composta en 90 días en condiciones industriales (validado con SGS). 4. Branding del café impreso con tinta vegetal sin costo adicional para el piloto. 5. Reporte semanal de impacto enviado por WhatsApp.',
        metricas: 'Adoption rate piloto: 100%. Reducción de carga operativa para clientes: no aplica (sustitución directa). NPS clientes: 82. NPS staff de cocina: 74. Tasa de reposición: cero defectos.',
        resultados: 'Piloto cerrado en febrero 2026 con conversión 3/3 a contrato semestral. Generó $4,200 de revenue durante el piloto y validó el modelo industrial de 200K unidades/mes. Aprendizaje clave: la cáscara de cacao da una textura diferenciada que los baristas valoran como argumento de venta a clientes finales (no es solo "verde", es "amazónico de origen verificable").',
        timeline: 'Diseño y prototipo: 4 semanas (oct-nov 2025). Piloto comercial: 6 semanas (dic 2025-ene 2026). Análisis y refinamiento: 2 semanas. Total MVP a validación: 12 semanas.',
        proximosPasos: 'Inversión en molde industrial Q2 2026 (USD $48K), automatización de prensado para llegar a 200K unidades/mes en Q4 2026, y obtención de certificación TÜV Compostable para abrir el mercado de exportación a Chile y Colombia.',
      },
    },
    'traction-validation': {
      completed: true,
      completedAt: now,
      reportGenerated: true,
      lastSaved: now,
      data: {
        traccion: 'MRR: $47,000 (S/178,600). 23 clientes B2B activos pagando. Crecimiento promedio: 12% MoM en los últimos 6 meses. Churn mensual: 3% (<1 cliente/mes). NPS: 71. Repeat purchase rate: 84%. Net revenue retention: 118% (los clientes existentes aumentan pedidos cada trimestre).',
        canalesValidados: [
          { canal: 'Referidos de chefs/baristas existentes', cac: '$1,650', conversion: '47%', volumen: '8 clientes/trimestre' },
          { canal: 'APEGA (Sociedad Peruana de Gastronomía)', cac: '$2,400', conversion: '32%', volumen: '5 clientes/trimestre' },
          { canal: 'LinkedIn outbound a gerentes de operaciones', cac: '$3,800', conversion: '14%', volumen: '4 clientes/trimestre' },
          { canal: 'Eventos: Mistura, Madre Tierra Expo', cac: '$2,100', conversion: '22%', volumen: '3 clientes/trimestre' },
        ],
        embudo: {
          prospectos: 420,
          contactosCalificados: 168,
          demosRealizadas: 92,
          pilotosActivados: 41,
          contratosCerrados: 23,
          tasaConversionTotal: '5.5%',
        },
        hitos: [
          { fecha: '2024-06', hito: 'Primera venta — piloto con Central Restaurante (S/3,400)' },
          { fecha: '2024-09', hito: '$5K MRR — 5 clientes recurrentes' },
          { fecha: '2025-01', hito: '$15K MRR — certificación EN 13432 obtenida con SGS Perú' },
          { fecha: '2025-06', hito: '$28K MRR — 15 clientes, primer contrato hotel (Hilton Lima)' },
          { fecha: '2025-09', hito: 'Selección Innóvate Perú StartUp Perú 9G — beneficio S/137,000' },
          { fecha: '2025-12', hito: '$38K MRR — 20 clientes, equipo de 6 personas, planta de Lurín activa' },
          { fecha: '2026-02', hito: 'MVBP T1 con cáscara de cacao validado en piloto Lima (3/3 conversión)' },
          { fecha: '2026-03', hito: '$47K MRR — 23 clientes, equipo de 7, kickoff fundraising pre-seed $500K' },
        ],
        nps: { score: 71, promotores: '78%', pasivos: '15%', detractores: '7%', muestra: 'n=19 clientes Q1 2026' },
        churn: { mensual: '3%', anual: '14% proyectado', motivos: 'Cierre del local (50%), cambio a competidor (25%), recorte de presupuesto (25%)' },
        repeatPurchase: '84% de clientes hacen reorden dentro de 30 días. Ticket promedio crece 18% trimestre a trimestre por expansión a más SKUs.',
        evidencia: 'Revenue verificable por facturación electrónica SUNAT (Nubefact). Contratos firmados con 18 de 23 clientes disponibles en data room. Testimoniales en video de 5 clientes (chef Mitsuharu Tsumura, chef Pía León, gerente F&B Hilton Lima).',
        aprendizajes: 'El canal #1 sigue siendo boca a boca entre chefs (47% conversión). Los hoteles tardan más pero contratan más volumen (3.2x ticket promedio vs restaurante independiente). El argumento "amazónico verificable" funciona mejor que "compostable" para diferenciar de competencia europea.',
      },
    },
    'product-plan-scaling': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        vision: 'Convertir a EcoBio Perú en el referente latinoamericano de empaques compostables hechos con materias primas amazónicas, alcanzando 500 clientes B2B y 5,000 toneladas de plástico evitadas para el cierre de 2027.',
        roadmap: [
          {
            periodo: 'Q2 2026',
            tema: 'Industrialización',
            entregables: [
              'Inversión en molde industrial automatizado (USD $48K)',
              'Capacidad de planta Lurín a 80,000 unidades/mes',
              'Lanzamiento plataforma de reorden web + WhatsApp Business API',
              'Hire: 1 jefa de planta + 2 operarios + 1 SDR',
            ],
            kpi: 'MRR $60K, 30 clientes, capacidad 80K u/mes',
          },
          {
            periodo: 'Q3 2026',
            tema: 'Expansión geográfica Lima',
            entregables: [
              'Nueva línea de producción dedicada a Lima Metropolitana',
              'Centro de distribución en Lurín con almacenamiento controlado',
              'Convenio de logística con OLVA Courier para entregas en 24h',
              'Lanzamiento línea bowls 12oz / 16oz / 32oz para foodservice',
            ],
            kpi: 'MRR $80K, 42 clientes, NPS ≥ 75',
          },
          {
            periodo: 'Q4 2026',
            tema: 'Exportación regional',
            entregables: [
              'Primer contenedor exportado a Chile (partner: B-Corp Chile)',
              'Apertura de cuenta comercial en Colombia con partner Verdana SAS',
              'Branding personalizado disponible para todos los clientes Enterprise',
              'Cierre de ronda pre-seed $500K (lead: Salkantay Ventures)',
            ],
            kpi: 'MRR $110K, 58 clientes, $500K en banco',
          },
          {
            periodo: 'Q1 2027',
            tema: 'Certificación internacional + escala',
            entregables: [
              'Obtención de certificación TÜV Austria OK Compost Industrial',
              'Capacidad de planta a 200,000 unidades/mes',
              'Lanzamiento línea retail (consumer) en supermercados Wong y Vivanda',
              'Apertura de operaciones legales en Bogotá',
            ],
            kpi: 'MRR $160K, 80 clientes, primera venta retail',
          },
        ],
        capacidadActual: '50,000 unidades/mes (planta tercerizada en Lurín, contrato exclusivo con Manufacturas Verdes SAC).',
        capacidadObjetivo: '200,000 unidades/mes para Q1 2027 con planta propia en Lurín (4,000 m²).',
        riesgosClave: [
          { riesgo: 'Disponibilidad estacional de cáscara de cacao en Madre de Dios', severidad: 'Alta', mitigacion: 'Contratos a 24 meses con 4 cooperativas (CEPIA, ACOPAGRO, Allima Cacao, Tambopata) + bodega seca de 12 toneladas en Puerto Maldonado' },
          { riesgo: 'Demora en certificación TÜV (riesgo: 6 meses adicionales)', severidad: 'Media', mitigacion: 'Iniciamos proceso en marzo 2026 con consultora alemana ECO-INSTITUT; mientras tanto seguimos con EN 13432 para mercado local' },
          { riesgo: 'Subida de tipo de cambio USD/PEN afectando margen', severidad: 'Media', mitigacion: 'Cobertura natural: 78% de costos en PEN, 65% de revenue ya en PEN. Solo cera de carnaúba es importada' },
          { riesgo: 'Entrada de competidor brasileño con planta en Lima', severidad: 'Baja', mitigacion: 'Patentes en proceso + contratos exclusivos de suministro + marca local consolidada' },
        ],
        scalingTeam: 'Pasaremos de 7 a 15 personas en 12 meses. Incorporaciones priorizadas: jefa de planta (Q2 2026), 2 SDRs (Q2 y Q3), country manager Colombia (Q4 2026), responsable de calidad y certificaciones (Q1 2027), CFO part-time (Q3 2026 con cierre de ronda).',
        infraestructuraTech: 'Migración de Airtable a un stack propio: dashboard cliente (Next.js + Supabase), API de reorden integrada con WhatsApp Business, sistema de tracking de impacto en tiempo real. Inversión: $24K en 9 meses.',
      },
    },
    'pitch-deck-builder': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        version: 'v7 — abril 2026',
        slides: [
          {
            n: 1,
            titulo: 'Title',
            contenido: 'EcoBio Perú — Empaques compostables hechos con cáscara de cacao amazónica. Pre-seed $500K @ $2.5M pre-money. Ana Quispe, CEO. Abril 2026.',
          },
          {
            n: 2,
            titulo: 'Problema',
            contenido: 'América Latina genera 17 millones de toneladas de plástico de un solo uso al año, de las cuales el 91% termina en vertederos o ecosistemas naturales. En Perú, la Ley 30884 obliga a restaurantes y hoteles a eliminar plásticos para 2025, pero las alternativas compostables disponibles son 100% importadas desde Europa, con costos 3-4x mayores y tiempos de entrega de 6-8 semanas. Resultado: 78% de los food service en Lima incumplen la regulación o pagan multas crecientes.\n\nLas pequeñas y medianas marcas de café, restaurantes premium y hoteles eco-certificados nos buscan desesperadamente porque ningún proveedor local les ofrece una solución compostable, certificada y a precio competitivo. Mientras tanto, la cadena de cacao en Madre de Dios genera 47,000 toneladas/año de cáscara que se queman o se desechan, contaminando suelos y desperdiciando una materia prima de altísimo valor.\n\nEsta es una crisis de doble cara: residuos amazónicos infrautilizados de un lado, demanda urgente de empaques sostenibles del otro. Hasta hoy, nadie había conectado los dos puntos a escala industrial en Perú.',
          },
          {
            n: 3,
            titulo: 'Solución',
            contenido: 'EcoBio Perú fabrica bandejas, platos, bowls y vasos 100% compostables a partir de cáscara de cacao y bagazo de yuca de cooperativas amazónicas. Nuestros productos cuestan 35-40% menos que las alternativas europeas, se entregan en 48h en Lima, y se descomponen en 90 días en compostaje industrial (validado con SGS, certificación EN 13432). Tenemos 3 patentes en proceso ante INDECOPI sobre la formulación con fibras amazónicas.',
          },
          {
            n: 4,
            titulo: 'Mercado',
            contenido: 'TAM (LATAM packaging compostable food service): $4.2B (Mordor Intelligence 2025, CAGR 14.3%).\nSAM (Países Andinos: Perú + Colombia + Chile + Ecuador): $640M.\nSOM realista a 3 años: $42M, equivalente a ~6.5% del SAM concentrado en Perú con expansión inicial a Chile y Colombia. Esto representa 1,200 clientes B2B promediando $2,900/mes, alcanzable con CAC actual y margen.',
          },
          {
            n: 5,
            titulo: 'Producto',
            contenido: 'Línea actual: bandejas (300/500/750ml), platos (7"/9"), bowls (12/16/32oz), vasos calientes (8/12/16oz). Próximo Q3 2026: cubiertos y empaques delivery. Diferenciador: materia prima amazónica trazable + branding personalizado + dashboard de impacto para reportes ESG del cliente.',
          },
          {
            n: 6,
            titulo: 'Tracción',
            contenido: '23 clientes B2B activos pagando. $47K MRR ($564K ARR run rate). Crecimiento 12% MoM sostenido 6 meses. NPS 71. Churn mensual 3%. NRR 118%. Clientes destacados: Hilton Lima, Belmond Miraflores, Central Restaurante, Maido, Astrid & Gastón, La Mar, Marriott. Carta de intención por $180K/año adicional firmada con grupo Acurio (en negociación).',
          },
          {
            n: 7,
            titulo: 'Modelo de negocio',
            contenido: 'B2B suscripción mensual recurrente (85% del revenue). Gross margin 61%. ARPU $2,040/mes. CAC $2,400. LTV $28,500. LTV/CAC 11.9x. Payback period: 4.2 meses. Branding personalizado +15% premium. Dashboard de impacto ESG como upsell para clientes Enterprise ($300/mes adicional).',
          },
          {
            n: 8,
            titulo: 'Competencia',
            contenido: 'Biopak (Australia), Vegware (UK), EcoProducts (US): premium, 3x precio, sin presencia local, lead time 6-8 semanas. Artesanos peruanos: sin certificación, sin escala, calidad inconsistente. EcoBio es el único jugador que combina manufactura local + certificación internacional + materia prima amazónica + precio competitivo. Moat: 3 patentes en proceso, contratos exclusivos con 4 cooperativas amazónicas, certificación EN 13432.',
          },
          {
            n: 9,
            titulo: 'Equipo',
            contenido: 'Ana Quispe — CEO. Ingeniera Ambiental PUCP, MSc Biomateriales UNI. 8 años en economía circular, ex-CONCYTEC. Originaria de Puerto Maldonado.\nLuis Mamani — CTO & Co-founder. Ingeniero Industrial UNSA, 6 años en plantas de manufactura sostenible.\nEquipo: 7 personas full-time. Asesores: Pedro Miranda (ex-VP Belcorp), Carolina Trivelli (ex-ministra MIDIS), Stefan Krasowski (Closed Loop Partners NY).',
          },
          {
            n: 10,
            titulo: 'Financieros',
            contenido: 'MRR actual: $47K. ARR run-rate: $564K. Burn mensual: $32K. Runway actual: 14 meses (con grant Innóvate Perú). Proyección con ronda: MRR $160K en Q1 2027, breakeven Q3 2027. Margen bruto: 61% hoy, objetivo 68% al automatizar.',
          },
          {
            n: 11,
            titulo: 'Ask',
            contenido: '$500K pre-seed @ $2.5M pre-money valuation. Estructura preferida: SAFE post-money con cap. Uso de fondos: 38% expansión geográfica (Chile + Colombia), 24% planta industrial Lurín, 22% equipo (3 hires clave), 12% certificación TÜV, 4% capital de trabajo. Cierre objetivo: junio 2026.',
          },
        ],
        elevatorPitch: 'EcoBio Perú transforma cáscara de cacao amazónica en empaques compostables de alta performance para el food service latinoamericano. Con 23 clientes B2B pagando, $47K MRR, 61% de margen bruto y 12% de crecimiento MoM, estamos levantando $500K pre-seed para industrializar producción y expandir a Chile y Colombia.',
        estado: 'Deck v7 listo. 18 pitches realizados desde febrero 2026. 5 fondos en due diligence (Salkantay Ventures, Magma Partners, Brasa Investimentos, Closed Loop Partners, Inversor.Lat). 1 term sheet recibido en negociación.',
        feedbackInversores: 'Lo más valorado: tracción real con clientes premium, margen bruto alto para una manufactura, y la historia "amazónica" como diferenciador. Lo más cuestionado: capacidad de escalar manufactura, retención de talento técnico fuera de Lima, riesgo regulatorio cambiario.',
      },
    },
    'cap-table-fundraising': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        rondaActual: {
          tipo: 'Pre-seed',
          monto: 500000,
          preMoney: 2500000,
          postMoney: 3000000,
          instrumento: 'SAFE post-money con cap $3M y descuento 20%',
          dilucionTotal: '16.7%',
          inversoresContactados: 28,
          inDueDiligence: 5,
          termSheetRecibidos: 1,
          cierreObjetivo: '2026-06-30',
        },
        capTableActual: [
          { stakeholder: 'Ana Quispe (CEO & Co-founder)', tipo: 'Common', porcentaje: 45.0, acciones: 4500 },
          { stakeholder: 'Luis Mamani (CTO & Co-founder)', tipo: 'Common', porcentaje: 25.0, acciones: 2500 },
          { stakeholder: 'Angel investors (3) — ronda 2024', tipo: 'SAFE convertido', porcentaje: 12.0, acciones: 1200 },
          { stakeholder: 'Innóvate Perú (grant equity-free)', tipo: 'No equity', porcentaje: 0.0, acciones: 0 },
          { stakeholder: 'Asesores (Miranda, Trivelli, Krasowski)', tipo: 'Common', porcentaje: 5.0, acciones: 500 },
          { stakeholder: 'Pool ESOP (no asignado)', tipo: 'Reserved', porcentaje: 10.0, acciones: 1000 },
          { stakeholder: 'Tesorería', tipo: 'Treasury', porcentaje: 3.0, acciones: 300 },
        ],
        capTablePostRonda: [
          { stakeholder: 'Ana Quispe (CEO)', porcentaje: 37.5, dilucion: '−7.5pp' },
          { stakeholder: 'Luis Mamani (CTO)', porcentaje: 20.8, dilucion: '−4.2pp' },
          { stakeholder: 'Founders combinados', porcentaje: 58.3, dilucion: '−11.7pp' },
          { stakeholder: 'Angel investors anteriores', porcentaje: 10.0, dilucion: '−2.0pp' },
          { stakeholder: 'Asesores', porcentaje: 4.2, dilucion: '−0.8pp' },
          { stakeholder: 'ESOP pool', porcentaje: 10.0, dilucion: 'mantenido' },
          { stakeholder: 'Nuevos inversores pre-seed', porcentaje: 16.7, dilucion: '+16.7pp' },
          { stakeholder: 'Tesorería', porcentaje: 0.8, dilucion: '−2.2pp' },
        ],
        rondasPrevias: [
          { ronda: 'Friends & Family', fecha: '2024-03', monto: 28000, instrumento: 'Préstamo convertible', notas: 'Convertido a equity en ronda angel 2024' },
          { ronda: 'Angel + Grant Innóvate Perú', fecha: '2024-11', monto: 175000, instrumento: 'SAFE + grant equity-free', notas: '$45K SAFE de 3 ángeles, $130K grant StartUp Perú 9G no equity' },
          { ronda: 'Bridge interno (founders)', fecha: '2025-08', monto: 20000, instrumento: 'Préstamo founders', notas: 'Repagable cuando cierre pre-seed' },
        ],
        totalRaised: 223000,
        usoDeFondos: [
          { categoria: 'Expansión geográfica (Chile + Colombia)', porcentaje: 38, monto: 190000, detalle: 'Country manager Colombia, partner manufacturer Bogotá, registro INVIMA, primer contenedor Chile' },
          { categoria: 'Planta industrial Lurín', porcentaje: 24, monto: 120000, detalle: 'Molde industrial automatizado USD $48K, prensa de bagazo USD $32K, sistema de control de calidad USD $40K' },
          { categoria: 'Equipo (3 hires clave)', porcentaje: 22, monto: 110000, detalle: 'Jefa de planta, 2 SDRs, country manager Colombia (12 meses cada uno con beneficios)' },
          { categoria: 'Certificación TÜV Austria + LCA', porcentaje: 12, monto: 60000, detalle: 'Auditoría ECO-INSTITUT + LCA con SGS + tasas TÜV' },
          { categoria: 'Capital de trabajo', porcentaje: 4, monto: 20000, detalle: 'Inventario de cera de carnaúba importada (3 meses)' },
        ],
        valuationRationale: '$2.5M pre-money se justifica por: (1) ARR run-rate de $564K → 4.4x ARR multiple, alineado con SaaS-like B2B en LATAM con margen >60%; (2) NRR 118% comparable a benchmarks Series A; (3) tracción con clientes Tier-1 (Hilton, Belmond, Acurio); (4) IP defensible (3 patentes en proceso). Comparables: Verdana (Colombia) cerró seed a $2.8M post con $42K MRR; Bionito (México) levantó pre-seed a $3.2M post con $35K MRR.',
        inversoresEnDD: [
          { fondo: 'Salkantay Ventures', etapa: 'DD final, term sheet recibido', ticket: '$200K-$300K', timeline: 'Cierre estimado mayo 2026' },
          { fondo: 'Magma Partners', etapa: 'DD legal y financiera', ticket: '$100K-$150K', timeline: 'Decisión junio 2026' },
          { fondo: 'Brasa Investimentos', etapa: 'DD comercial', ticket: '$75K-$100K', timeline: 'Decisión junio 2026' },
          { fondo: 'Closed Loop Partners', etapa: 'DD impacto + tech', ticket: '$50K-$100K', timeline: 'Decisión julio 2026 (lento)' },
          { fondo: 'Inversor.Lat (sindicato)', etapa: 'Pitch a comité', ticket: '$50K-$150K syndicate', timeline: 'Comité mayo 2026' },
        ],
        terminosDealActual: 'SAFE post-money cap $3M, descuento 20%, MFN clause activada, sin pro-rata para tickets <$50K, conversión automática en equity preferente Series Seed o calificada Series A.',
      },
    },
    'data-room-builder': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        ultimoUpdate: '2026-04-10',
        accesos: 'Compartido vía DocSend con tracking. 18 inversores con acceso, 12 visitas en últimos 30 días, tiempo promedio 14 minutos.',
        secciones: [
          {
            seccion: '01 — Corporate & Legal',
            documentos: [
              { nombre: 'Certificado de constitución EcoBio Perú S.A.C. (RUC 20612345678)', estado: 'Listo', fecha: '2023-11-15', formato: 'PDF' },
              { nombre: 'Estatutos sociales actualizados v2', estado: 'Listo', fecha: '2025-09-22', formato: 'PDF' },
              { nombre: 'Cap table detallado (Carta SAFE templates)', estado: 'Listo', fecha: '2026-04-08', formato: 'XLSX + PDF' },
              { nombre: 'Junta de accionistas — actas 2024-2026', estado: 'Listo', fecha: '2026-03-30', formato: 'PDF' },
              { nombre: 'Vigencia de poder Ana Quispe (Registros Públicos)', estado: 'Listo', fecha: '2026-02-14', formato: 'PDF' },
            ],
          },
          {
            seccion: '02 — IP & Patentes',
            documentos: [
              { nombre: 'Solicitud de patente PE-2024-001234 — Formulación biomaterial cáscara de cacao', estado: 'En examen', fecha: '2024-08-15', formato: 'PDF' },
              { nombre: 'Solicitud de patente PE-2024-001567 — Proceso de recubrimiento con cera de carnaúba', estado: 'En examen', fecha: '2024-11-03', formato: 'PDF' },
              { nombre: 'Solicitud de patente PE-2025-000891 — Sistema de compostaje acelerado', estado: 'Recién presentada', fecha: '2025-06-20', formato: 'PDF' },
              { nombre: 'Registro de marca EcoBio® INDECOPI', estado: 'Concedido', fecha: '2024-04-12', formato: 'PDF' },
              { nombre: 'Estudio de freedom-to-operate (FTO) — Estudio Echecopar', estado: 'Listo', fecha: '2025-12-01', formato: 'PDF' },
            ],
          },
          {
            seccion: '03 — Certificaciones & Calidad',
            documentos: [
              { nombre: 'Certificación EN 13432 — SGS Perú', estado: 'Vigente', fecha: '2025-01-18', formato: 'PDF' },
              { nombre: 'Registro sanitario DIGESA RD-N-2024-0089', estado: 'Vigente hasta 2028', fecha: '2024-02-10', formato: 'PDF' },
              { nombre: 'Reporte LCA (Life Cycle Assessment) cadena cacao — SGS', estado: 'Listo', fecha: '2025-11-05', formato: 'PDF' },
              { nombre: 'Reporte de sostenibilidad EcoBio 2025', estado: 'Listo', fecha: '2026-01-30', formato: 'PDF' },
              { nombre: 'Auditoría inicial TÜV Austria OK Compost (en proceso)', estado: 'En revisión', fecha: '2026-03-15', formato: 'PDF parcial' },
            ],
          },
          {
            seccion: '04 — Comercial & Clientes',
            documentos: [
              { nombre: 'Contrato Hilton Lima Miraflores (vigencia 2025-2027)', estado: 'Listo', fecha: '2025-06-22', formato: 'PDF firmado' },
              { nombre: 'Contrato Belmond Miraflores Park (vigencia 2025-2026)', estado: 'Listo', fecha: '2025-04-18', formato: 'PDF firmado' },
              { nombre: 'Contrato Central Restaurante (vigencia 2025-2026)', estado: 'Listo', fecha: '2025-02-11', formato: 'PDF firmado' },
              { nombre: 'Contrato Sabores del Pacífico — 12 locales (vigencia 2024-2027)', estado: 'Listo', fecha: '2024-09-30', formato: 'PDF firmado' },
              { nombre: 'Carta de intención Grupo Acurio — $180K/año', estado: 'Listo', fecha: '2026-03-25', formato: 'PDF' },
              { nombre: 'Pipeline comercial Q2-Q4 2026 (HubSpot export)', estado: 'Listo', fecha: '2026-04-10', formato: 'XLSX' },
            ],
          },
          {
            seccion: '05 — Financiero',
            documentos: [
              { nombre: 'Financial Model v3 — proyección 36 meses', estado: 'Listo', fecha: '2026-04-08', formato: 'XLSX' },
              { nombre: 'Estados financieros auditados 2024 — KPMG', estado: 'Listo', fecha: '2025-03-15', formato: 'PDF' },
              { nombre: 'Estados financieros 2025 (no auditados)', estado: 'Listo', fecha: '2026-02-28', formato: 'PDF' },
              { nombre: 'Reporte mensual de KPIs (MRR, churn, CAC, LTV)', estado: 'Actualizado', fecha: '2026-04-01', formato: 'PDF dashboard' },
              { nombre: 'Cuenta detalle banca — BCP cuentas operativas', estado: 'Listo', fecha: '2026-04-05', formato: 'PDF' },
              { nombre: 'Declaraciones SUNAT 2024-2026', estado: 'Al día', fecha: '2026-03-28', formato: 'PDF' },
            ],
          },
          {
            seccion: '06 — Equipo & Talento',
            documentos: [
              { nombre: 'CV Ana Quispe (CEO)', estado: 'Listo', fecha: '2026-03-01', formato: 'PDF' },
              { nombre: 'CV Luis Mamani (CTO)', estado: 'Listo', fecha: '2026-03-01', formato: 'PDF' },
              { nombre: 'Organigrama actual + plan de hires 12 meses', estado: 'Listo', fecha: '2026-04-02', formato: 'PDF + Miro' },
              { nombre: 'Contratos laborales modelo + convenio ESOP', estado: 'Listo', fecha: '2026-01-15', formato: 'PDF' },
              { nombre: 'Cartas de recomendación asesores (3)', estado: 'Listo', fecha: '2026-02-20', formato: 'PDF' },
            ],
          },
          {
            seccion: '07 — Cadena de suministro & Operaciones',
            documentos: [
              { nombre: 'Contratos de suministro cooperativas (CEPIA, ACOPAGRO, Allima, Tambopata)', estado: 'Listo', fecha: '2025-12-01', formato: 'PDF firmado x4' },
              { nombre: 'Contrato Manufacturas Verdes SAC (planta Lurín)', estado: 'Listo', fecha: '2024-10-15', formato: 'PDF' },
              { nombre: 'Mapa de proveedores y plan de contingencia', estado: 'Listo', fecha: '2026-03-10', formato: 'PDF + XLSX' },
              { nombre: 'Plan de calidad y trazabilidad (cáscara → producto final)', estado: 'Listo', fecha: '2026-02-08', formato: 'PDF' },
            ],
          },
          {
            seccion: '08 — Ronda actual',
            documentos: [
              { nombre: 'Pitch Deck v7 (abril 2026)', estado: 'Listo', fecha: '2026-04-10', formato: 'PDF + Figma' },
              { nombre: 'One-pager comercial (ES + EN)', estado: 'Listo', fecha: '2026-04-08', formato: 'PDF' },
              { nombre: 'Term sheet borrador (Salkantay Ventures)', estado: 'En negociación', fecha: '2026-04-12', formato: 'PDF' },
              { nombre: 'FAQ inversores + objeciones comunes', estado: 'Listo', fecha: '2026-04-05', formato: 'PDF' },
              { nombre: 'Video pitch 3 min (Loom)', estado: 'Listo', fecha: '2026-03-28', formato: 'Loom link' },
            ],
          },
        ],
        completitudGlobal: '92% — pendiente: cierre auditoría TÜV (Q3 2026) y firma final term sheet.',
      },
    },
    'financial-model-builder': {
      completed: false,
      completedAt: null,
      reportGenerated: false,
      lastSaved: now,
      data: {
        version: 'v3 — abril 2026',
        supuestos: {
          arpuPromedio: 2040,
          churnMensual: 0.03,
          netRevenueRetention: 1.18,
          grossMarginInicial: 0.61,
          grossMarginObjetivo2027: 0.68,
          cacBlended: 2400,
          paybackPeriodMeses: 4.2,
          inflacionPEN: 0.038,
          tipoCambio: 3.78,
        },
        snapshotActual: {
          mrr: 47000,
          arr: 564000,
          burnMensual: 32000,
          runwayMeses: 14,
          cashEnBanco: 448000,
          clientesActivos: 23,
          empleados: 7,
        },
        proyeccion36Meses: [
          { mes: 1, periodo: '2026-04', revenue: 47000, cogs: 18330, grossMargin: 0.61, opex: 79000, ebitda: -50330, runway: 14, clientes: 23, headcount: 7 },
          { mes: 2, periodo: '2026-05', revenue: 51000, cogs: 19890, grossMargin: 0.61, opex: 81000, ebitda: -49890, runway: 13, clientes: 25, headcount: 7 },
          { mes: 3, periodo: '2026-06', revenue: 56000, cogs: 21840, grossMargin: 0.61, opex: 95000, ebitda: -60840, runway: 12, clientes: 27, headcount: 9 },
          { mes: 6, periodo: '2026-09', revenue: 78000, cogs: 28860, grossMargin: 0.63, opex: 102000, ebitda: -52860, runway: 18, clientes: 38, headcount: 11 },
          { mes: 9, periodo: '2026-12', revenue: 110000, cogs: 38500, grossMargin: 0.65, opex: 118000, ebitda: -46500, runway: 16, clientes: 56, headcount: 12 },
          { mes: 12, periodo: '2027-03', revenue: 142000, cogs: 47570, grossMargin: 0.665, opex: 132000, ebitda: -37570, runway: 14, clientes: 72, headcount: 13 },
          { mes: 15, periodo: '2027-06', revenue: 180000, cogs: 59400, grossMargin: 0.67, opex: 148000, ebitda: -27400, runway: 13, clientes: 91, headcount: 14 },
          { mes: 18, periodo: '2027-09', revenue: 218000, cogs: 71500, grossMargin: 0.672, opex: 162000, ebitda: -15500, runway: 14, clientes: 110, headcount: 15 },
          { mes: 21, periodo: '2027-12', revenue: 260000, cogs: 84500, grossMargin: 0.675, opex: 175000, ebitda: 500, runway: 'BREAKEVEN', clientes: 132, headcount: 16 },
          { mes: 24, periodo: '2028-03', revenue: 305000, cogs: 98200, grossMargin: 0.678, opex: 188000, ebitda: 18800, runway: 'PROFITABLE', clientes: 156, headcount: 17 },
          { mes: 30, periodo: '2028-09', revenue: 410000, cogs: 130000, grossMargin: 0.683, opex: 215000, ebitda: 65000, runway: 'PROFITABLE', clientes: 215, headcount: 19 },
          { mes: 36, periodo: '2029-03', revenue: 525000, cogs: 165400, grossMargin: 0.685, opex: 248000, ebitda: 111600, runway: 'PROFITABLE', clientes: 285, headcount: 22 },
        ],
        breakdownOpEx: {
          equipo: 0.58,
          manufactura: 0.12,
          marketing_ventas: 0.14,
          tech_software: 0.04,
          legal_contabilidad: 0.05,
          oficina_servicios: 0.03,
          contingencia: 0.04,
        },
        unitEconomics: {
          arpu: 2040,
          cogsPorCliente: 760,
          contributionMargin: 0.628,
          cac: 2400,
          ltv: 28500,
          ltvCacRatio: 11.9,
          paybackMeses: 4.2,
        },
        breakeven: 'Proyectado para mes 21 (diciembre 2027) con 132 clientes activos y MRR de $260K. EBITDA positivo sostenido desde mes 22. Profitabilidad neta ajustada por impuestos: mes 26 (abril 2028).',
        sensibilidad: [
          { escenario: 'Pesimista (churn 5%, NRR 1.05)', breakeven: 'mes 30', mrrMes24: '$245K' },
          { escenario: 'Base', breakeven: 'mes 21', mrrMes24: '$305K' },
          { escenario: 'Optimista (churn 2%, NRR 1.25)', breakeven: 'mes 18', mrrMes24: '$385K' },
        ],
        usoDeRondaImpactoFinanciero: 'Con $500K nuevos: runway extendido de 14 a 22 meses. Permite cubrir gap hasta breakeven sin necesidad de bridge round. Si la ronda no cierra, plan B: reducir hires de Colombia (ahorro $90K) y diferir certificación TÜV (ahorro $60K) → runway 19 meses sobre cash actual.',
      },
    },
  }
  try {
    localStorage.setItem(key, JSON.stringify(seeded))
  } catch { /* ignore */ }

  // Seed rich profile extras for demo (overwrite to keep aligned with SEED_VERSION)
  const profileKey = `s4c_${DEMO_FOUNDER_ID}_profile_extra`
  try {
    localStorage.setItem(profileKey, JSON.stringify({
      vertical: 'cleantech_climatech',
      country: 'Perú',
      region: 'Madre de Dios',
      role: 'CEO / Founder',
      experience: '1-2 startups anteriores',
      linkedin: 'https://linkedin.com/in/ana-quispe-ecobio',
      description: 'Ingeniera ambiental por la PUCP con maestría en biomateriales por la Universidad Nacional de Ingeniería. 8 años de experiencia en economía circular, ex-investigadora en CONCYTEC. Co-fundó EcoBio Perú en 2023 para transformar residuos amazónicos (cáscara de cacao y bagazo de yuca) en empaques compostables de alta performance. La startup ha validado su tecnología con 3 patentes en proceso ante INDECOPI, certificación EN 13432 con SGS, y contratos con las principales cadenas de restaurantes y hoteles sostenibles en Lima (Hilton, Belmond, Central, Maido, Astrid & Gastón).',
      teamSize: '7',
      website: 'https://ecobioperu.com',
      foundedYear: '2023',
      legalEntity: 'EcoBio Perú S.A.C.',
      ruc: '20612345678',
      businessModel: 'B2B',
      currentMRR: 47000,
      totalFunding: 0,
      pricingModel: 'Suscripción mensual recurrente con descuentos por volumen anual + branding personalizado +15% premium + dashboard ESG $300/mes para Enterprise',
      mainCustomers: '1) Cadenas hoteleras premium (Hilton Lima, Belmond Miraflores, Marriott) — 38% del MRR. 2) Restaurantes de autor (Central, Maido, Astrid & Gastón, La Mar) — 32% del MRR. 3) Cadenas gastronómicas medianas (Sabores del Pacífico 12 locales, IK, Panchita del Grupo Acurio) — 30% del MRR.',
      certifications: ['B Corp en proceso', 'TÜV Compostable en proceso', 'EN 13432', 'Comercio Justo'],
      sdgImpact: ['ODS 12', 'ODS 13', 'ODS 15', 'ODS 8'],
      mainChallenges: '1) Escalar producción industrial de 50K a 200K unidades/mes manteniendo calidad y margen >60%. 2) Acceso a capital pre-seed de $500K para financiar molde industrial y expansión a Chile/Colombia. 3) Obtener certificación TÜV Compostable internacional para abrir mercado de exportación regional sin reducir velocidad de comercialización local.',
      completedAt: now,
    }))
  } catch { /* ignore */ }

  // Seed 3 mock diagnostic history entries showing maturity evolution over time
  try {
    const diagHistoryKey = `s4c_${DEMO_FOUNDER_ID}_diagnostic_history`
    const diagHistory = [
      // Most recent — Etapa 3 Aceleración (score 20)
      {
        id: 'diag-demo-003',
        created_at: new Date(Date.now() - 28 * 86400000).toISOString(), // ~1 month ago
        score: 20,
        profile_tag: 'Crecimiento',
        profile_etapa: 3 as const,
        profile_name: 'ETAPA 3: Aceleración',
        profile_emoji: '🚀',
        profile_color: '#F0721D',
        dimension_scores: { madurez: 4, validacion: 3, impacto: 3, financiamiento: 3, equipo: 3, data_room: 4 },
        tags: { modelo_negocio: 'venta', equipo_tamano: 'tres', cuello_botella: 'inversion' },
        inconsistencias: [] as string[],
      },
      // 4 months ago — Etapa 3 Aceleración (score 17)
      {
        id: 'diag-demo-002',
        created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
        score: 17,
        profile_tag: 'Crecimiento',
        profile_etapa: 3 as const,
        profile_name: 'ETAPA 3: Aceleración',
        profile_emoji: '🚀',
        profile_color: '#F0721D',
        dimension_scores: { madurez: 3, validacion: 3, impacto: 3, financiamiento: 3, equipo: 3, data_room: 2 },
        tags: { modelo_negocio: 'venta', equipo_tamano: 'tres', cuello_botella: 'clientes' },
        inconsistencias: [] as string[],
      },
      // 9 months ago — Etapa 2 Incubación (score 12)
      {
        id: 'diag-demo-001',
        created_at: new Date(Date.now() - 270 * 86400000).toISOString(),
        score: 12,
        profile_tag: 'Validación',
        profile_etapa: 2 as const,
        profile_name: 'ETAPA 2: Incubación',
        profile_emoji: '🔬',
        profile_color: '#1F77F6',
        dimension_scores: { madurez: 2, validacion: 2, impacto: 2, financiamiento: 2, equipo: 2, data_room: 2 },
        tags: { modelo_negocio: 'venta', equipo_tamano: 'dos', cuello_botella: 'pmf' },
        inconsistencias: [] as string[],
      },
    ]
    localStorage.setItem(diagHistoryKey, JSON.stringify(diagHistory))
  } catch { /* ignore */ }

  try {
    localStorage.setItem(versionKey, SEED_VERSION)
  } catch { /* ignore */ }
}
