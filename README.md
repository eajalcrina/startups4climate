# Startups4Climate

Plataforma all-in-one para founders de startups de impacto en Latinoamérica, desarrollada por [Redesign Lab](https://redesignlab.org). Reúne herramientas interactivas, mentores AI, diagnóstico de startup readiness y visibilidad de oportunidades (grants, fondos, competencias).

- **Founders**: acceso gratuito a herramientas, diagnóstico y Startup Passport (`/tools`).
- **Organizaciones** (incubadoras, universidades, gobiernos): gestión de cohortes y reportes (`/admin`), y vista de plataforma (`/superadmin`).

## Stack

- Next.js 16 (App Router) + React 19, TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth, RLS en todas las tablas)
- Resend (email)
- Motor AI vía endpoint compatible con OpenAI (ver `CLAUDE.md`)
- `exceljs` para reportes Excel
- Deploy en Vercel (incluye cron jobs en `vercel.json`)

## Puesta en marcha

Requisitos: Node.js 20+ y npm.

```bash
npm ci
# crea .env.local con las variables de la sección siguiente
npm run dev
```

La app queda en <http://localhost:3000>.

## Variables de entorno

Definirlas en `.env.local` (nunca commitear) y en Vercel (Production, Preview, Development).

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio, solo servidor (rutas API y cron) |
| `RESEND_API_KEY` | Envío de emails |
| `GEMINI_API_KEY` | Motor AI (mentor y feedback) |
| `CRON_SECRET` | Autenticación de los cron jobs de Vercel |
| `NEXT_PUBLIC_SITE_URL` | URL pública (links en emails, passport compartido) |
| `NEXT_PUBLIC_DEMO_ENABLED` | `true` habilita los accesos demo en producción |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Tests end-to-end con Playwright |

## Base de datos

Las migraciones están versionadas en `supabase/migrations/`. Todo cambio de esquema o de políticas RLS se agrega como migración nueva.

## Deploy

El proyecto se despliega en Vercel. Los cron jobs (RADAR, oportunidades, keepalive de Supabase) se configuran en `vercel.json` y se autentican con `CRON_SECRET`.

## Documentación

- [`CLAUDE.md`](./CLAUDE.md): convenciones del proyecto, arquitectura de datos, reglas de seguridad y paridad demo/live.
- [`ARQUITECTURA_TECNICA.md`](./ARQUITECTURA_TECNICA.md): decisiones técnicas y filosofía de diseño.
- [`STATUS.md`](./STATUS.md): estado actual del trabajo.

## Contacto

<hello@redesignlab.org> · [redesignlab.org](https://redesignlab.org)
