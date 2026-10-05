## Estado actual

- Tarea en curso: remediación de la auditoría técnica (seguridad, dependencias, calidad de código y documentación), en paralelo por frentes.
- Último cambio (frente dependencias + calidad + docs):
  - `next` y `eslint-config-next` actualizados a 16.3.8; dependencias transitivas vulnerables actualizadas. `npm audit --omit=dev`: sin vulnerabilidades críticas ni altas.
  - `xlsx` (SheetJS, sin parche) reemplazado por `exceljs` en el reporte de cohorte.
  - ESLint en 0 errores (fixes reales de hooks de React; deshabilitaciones puntuales solo con justificación).
  - Eliminadas lecturas de localStorage sin namespace por usuario (`s4c_profile_extra` legacy) y `.single()` en lecturas opcionales.
  - Fixtures demo del founder movidas de `AuthContext` a `src/lib/demo/founder-fixtures.ts`.
  - `CLAUDE.md` sin credenciales; README real; fotos del equipo en WebP.
- Branch activo: rama de trabajo de la remediación (pendiente de merge).

## Siguiente paso

- Integrar los frentes de la auditoría (proxy/API/AI, tests, migraciones) y validar build + lint + tests en conjunto.
- Rotar la contraseña compartida que estuvo en `CLAUDE.md` (sigue en el historial de git).
- Confirmar el renombre de `src/middleware.ts` a `src/proxy.ts` (convención de Next.js 16, ya documentada en `CLAUDE.md`).

## Bloqueantes

- Ninguno técnico. Leaked Password Protection de Supabase requiere plan Pro.

## Deuda técnica

- ~3.450 estilos inline (`style={{}}`) pendientes de migrar a Tailwind.
- Páginas muy grandes por dividir: `tools/passport` (~2.100 líneas), `DiagnosticForm` (~2.000), `tools/page` (~1.580), `admin/cohortes/[id]` (~1.300), `tools/layout` (~1.200).
- Algunos efectos de carga de datos (`superadmin/*`) mantienen `eslint-disable` justificado; migrarlos a un hook de fetching común.
- `uuid` < 11 vía `exceljs` (aviso moderado, no explotable: `exceljs` solo usa v4) y `braces` vía `eslint-config-next` (solo dev, sin fix compatible).
