# Cuestionario de Diagnóstico — DiagnosticForm (v2.1)

## Flujo general

**12 pasos (0–11)**: Paso 0 (datos de contacto) → 9 preguntas (P1–P9) → Paso 10 (pantalla de carga) → Paso 11 (resultados)

- Componente: `src/components/DiagnosticForm.tsx`
- Lógica de scoring (preguntas, perfiles, inconsistencias, reglas adaptativas, mapeo de herramientas): `src/lib/diagnostic-scoring.ts`
- Tests: `tests/unit/diagnostic-scoring.test.ts`

---

## Paso 0 — Datos de contacto

| Campo | Validación |
|-------|------------|
| Tu nombre | Mín. 2 caracteres, requerido |
| Email | Formato email, requerido |
| Nombre de tu startup | Mín. 2 caracteres, requerido |
| Vertical | Selección requerida |
| Describe brevemente tu idea | Mín. 10 caracteres, requerido |
| País (código telefónico) | Selector de 17 países LATAM, default México +52 |
| Teléfono (WhatsApp) | Opcional |
| Sitio web | Opcional |
| ¿Cómo nos conociste? | Opcional |

**Opciones de vertical:** Fintech · Healthtech · Edtech · Agritech · Cleantech / Energía · Logística / Movilidad · Proptech · Biotech · Deep Tech · Otra

**¿Cómo nos conociste?:** Redes sociales · Recomendación de un amigo o colega · Google / búsqueda web · Evento o conferencia · Prensa o medios · Otro

---

## Preguntas (P1–P9)

Las preguntas tipo **score** suman al puntaje total; las tipo **tag** solo personalizan el resultado (roadmap y herramientas recomendadas).

### P1 — Nivel de Madurez *(tipo: score · clave `madurez`)*
**¿En qué fase de desarrollo se encuentra tu startup hoy?**

| Opción | Score |
|--------|-------|
| Idea o prueba de concepto inicial | 1 |
| Prototipo funcional o MVP lanzado | 2 |
| Pilotos con clientes o primeros usuarios activos | 3 |
| Ingresos recurrentes y tracción demostrada | 4 |

---

### P2 — Validación Comercial *(tipo: score · clave `validacion`)*
**¿Cuál es el estado actual de la validación de tu mercado?**

| Opción | Score |
|--------|-------|
| Validando el problema mediante entrevistas | 1 |
| Tenemos cartas de intención o pilotos no pagados | 2 |
| Pilotos pagados o primeros ingresos iniciales | 3 |
| Ingresos recurrentes demostrados o contratos firmados | 4 |

---

### P3 — Modelo de Negocio *(tipo: tag · clave `modelo_negocio`)*
**¿Cuál es tu modelo de ingresos principal?**

- Suscripción (SaaS)
- Venta directa
- Marketplace / comisiones
- Freemium
- Licenciamiento

---

### P4 — Medición de Impacto *(tipo: score · clave `impacto`)*
**¿Cómo mides el impacto positivo de tu startup?**

| Opción | Score |
|--------|-------|
| Aún no medimos o solo tenemos una narrativa cualitativa | 1 |
| Tenemos métricas básicas internas de impacto | 2 |
| Reportamos impacto regularmente a stakeholders o clientes | 3 |
| Contamos con verificación de terceros o certificaciones | 4 |

---

### P5 — Necesidad de Financiamiento *(tipo: score · clave `financiamiento`)*
**¿Cuánto capital buscas levantar en los próximos 12-18 meses?**

| Opción | Score |
|--------|-------|
| Bootstrapping o menos de $250k | 1 |
| Entre $250k y $1.5M | 2 |
| Entre $1.5M y $5M | 3 |
| Más de $5M | 4 |

---

### P6 — Equipo Fundador *(tipo: tag · clave `equipo_tamano`)*
**¿Cuántas personas hay en tu equipo fundador?**

- Solo founder
- 2 co-founders
- 3+ co-founders
- Equipo completo (>5)

---

### P7 — Composición del Equipo *(tipo: score · clave `equipo`, máx. 3)*
**¿Cuál es el balance actual del equipo fundador?**

| Opción | Score |
|--------|-------|
| Perfil 100% técnico/científico | 1 |
| Principalmente negocio, buscando expertise técnico | 2 |
| Equilibrado entre perfil técnico y de negocios | 3 |

---

### P8 — Cuello de Botella Operativo *(tipo: tag · clave `cuello_botella`)*
**¿Cuál es tu principal obstáculo hoy?**

- Encontrar product-market fit
- Conseguir clientes
- Optimizar operaciones y controlar costos
- Estructurar financieramente
- Levantar inversión

