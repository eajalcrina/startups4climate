# CLAUDE.md — Startups4Climate

## Proyecto

Startups4Climate (S4C) es una plataforma all-in-one para founders de startups de impacto en Latinoamérica. Desarrollada por Redesign Lab (Lorenzo Ortiz + Eddie Ajalcriña). Ofrece herramientas interactivas, mentores AI, diagnóstico de startup readiness, y visibilidad de oportunidades (grants, fondos, competencias).

Dos tipos de usuario:

- Founders: acceso gratuito a herramientas y diagnóstico
- Organizaciones: incubadoras, gobiernos, programas de innovación (modelo B2B)

Estado actual: en producción. 3 universidades cerradas (UNAMAD, Wiener, BioInnova). Escalando a 200 founders + 30 universidades en 30 días.

## Stack

- Framework: Next.js 16 (App Router) + React 19
- Estilos: Tailwind CSS v4
- Base de datos + Auth: Supabase (proyecto `mvawsorasuqqlzlayhrx`, plan Free por ahora)
- Email: Resend
- Motor AI: **Gemini 2.5 Flash** (vía endpoint OpenAI-compatible)
- Iconos: lucide-react
- Exportación Excel: `exceljs` (reemplazó a `xlsx`/SheetJS por vulnerabilidades sin parche)
- Lenguaje: TypeScript
- Deploy: Vercel
- Repo: github.com/eajalcrina/startups4climate

## Estructura de páginas

- `/` — Landing principal con hero, diagnóstico, plataforma, about, alianzas
- `/workbook` — Workbook interactivo para founders
- `/organizaciones` — Landing B2B para incubadoras y gobiernos
- `/tools` — Plataforma de herramientas para founders (requiere auth)
  - `/tools/passport` — Startup Passport (datos + scoring)
  - `/tools/radar` — RADAR del ecosistema (Preview, datos curados)
  - `/tools/oportunidades` — Oportunidades (Preview, datos curados)
  - `/tools/recursos` — Recursos descargables
  - `/tools/perfil`, `/tools/completar-perfil` — Gestión de perfil
- `/admin` — Panel de administración (acceso por rol)
  - `/admin/cohortes` — Gestión de cohortes
  - `/admin/reportes` — Generación de reportes Excel
  - `/admin/configuracion` — Config de organización

## Convenciones

- Componentes en `/components`, organizados por sección o feature
- Páginas en `/app` siguiendo App Router de Next.js 16
- Proxy de Next.js 16 en `src/proxy.ts` (reemplaza a `middleware.ts`)
- Variables de entorno en `.env.local` (nunca commitear)
- Nombres de archivos: kebab-case para páginas y componentes
- Clases Tailwind directamente en JSX, sin CSS externo salvo globals.css
- Imágenes en `/public`
- Logging de errores de sync con prefijo `[S4C Sync]`, errores admin con `[S4C Admin]`, errores AI con `[S4C AI]`

## Arquitectura de datos

**Supabase-first**: La DB es la fuente de verdad. localStorage actúa como caché namespaceado por userId (`s4c_${userId}_*`) para soportar computadoras compartidas.