---

### P9 — Preparación para Inversión *(tipo: score · clave `data_room`)*
**¿Si un inversor te pidiera acceso a tu Data Room hoy, qué tan listo estás?**

| Opción | Score |
|--------|-------|
| No tenemos Data Room estructurado aún | 1 |
| Tenemos Pitch Deck básico y proyecciones a 12 meses | 2 |
| Modelo financiero y aspectos legales listos | 3 |
| Todo lo anterior + métricas de tracción y auditorías listas | 4 |

---

### Alertas adaptativas (durante el cuestionario)

| ID | Pregunta | Se muestra cuando |
|----|----------|-------------------|
| ADAPT-01 | P2 | Madurez ≤ 2 y se elige "Ingresos recurrentes demostrados o contratos firmados" |
| ADAPT-02 | P5 | Madurez = 1 y se elige "Entre $1.5M y $5M" o "Más de $5M" |
| ADAPT-03 | P9 | Madurez ≤ 2 y se elige "Todo lo anterior + métricas de tracción y auditorías listas" |

---

## Paso 10 — Pantalla de carga

> *"Analizando tu startup… Calculando tu Startup Readiness Score y preparando tu roadmap personalizado."*

Acciones en background:
- INSERT en tabla `diagnostic_leads` (nombre, email, startup, score, perfil, respuestas, tags)
- INSERT en tabla `diagnostics` (user_id si existe, score, perfil, dimension_scores)
- Guarda `s4c_diagnostic_pending` en `localStorage` para founders no registrados aún

---

## Paso 11 — Resultados

**Score total** = suma de las 6 preguntas tipo score (P1, P2, P4, P5, P7, P9)
**Mínimo posible:** 6 pts · **Máximo posible:** 23 pts (P7 tiene máximo 3; las demás, 4)

### Perfiles de resultado

| Rango | Etapa | Tag | Color |
|-------|-------|-----|-------|
| 6–11 | ETAPA 1: Pre-incubación | Ideación | #DA4E24 |
| 12–16 | ETAPA 2: Incubación | Validación | #1F77F6 |
| 17–20 | ETAPA 3: Aceleración | Crecimiento | #F0721D |
| 21–23 | ETAPA 4: Escalamiento | Escala | #1F77F6 |

Un total fuera de todos los rangos (no debería ocurrir con el cuestionario completo) se clasifica como ETAPA 1.

### Inconsistencias detectadas

| ID | Condición |
|----|-----------|
| INC-01 | Madurez ≤ 2 y validación = 4 |
| INC-02 | Madurez = 1 y data room ≥ 3 |
| INC-03 | Madurez = 1 y financiamiento ≥ 3 |
| INC-04 | Validación ≤ 1 y data room = 4 |
| INC-05 | \|madurez − validación\| ≥ 3 |
| INC-06 | Equipo = 1 (100% técnico) y data room ≥ 3 |
| INC-07 | Cuello de botella = operaciones y madurez ≤ 2 |

### Herramientas recomendadas por etapa

| Etapa | Herramientas |
|-------|-------------|
| Pre-incubación | Propósito & Equipo · Segmentación de Mercado · Mercado inicial · Perfil del Usuario |
| Incubación | Propuesta de Valor · Primeros 10 Clientes · Lean Canvas · Especificación de Producto |
| Aceleración | Unit Economics · Proceso de Ventas · Modelo de Negocio · Framework de Pricing |
| Escalamiento | Pitch Deck · Cap Table · Plan de Producto · Validación de Tracción |

Se recomiendan 3 herramientas: una según el cuello de botella (P8; versión temprana para etapas 1–2 y avanzada para 3–4), una según el modelo de negocio (P3) y la primera de la etapa siguiente, sin duplicados.

### Dimensiones del score (dimension_scores)

| Dimensión | Pregunta fuente | Máximo |
|-----------|----------------|--------|
| madurez | P1 | 4 |
| validacion | P2 | 4 |
| impacto | P4 | 4 |
| financiamiento | P5 | 4 |
| equipo | P7 | 3 |
| data_room | P9 | 4 |

Una pregunta sin responder se guarda como 0.

### CTAs en pantalla de resultados

(Solo en la versión no embebida.)

1. **"Acceder a mis Herramientas"** → `/tools?source=diagnostic&score=…&etapa=…` (sin sesión: **"Crear cuenta y desbloquear herramientas"** abre el registro)
2. **"Enviarme los resultados por email"** → `POST /api/diagnostic/email-results`
3. **"Agenda una sesión estratégica por WhatsApp"** → `wa.me` con mensaje prellenado