- Escrituras: Supabase primero → localStorage cache
- Lecturas: Supabase primero → fallback a localStorage
- Retry con backoff exponencial (2 reintentos) en escrituras críticas a `tool_data`
- `saveToolDataSync()` para cleanup/unmount handlers (solo localStorage)

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo servidor (rutas API / cron); nunca exponer al cliente
RESEND_API_KEY=
GEMINI_API_KEY=              # Gemini 2.5 Flash para motor AI
CRON_SECRET=                 # autentica los cron jobs de Vercel (vercel.json)
NEXT_PUBLIC_SITE_URL=        # URL pública (links en emails, passport compartido)
NEXT_PUBLIC_DEMO_ENABLED=    # "true" habilita /api/demo/[role] en producción (por defecto deshabilitado)
```

Todas configuradas en Vercel (Production, Preview, Development).

## Supabase

### Migraciones

- Versionadas en `supabase/migrations/` (un archivo `.sql` por cambio). Todo cambio de esquema o RLS va como migración nueva; no editar el esquema a mano en el dashboard.

### Tablas principales

- `profiles` — Datos de usuario (`id`, `full_name`, `role`, `org_id`). Roles: `founder`, `admin_org`, `superadmin`
- `organizations` — Incubadoras/universidades (`id`, `name`, `logo_url`, `plan`, `max_startups`, `contract_end`)
- `startups` — Startups de founders (`founder_id`, `name`, `vertical`, `stage`, `diagnostic_score`, `tools_completed`)
- `cohorts` — Cohortes por organización (`org_id`, `name`, `status`, `start_date`, `end_date`)
- `cohort_startups` — Relación many-to-many cohortes ↔ startups
- `tool_data` — Progreso de herramientas por founder (`user_id`, `tool_id`, `data`, `completed`, `report_generated`)
- `diagnostics` — Respuestas del diagnóstico de readiness
- `workbook_downloads`, `invitations`, `cohort_requests`, `support_tickets`, `ticket_messages`

### Seguridad (RLS)

- Todas las tablas con RLS habilitado
- Políticas scoped por `user_id` / `founder_id` / `org_id`
- `handle_new_user()` con `search_path` fijo (previene hijacking)
- Indexes en todas las foreign keys críticas

### Auth

- `email/password` habilitado
- `autoRefreshToken: true`, `persistSession: true`
- Password reset flow via `supabase.auth.resetPasswordForEmail()`
- Proxy (`src/proxy.ts`) con timeout de 3 s para el chequeo de rol admin (redirect a `/tools` si hay timeout)
- ⚠️ Leaked Password Protection: requiere Plan Pro (pendiente)

## Motor AI

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Modelo: `gemini-2.5-flash`
- Rutas:
  - `/api/ai/chat` — Chat con mentor AI (requiere auth)
  - `/api/ai/feedback` — Feedback de herramientas completadas (requiere auth)
- Fallback en español si la API falla
- Costo estimado: ~$27/mes a escala de 200 founders

## Usuarios actuales

Credenciales: gestor de contraseñas del equipo (no commitear).

- **Superadmins**: equipo Redesign Lab (cuentas en el gestor de contraseñas)
- **Demo admin_org**: <admin@demo.startups4climate.org> (org: "Universidad Demo — Startups4Climate")
- **Demo founder**: <founder@demo.startups4climate.org> (startup: EcoBio Perú, sin org → puede pedir ingreso a cohorts)
- **Founders orgánicos**: 13 founders reales registrados desde la landing (sin org asignada aún)
- **Cohort demo**: "Cohorte Innovación Climática 2026" — active, access_mode='open', org demo
- **Solicitud pre-cargada**: founder demo ya tiene una solicitud `pending` en el cohort demo para mostrar el flujo de aprobación

## Identidad visual

- Producto de Redesign Lab
- Tono: directo, sin burocracia, orientado a founders LATAM
- Idioma: español (es-419 latinoamericano)
- No usar anglicismos innecesarios en copy

## Paridad Demo / Live

Las rutas demo (`/demo/founder`, `/demo/admin`, `/demo/superadmin`) deben reflejar siempre el mismo diseño y funcionalidad que las versiones live (`/tools/*`, `/admin/*`, `/superadmin/*`). Cualquier cambio visual, de layout, de componentes o de UX en las versiones live **debe replicarse** en los demos correspondientes en el mismo PR o commit.

- `/demo/founder` ↔ `/tools/*`
- `/demo/admin` ↔ `/admin/*`
- `/demo/superadmin` ↔ `/superadmin/*`
- API demo: `/api/demo/[role]` ↔ APIs reales

Si un componente compartido cambia, verificar que se usa en ambos contextos. Si el demo usa una copia hardcodeada, actualizarla.

## Lo que NO debes hacer

- No cambiar la estructura de navegación sin confirmación
- No modificar `/admin` sin instrucción explícita
- No usar `any` en TypeScript
- No instalar dependencias nuevas sin preguntar primero
- No commitear archivos `.env`
- No usar `.single()` para lecturas opcionales — usar `.maybeSingle()`
- No usar localStorage sin namespacear por userId (clave: `s4c_${userId}_*`)
- No escribir a localStorage sin escribir primero a Supabase (excepto en unmount handlers)
- No modificar una vista live sin actualizar su demo correspondiente

## Contacto y contexto

- Email: <hello@redesignlab.org>
- WhatsApp soporte: +51989338401
- Web Redesign Lab: redesignlab.org
