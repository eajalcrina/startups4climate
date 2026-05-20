# Módulo 00 Ideación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Module 00 "Ideación" with 5 tools before Pre-incubación, a DB-backed stage system with semantic names, a post-registration stage selector, and progressive unlocking logic.

**Architecture:** (1) DB migration converts `profiles.stage` from numeric strings ('1','2','3','4') to semantic names ('ideacion','pre-incubacion', etc.) and adds `cohorts.stage` column. (2) TypeScript layer: `ToolDef.stage` gains value `0` for ideación tools; `AppUser` gains a `stage` field. (3) Five new tool components follow the existing `KeyAssumptions.tsx` pattern. (4) Progressive unlocking: if `appUser.stage === 'ideacion'`, Pre-incubación tools in the sidebar show a locked state and the main page redirects to Module 00.

**Tech Stack:** Supabase (SQL migration), Next.js App Router, TypeScript, `useToolState` hook, shared `ToolSection`/`ToolActionBar` from `shared.tsx`, lucide-react icons.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260509_ideacion.sql` | Create | DB migration |
| `src/lib/tools-data.ts` | Modify | Add stage 0, STAGE_META key 0, 5 new ToolDef |
| `src/context/AuthContext.tsx` | Modify | Add `stage` field to AppUser |
| `src/components/StartupLifecycle.tsx` | Modify | Add module 00 entry |
| `src/app/tools/layout.tsx` | Modify | Sidebar stage 0 section + lock logic |
| `src/app/tools/completar-perfil/page.tsx` | Modify | Add stage selector as step 0 |
| `src/components/tools/ToolPage.tsx` | Modify | Register 5 new tool IDs |
| `src/components/tools/ProblemExploration.tsx` | Create | Tool 00.1 |
| `src/components/tools/ProblemSelection.tsx` | Create | Tool 00.2 |
| `src/components/tools/EmpathyMap.tsx` | Create | Tool 00.3 |
| `src/components/tools/InterviewGuide.tsx` | Create | Tool 00.4 |
| `src/components/tools/InitialIdea.tsx` | Create | Tool 00.5 |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260509_ideacion.sql`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p /Users/lorenzo/Documents/GitHub/Startups4climate/supabase/migrations
```

Create `supabase/migrations/20260509_ideacion.sql`:

```sql
-- Migration: Módulo 00 Ideación
-- Date: 2026-05-09
-- Changes:
--   1. cohorts.stage column (new) — which stage a cohort is for
--   2. profiles.stage values migrated from numeric strings to semantic names
--   3. 'ideacion' added as valid stage value

-- ── 1. Add stage column to cohorts ──────────────────────────────────────────
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS stage text
  CHECK (stage IN (
    'ideacion',
    'pre-incubacion',
    'incubacion',
    'aceleracion',
    'escalamiento'
  ));

-- ── 2. Migrate profiles.stage numeric strings → semantic names ───────────────
-- Safe: CASE ELSE returns current value for any non-numeric values already present.
UPDATE profiles
SET stage = CASE
  WHEN stage = '1' THEN 'pre-incubacion'
  WHEN stage = '2' THEN 'incubacion'
  WHEN stage = '3' THEN 'aceleracion'
  WHEN stage = '4' THEN 'escalamiento'
  ELSE stage
END
WHERE stage IN ('1', '2', '3', '4');

-- ── 3. Add check constraint on profiles.stage including 'ideacion' ───────────
-- Drop old constraint if it exists (name may differ — check pg_constraint first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_stage_check' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_stage_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_stage_check
  CHECK (stage IN (
    'ideacion',
    'pre-incubacion',
    'incubacion',
    'aceleracion',
    'escalamiento',
    -- keep NULL valid
    NULL
  ) OR stage IS NULL);
```

- [ ] **Step 2: Run migration via Supabase MCP**

Using the Supabase MCP tool `execute_sql` with project `mvawsorasuqqlzlayhrx`:

```sql
-- Run each statement individually if MCP requires it.
-- First verify current profiles.stage values:
SELECT DISTINCT stage, COUNT(*) FROM profiles GROUP BY stage ORDER BY stage;
```

Expected: rows with values '1', '2', '3', '4' or NULL.

```sql
-- Run the migration statements from the file above.
-- After running, verify:
SELECT DISTINCT stage, COUNT(*) FROM profiles GROUP BY stage ORDER BY stage;
```

Expected: values should now be 'pre-incubacion', 'incubacion', 'aceleracion', 'escalamiento' (or NULL).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260509_ideacion.sql
git commit -m "infra: DB migration — ideacion stage + profiles.stage semantic values"
```

---

## Task 2: Update TypeScript Types and tools-data.ts

**Files:**
- Modify: `src/lib/tools-data.ts`

- [ ] **Step 1: Update ToolDef.stage type and add stage 0 to STAGE_META**

In `src/lib/tools-data.ts`, make these changes:

**Change 1** — Update `ToolDef` interface (line ~17):
```ts
// BEFORE:
  stage: 1 | 2 | 3 | 4

// AFTER:
  stage: 0 | 1 | 2 | 3 | 4
```

**Change 2** — Add stage 0 entry to `STAGE_META` (insert before `1:` entry, around line ~32):
```ts
export const STAGE_META = {
  0: {
    name: 'Ideación',
    subtitle: 'Descubrimiento y Problema',
    description: 'Descubre un problema real que vale la pena resolver, entiende a quién le duele y formula tu primera hipótesis de solución. El punto de partida de todo.',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.07)',
    border: 'rgba(22,163,74,0.18)',
    phaseAdvice: 'Has completado el módulo de Ideación. Ahora tienes un problema validado, un cliente hipotético y una primera hipótesis de solución. Antes de avanzar a Pre-incubación, revisa que la evidencia de tus entrevistas sea sólida: ¿al menos 3 personas te han confirmado el problema con sus propias palabras? Si es así, estás listo para comenzar a construir.',
  },
  1: {
    // ... existing content unchanged
```

**Change 3** — Update `stageProps` helper return type (line ~80):
```ts
const stageProps = (stage: 0 | 1 | 2 | 3 | 4) => ({
  stage,
  stageName: STAGE_META[stage].name,
  stageColor: STAGE_META[stage].color,
  stageBg: STAGE_META[stage].bg,
  stageBorder: STAGE_META[stage].border,
})
```

**Change 4** — Update `TOOLS_BY_STAGE` type. Find the line that exports `TOOLS_BY_STAGE` (near end of file) and ensure it allows key `0`:
```ts
export const TOOLS_BY_STAGE: Record<0 | 1 | 2 | 3 | 4, ToolDef[]> = {
  0: TOOLS.filter((t) => t.stage === 0),
  1: TOOLS.filter((t) => t.stage === 1),
  2: TOOLS.filter((t) => t.stage === 2),
  3: TOOLS.filter((t) => t.stage === 3),
  4: TOOLS.filter((t) => t.stage === 4),
}
```

- [ ] **Step 2: Add 5 new ToolDef entries for Ideación**

Add these entries at the **top** of the `TOOLS` array (before the Stage 1 section comment):

```ts
export const TOOLS: ToolDef[] = [
  // ── Stage 0: Ideación (5 herramientas) ──────────────────────────
  {
    id: 'problem-exploration',
    name: 'Exploración de Problemas',
    shortName: 'Exploración',
    description:
      'Mapea fricciones, ineficiencias e injusticias en un territorio que conoces bien. Genera tu lista de problemas candidatos.',
    guidingQuestion: '¿Qué le resulta difícil, costoso, lento o injusto a la gente en este contexto?',
    preambulo:
      'Antes de buscar soluciones, necesitas ver el mundo con otros ojos. Esta herramienta te entrena para observar tu entorno como un campo fértil de problemas reales — no como consumidor, sino como investigador. Los mejores negocios nacen de problemas que todos sufren pero nadie se ha tomado en serio resolver.',
    ...stageProps(0),
    category: 'Estrategia',
    estimatedTime: '30 min',
    outputs: [
      'Lista de 5-8 problemas candidatos con contexto',
      'Descripción del territorio explorado',
      'Perfil de quién vive cada problema',
    ],
    stepNumber: 0,
  },
  {
    id: 'problem-selection',
    name: 'Selección del Problema',
    shortName: 'Selección',
    description:
      'Evalúa cada problema candidato en 4 dimensiones y elige el que tiene mayor potencial de convertirse en un negocio real.',
    guidingQuestion: '¿Cuál de los problemas identificados merece convertirse en tu startup?',
    preambulo:
      'No todos los problemas son iguales. Algunos duelen mucho pero son difíciles de monetizar; otros son comercialmente atractivos pero no generan impacto. Esta herramienta te da un proceso riguroso para elegir con criterio, no con intuición.',
    ...stageProps(0),
    category: 'Estrategia',
    estimatedTime: '25 min',
    outputs: [
      '1 problema seleccionado con justificación',
      'Matriz de evaluación ICE completada',
      'Razones documentadas para descartar los demás',
    ],
    stepNumber: 0,
  },
  {
    id: 'empathy-map',
    name: 'Mapa de Empatía',
    shortName: 'Empatía',
    description:
      'Describe a la persona que vive el problema desde 4 dimensiones: qué piensa, qué ve, qué dice/hace, qué escucha.',
    guidingQuestion: '¿Qué está viviendo la persona que tiene este problema?',
    preambulo:
      'El mapa de empatía te fuerza a salir de tu perspectiva y entrar en la del afectado. Es el paso que separa a los founders que diseñan para sí mismos de los que diseñan para el cliente. Sin este shift, construirás lo que tú quieres, no lo que el mundo necesita.',
    ...stageProps(0),
    category: 'Mercado',
    estimatedTime: '30 min',
    outputs: [
      'Mapa de empatía completo en 4 dimensiones',
      'Perfil del afectado con nombre ficticio',
      '3 insights síntesis derivados del mapa',
    ],
    stepNumber: 0,
  },
  {
    id: 'interview-guide',
    name: 'Guía de Entrevista',
    shortName: 'Entrevistas',
    description:
      'Diseña preguntas que revelan la verdad sobre el problema. Documenta los hallazgos de al menos 3 entrevistas reales.',
    guidingQuestion: '¿Qué necesito preguntarle a alguien para saber si este problema es real y vale la pena resolver?',
    preambulo:
      'Las preguntas mal diseñadas confirman lo que ya crees. Las preguntas bien diseñadas te dicen la verdad aunque sea incómoda. Esta herramienta te enseña los principios de The Mom Test (Fitzpatrick): nunca preguntes si les gusta tu idea, pregunta sobre su comportamiento pasado.',
    ...stageProps(0),
    category: 'Mercado',
    estimatedTime: '45 min',
    outputs: [
      'Guía de 6-8 preguntas abiertas validadas',
      'Registro de hallazgos de 3+ entrevistas',
      'Patrones confirmados y supuestos refutados',
    ],
    stepNumber: 0,
  },
  {
    id: 'initial-idea',
    name: 'Idea Inicial',
    shortName: 'Idea inicial',
    description:
      'Sintetiza todo tu trabajo de Ideación en una hipótesis articulada: problema, cliente, solución y supuesto más riesgoso.',
    guidingQuestion: '¿Cuál es tu hipótesis de negocio más sólida dado lo que has descubierto?',
    preambulo:
      'La Idea Inicial no es un pitch — es un documento de trabajo. Articula lo que crees con la evidencia que tienes y señala claramente lo que aún no sabes. Es el punto de partida para Pre-incubación: lo que llevas contigo al comenzar a construir.',
    ...stageProps(0),
    category: 'Estrategia',
    estimatedTime: '35 min',
    outputs: [
      'Hipótesis de problema con evidencia',
      'Perfil del cliente con frecuencia y soluciones actuales',
      'Hipótesis de solución con ventaja diferencial',
      'Supuesto más riesgoso identificado',
    ],
    stepNumber: 0,
  },

  // ── Stage 1: Pre-incubación (6 herramientas) ──────────────────
  // ... existing tools unchanged
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/lorenzo/Documents/GitHub/Startups4climate && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors. Fix any type errors related to `stage: 0` before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tools-data.ts
git commit -m "feat(ideacion): add stage 0 tools-data entries + STAGE_META"
```

---

## Task 3: Update AuthContext — Add Stage to AppUser

**Files:**
- Modify: `src/context/AuthContext.tsx`

- [ ] **Step 1: Locate AppUser type definition**

Open `src/context/AuthContext.tsx`. Find the `AppUser` interface (search for `interface AppUser` or `type AppUser`).

- [ ] **Step 2: Add `stage` field**

Add `stage` to the AppUser type:
```ts
export interface AppUser {
  id: string
  full_name: string
  email: string
  role: 'founder' | 'admin_org' | 'superadmin'
  org_id: string | null
  startup_name?: string
  stage?: 'ideacion' | 'pre-incubacion' | 'incubacion' | 'aceleracion' | 'escalamiento' | null
}
```

- [ ] **Step 3: Add `stage` to the Supabase profiles select query**

Find the line where profiles are fetched (typically `supabase.from('profiles').select(...)`). Add `stage` to the select:
```ts
// BEFORE (example — match exact query in the file):
.select('id, full_name, email, role, org_id, startup_name')

// AFTER:
.select('id, full_name, email, role, org_id, startup_name, stage')
```

- [ ] **Step 4: Map the stage field in the appUser assignment**

Find where `appUser` is set from the profile data. Add the `stage` field:
```ts
setAppUser({
  id: profile.id,
  full_name: profile.full_name,
  email: profile.email ?? user.email ?? '',
  role: profile.role,
  org_id: profile.org_id ?? null,
  startup_name: profile.startup_name ?? undefined,
  stage: (profile.stage as AppUser['stage']) ?? null,
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat(ideacion): add stage field to AppUser type + profile fetch"
```

---

## Task 4: Update StartupLifecycle.tsx — Add Module 00

**Files:**
- Modify: `src/components/StartupLifecycle.tsx`

- [ ] **Step 1: Add module 00 to the stages array**

In `src/components/StartupLifecycle.tsx`, find the `const stages = [` array (line ~36). Insert the new module **before** the Pre-incubación entry:

```ts
const stages = [
  {
    id: 'ideacion',
    icon: Lightbulb,    // already imported
    number: '00',
    title: 'Ideación',
    focus: 'Descubre un problema real que vale la pena resolver, entiende a quién le duele y formula tu primera hipótesis de solución',
    accent: 'green' as const,
    tools: [
      { name: 'Exploración de problemas', icon: Map, desc: 'Mapea fricciones e injusticias en un territorio que conoces bien.' },
      { name: 'Selección del problema', icon: Target, desc: 'Evalúa cada problema con criterios de urgencia, mercado e impacto.' },
      { name: 'Mapa de empatía', icon: UserCircle, desc: 'Describe cómo piensa, ve, dice y escucha la persona afectada.' },
      { name: 'Guía de entrevista', icon: FileText, desc: 'Diseña preguntas que revelan la verdad sobre el problema.' },
      { name: 'Idea inicial', icon: Lightbulb, desc: 'Hipótesis articulada de problema, cliente y solución con evidencia.' },
    ],
  },
  {
    id: 'pre-incubacion',
    // ... existing unchanged
```

- [ ] **Step 2: Add green accent support**

The component currently handles `ember` and `electric` accents. Add `green`:

Find the `isEmber` line (around line ~106) and update:
```ts
// BEFORE:
const isEmber = stage.accent === 'ember'
const accentColor = isEmber ? '#F0721D' : '#5C9BFF'

// AFTER:
const accentColor =
  stage.accent === 'ember' ? '#F0721D'
  : stage.accent === 'green' ? '#16A34A'
  : '#5C9BFF'
```

Also update any inline style that checks `isEmber` — search for `isEmber` and replace each occurrence with `stage.accent === 'ember'`.

- [ ] **Step 3: Verify dev server renders correctly**

```bash
npm run dev &
```

Open http://localhost:3000 and navigate to the StartupLifecycle section. Verify:
- Module 00 "Ideación" appears before "Pre-incubación"
- Green accent color (#16A34A) is applied
- All 5 tools show in the expanded view

- [ ] **Step 4: Commit**

```bash
git add src/components/StartupLifecycle.tsx
git commit -m "feat(ideacion): add Module 00 to StartupLifecycle component"
```

---

## Task 5: Update tools/layout.tsx — Sidebar Stage 0

**Files:**
- Modify: `src/app/tools/layout.tsx`

- [ ] **Step 1: Add stage 0 to STAGE_CONFIG**

In `src/app/tools/layout.tsx`, find:
```ts
const STAGE_CONFIG = {
  1: { label: 'Pre-incubación', color: '#DA4E24' },
  // ...
} as const
```

Add stage 0:
```ts
const STAGE_CONFIG = {
  0: { label: 'Ideación', color: '#16A34A' },
  1: { label: 'Pre-incubación', color: '#DA4E24' },
  2: { label: 'Incubación', color: '#1F77F6' },
  3: { label: 'Aceleración', color: '#F0721D' },
  4: { label: 'Escalamiento', color: '#5BB4FF' },
} as const
```

Update the type annotation for `stageNum` in `StageSidebarSection`:
```ts
// BEFORE:
stageNum: 1 | 2 | 3 | 4

// AFTER:
stageNum: 0 | 1 | 2 | 3 | 4
```

- [ ] **Step 2: Add stage 0 section to sidebar + lock logic**

Find the sidebar tools-by-stage section (around line ~788):
```ts
{([1, 2, 3, 4] as const).map((stage) => (
  <StageSidebarSection .../>
))}
```

Replace with:
```ts
{([0, 1, 2, 3, 4] as const).map((stage) => {
  // Pre-incubación+ is locked if founder is in 'ideacion' stage
  const founderStage = appUser?.stage ?? null
  const isLocked = stage >= 1 && founderStage === 'ideacion'
  return (
    <div key={stage} style={{ position: 'relative' }}>
      <StageSidebarSection
        stageNum={stage}
        tools={TOOLS_BY_STAGE[stage] ?? []}
        completedIds={completedIds}
        currentPath={pathname}
        currentSearchStage={currentSearchStage}
      />
      {isLocked && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem',
          backdropFilter: 'blur(1px)',
          cursor: 'not-allowed',
        }}>
          <Lock size={10} color="rgba(255,255,255,0.5)" />
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.5625rem',
            color: 'rgba(255,255,255,0.5)',
          }}>
            Completa Ideación primero
          </span>
        </div>
      )}
    </div>
  )
})}
```

Make sure `Lock` is imported from `lucide-react` at the top of the file (it's likely already there; if not, add it).

- [ ] **Step 3: Verify sidebar shows Module 00 and locks correctly**

Run the dev server and log in as a founder. Check:
- Ideación section appears first in sidebar (green dot)
- If `appUser.stage === 'ideacion'` (need to set this in DB for test), Pre-incubación+ shows locked overlay
- If `appUser.stage === null` or 'pre-incubacion', no locking

To test: Update a founder's stage in Supabase SQL editor: `UPDATE profiles SET stage = 'ideacion' WHERE email = 'founder@demo.startups4climate.org';` then log in.

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/layout.tsx
git commit -m "feat(ideacion): sidebar stage 0 + progressive lock overlay"
```

---

## Task 6: Five New Tool Components

### 6a — ProblemExploration.tsx (Tool 00.1)

**Files:**
- Create: `src/components/tools/ProblemExploration.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import {
  ToolSection, ToolActionBar, ToolProgress,
  inputStyle, textareaStyle, labelStyle, btnSmall,
} from './shared'

interface Problem {
  description: string
  context: string
  affected: string
  frequency: 'Diaria' | 'Semanal' | 'Mensual' | 'Esporádica'
}

interface Data {
  territory: string
  problems: Problem[]
}

const FREQUENCY_OPTIONS = ['Diaria', 'Semanal', 'Mensual', 'Esporádica'] as const
const emptyProblem = (): Problem => ({
  description: '', context: '', affected: '', frequency: 'Semanal',
})
const DEFAULT: Data = { territory: '', problems: [emptyProblem()] }

const ACCENT = '#16A34A'

export default function ProblemExploration({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'problem-exploration', DEFAULT)
  const [saved, setSaved] = useState(false)

  const updateProblem = (i: number, field: keyof Problem, value: string) =>
    setData(p => { const ps = [...p.problems]; ps[i] = { ...ps[i], [field]: value }; return { ...p, problems: ps } })
  const addProblem = () => setData(p => ({ ...p, problems: [...p.problems, emptyProblem()] }))
  const removeProblem = (i: number) =>
    setData(p => ({ ...p, problems: p.problems.filter((_, idx) => idx !== i) }))

  const filledCount = data.problems.filter(p => p.description.trim() && p.affected.trim()).length
  const totalCount = Math.max(data.problems.length, 1)

  const handleReport = () => {
    const content = `
EXPLORACIÓN DE PROBLEMAS

TERRITORIO EXPLORADO: ${data.territory || '(No completado)'}

PROBLEMAS IDENTIFICADOS:
${data.problems.map((p, i) => `
Problema ${i + 1}: ${p.description || '(No completado)'}
  Contexto: ${p.context || '(No completado)'}
  Personas afectadas: ${p.affected || '(No completado)'}
  Frecuencia: ${p.frequency}`).join('\n')}

TOTAL: ${data.problems.length} problema(s) identificado(s)
`.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledCount} total={Math.min(totalCount, 5)} accentColor={ACCENT} />

      {/* Section 1: Territory */}
      <ToolSection
        number={1}
        title="Elige tu territorio"
        subtitle="¿Desde qué comunidad, sector o contexto observarás?"
        insight="El Design Thinking (Stanford d.school) comienza con empatía en un territorio específico. Mientras más familiar sea el contexto, más rica será la observación."
        insightSource="Stanford d.school — Design Thinking"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <label style={labelStyle}>Describe el territorio o contexto que conoces bien</label>
        <textarea
          value={data.territory}
          onChange={e => setData(p => ({ ...p, territory: e.target.value }))}
          placeholder="Ej: Pequeños agricultores de la selva amazónica que venden en mercados locales. Conozco este contexto porque crecí en Ucayali y he trabajado con cooperativas."
          style={{ ...textareaStyle, minHeight: 90 }}
        />
      </ToolSection>

      {/* Section 2: Problems */}
      <ToolSection
        number={2}
        title="Mapea los problemas"
        subtitle={`${data.problems.length} problema(s) — apunta a 5-8`}
        insight="Pregunta guía: ¿Qué le resulta difícil, costoso, lento o injusto a la gente en este contexto? No pienses en soluciones aún — solo observa y documenta."
        insightSource="IDEO Human-Centered Design"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.problems.map((problem, i) => (
            <div
              key={i}
              style={{
                padding: '1rem',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)',
                position: 'relative',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-heading)', fontSize: '0.75rem',
                  fontWeight: 700, color: ACCENT,
                }}>
                  Problema {i + 1}
                </span>
                {data.problems.length > 1 && (
                  <button
                    onClick={() => removeProblem(i)}
                    style={{ ...btnSmall, color: '#EF4444', borderColor: '#FCA5A580' }}
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>¿Cuál es el problema?</label>
                  <textarea
                    value={problem.description}
                    onChange={e => updateProblem(i, 'description', e.target.value)}
                    placeholder="Describe el problema desde el punto de vista de quien lo sufre, no de la solución técnica."
                    style={{ ...textareaStyle, minHeight: 70 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>¿En qué contexto ocurre?</label>
                  <input
                    value={problem.context}
                    onChange={e => updateProblem(i, 'context', e.target.value)}
                    placeholder="Situación específica donde aparece el problema"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>¿Quiénes lo viven?</label>
                    <input
                      value={problem.affected}
                      onChange={e => updateProblem(i, 'affected', e.target.value)}
                      placeholder="Describe al afectado típico"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>¿Con qué frecuencia?</label>
                    <select
                      value={problem.frequency}
                      onChange={e => updateProblem(i, 'frequency', e.target.value as Problem['frequency'])}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {data.problems.length < 8 && (
            <button onClick={addProblem} style={{
              ...btnSmall, color: ACCENT,
              borderColor: `${ACCENT}40`, borderStyle: 'dashed',
              padding: '0.625rem 1rem', borderRadius: 10, width: '100%',
              justifyContent: 'center',
            }}>
              <Plus size={14} /> Agregar otro problema
            </button>
          )}
        </div>
      </ToolSection>

      <ToolActionBar
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        onComplete={onComplete}
        onReport={handleReport}
        saved={saved}
        accentColor={ACCENT}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify it renders (will be registered in Task 7)**

No additional verification here — component will be testable after Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/ProblemExploration.tsx
git commit -m "feat(ideacion): 00.1 ProblemExploration tool component"
```

---

### 6b — ProblemSelection.tsx (Tool 00.2)

**Files:**
- Create: `src/components/tools/ProblemSelection.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import {
  ToolSection, ToolActionBar, ToolProgress,
  inputStyle, textareaStyle, labelStyle, btnSmall,
} from './shared'

interface ProblemScore {
  name: string
  urgency: number     // 1-5
  market: number      // 1-5
  willingness: number // 1-5
  impact: number      // 1-5
}

interface Data {
  problems: ProblemScore[]
  selectedIndex: number | null
  justification: string
}

const DEFAULT: Data = {
  problems: [
    { name: '', urgency: 3, market: 3, willingness: 3, impact: 3 },
    { name: '', urgency: 3, market: 3, willingness: 3, impact: 3 },
    { name: '', urgency: 3, market: 3, willingness: 3, impact: 3 },
  ],
  selectedIndex: null,
  justification: '',
}

const ACCENT = '#16A34A'

const DIMENSIONS = [
  { key: 'urgency' as const, label: 'Urgencia', hint: '¿Qué tan doloroso es? ¿Con qué frecuencia ocurre?' },
  { key: 'market' as const, label: 'Mercado', hint: '¿Cuántas personas lo viven? ¿Hay masa crítica?' },
  { key: 'willingness' as const, label: 'Disposición a pagar', hint: '¿Pagarían por resolverlo? ¿Ya gastan en soluciones parciales?' },
  { key: 'impact' as const, label: 'Impacto climático/social', hint: '¿Qué tan relevante para un futuro sostenible?' },
]

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: `1.5px solid ${n <= value ? ACCENT : 'var(--color-border)'}`,
            background: n <= value ? `${ACCENT}15` : 'transparent',
            color: n <= value ? ACCENT : 'var(--color-text-muted)',
            fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function ProblemSelection({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'problem-selection', DEFAULT)
  const [saved, setSaved] = useState(false)

  const totalScore = (p: ProblemScore) => p.urgency + p.market + p.willingness + p.impact

  const updateProblem = (i: number, field: keyof ProblemScore, value: string | number) =>
    setData(p => { const ps = [...p.problems]; ps[i] = { ...ps[i], [field]: value }; return { ...p, problems: ps } })

  const addProblem = () =>
    setData(p => ({ ...p, problems: [...p.problems, { name: '', urgency: 3, market: 3, willingness: 3, impact: 3 }] }))

  const removeProblem = (i: number) =>
    setData(p => ({
      ...p,
      problems: p.problems.filter((_, idx) => idx !== i),
      selectedIndex: p.selectedIndex === i ? null : p.selectedIndex !== null && p.selectedIndex > i ? p.selectedIndex - 1 : p.selectedIndex,
    }))

  const filledCount = [
    data.problems.filter(p => p.name.trim()).length > 0 ? 1 : 0,
    data.selectedIndex !== null ? 1 : 0,
    data.justification.trim() ? 1 : 0,
  ].filter(Boolean).length

  const sortedByScore = [...data.problems]
    .map((p, i) => ({ ...p, originalIndex: i, total: totalScore(p) }))
    .sort((a, b) => b.total - a.total)

  const handleReport = () => {
    const selected = data.selectedIndex !== null ? data.problems[data.selectedIndex] : null
    const content = `
SELECCIÓN DEL PROBLEMA

MATRIZ DE EVALUACIÓN:
${data.problems.map((p, i) => `
Problema ${i + 1}: ${p.name || '(Sin nombre)'}
  Urgencia: ${p.urgency}/5
  Mercado: ${p.market}/5
  Disposición a pagar: ${p.willingness}/5
  Impacto climático/social: ${p.impact}/5
  TOTAL: ${totalScore(p)}/20`).join('\n')}

PROBLEMA SELECCIONADO: ${selected?.name || '(No seleccionado)'}
Puntuación: ${selected ? `${totalScore(selected)}/20` : '—'}

JUSTIFICACIÓN: ${data.justification || '(No completada)'}
`.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledCount} total={3} accentColor={ACCENT} />

      <ToolSection
        number={1}
        title="Evalúa cada problema"
        subtitle="Puntúa del 1 (mínimo) al 5 (máximo) en cada dimensión"
        insight="Metodología ICE adaptada con criterio de impacto: los mejores problemas para una startup de impacto tienen alta urgencia, mercado suficiente Y relevancia climática/social."
        insightSource="DE Step 0 (Aulet, MIT) · Matriz ICE"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {data.problems.map((problem, i) => (
            <div key={i} style={{
              padding: '1rem 1.25rem', borderRadius: 12,
              border: `1.5px solid ${data.selectedIndex === i ? ACCENT : 'var(--color-border)'}`,
              background: data.selectedIndex === i ? `${ACCENT}05` : 'var(--color-bg-primary)',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <input
                  value={problem.name}
                  onChange={e => updateProblem(i, 'name', e.target.value)}
                  placeholder={`Nombre corto del problema ${i + 1}`}
                  style={{
                    ...inputStyle, fontWeight: 600,
                    fontSize: '0.875rem', flex: 1, marginRight: '0.75rem',
                  }}
                />
                <div style={{
                  fontFamily: 'var(--font-heading)', fontSize: '1.125rem',
                  fontWeight: 700, color: ACCENT, minWidth: 48, textAlign: 'right',
                }}>
                  {totalScore(problem)}/20
                </div>
                {data.problems.length > 2 && (
                  <button onClick={() => removeProblem(i)} style={{ ...btnSmall, marginLeft: '0.5rem', color: '#EF4444' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {DIMENSIONS.map(dim => (
                  <div key={dim.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ minWidth: 180 }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {dim.label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        {dim.hint}
                      </span>
                    </div>
                    <ScoreInput value={problem[dim.key]} onChange={v => updateProblem(i, dim.key, v)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {data.problems.length < 8 && (
            <button onClick={addProblem} style={{
              ...btnSmall, color: ACCENT, borderColor: `${ACCENT}40`,
              borderStyle: 'dashed', padding: '0.625rem', borderRadius: 10, width: '100%', justifyContent: 'center',
            }}>
              <Plus size={14} /> Agregar problema
            </button>
          )}
        </div>
      </ToolSection>

      <ToolSection
        number={2}
        title="Selecciona el problema ganador"
        subtitle="Elige el que llevarás a Mapa de Empatía"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {sortedByScore.map((problem, rank) => (
            <button
              key={problem.originalIndex}
              onClick={() => setData(p => ({ ...p, selectedIndex: problem.originalIndex }))}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: 10,
                border: `1.5px solid ${data.selectedIndex === problem.originalIndex ? ACCENT : 'var(--color-border)'}`,
                background: data.selectedIndex === problem.originalIndex ? `${ACCENT}08` : 'var(--color-bg-primary)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-heading)', fontSize: '0.6875rem', fontWeight: 700,
                color: rank === 0 ? ACCENT : 'var(--color-text-muted)',
                minWidth: 20,
              }}>
                #{rank + 1}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-primary)', flex: 1 }}>
                {problem.name || '(Sin nombre)'}
              </span>
              <span style={{
                fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: ACCENT,
              }}>
                {problem.total}/20
              </span>
              {data.selectedIndex === problem.originalIndex && <CheckCircle2 size={16} color={ACCENT} />}
            </button>
          ))}
        </div>

        <label style={labelStyle}>¿Por qué elegiste este problema? (justifica con evidencia)</label>
        <textarea
          value={data.justification}
          onChange={e => setData(p => ({ ...p, justification: e.target.value }))}
          placeholder="Explica por qué este problema tiene más potencial que los demás. ¿Tienes evidencia de la urgencia? ¿Conoces personas que lo viven? ¿Has visto que otros intentaron resolverlo y fallaron?"
          style={{ ...textareaStyle, minHeight: 100 }}
        />
      </ToolSection>

      <ToolActionBar
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        onComplete={onComplete}
        onReport={handleReport}
        saved={saved}
        accentColor={ACCENT}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tools/ProblemSelection.tsx
git commit -m "feat(ideacion): 00.2 ProblemSelection tool component"
```

---

### 6c — EmpathyMap.tsx (Tool 00.3)

**Files:**
- Create: `src/components/tools/EmpathyMap.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import {
  ToolSection, ToolActionBar, ToolProgress,
  inputStyle, textareaStyle, labelStyle, btnSmall,
} from './shared'

interface Data {
  personName: string
  personContext: string
  thinksFeel: string
  sees: string
  saysDoes: string
  hears: string
  insights: string[]
}

const DEFAULT: Data = {
  personName: '',
  personContext: '',
  thinksFeel: '',
  sees: '',
  saysDoes: '',
  hears: '',
  insights: ['', '', ''],
}

const ACCENT = '#16A34A'

const QUADRANTS = [
  {
    key: 'thinksFeel' as const,
    title: 'Piensa y siente',
    subtitle: 'Sus preocupaciones, aspiraciones, miedos internos (lo que no dice en voz alta)',
    placeholder: 'Ej: Teme que su negocio no sobreviva la próxima temporada. Se preocupa por cómo pagar la educación de sus hijos. Aspira a tener más control sobre el precio de venta de su cosecha.',
  },
  {
    key: 'sees' as const,
    title: 'Ve',
    subtitle: 'Su entorno físico, lo que observa a diario, los influenciadores que sigue',
    placeholder: 'Ej: Ve a sus vecinos usando la misma tecnología de hace 20 años. Observa que los intermediarios se llevan el 40% del margen. Sigue a líderes de su comunidad en WhatsApp.',
  },
  {
    key: 'saysDoes' as const,
    title: 'Dice y hace',
    subtitle: 'Comportamiento observable, lo que declara públicamente, sus acciones reales',
    placeholder: 'Ej: Dice que "el sistema no está hecho para nosotros". Participa en reuniones de la cooperativa pero raramente habla. Vende directamente a intermediarios aunque sabe que pierde margen.',
  },
  {
    key: 'hears' as const,
    title: 'Escucha',
    subtitle: 'Lo que le dicen colegas, familia, medios, figuras de autoridad',
    placeholder: 'Ej: Sus hijos le dicen que deje de trabajar la tierra. El gobierno le dice que aplique a subsidios pero el trámite es imposible. Sus pares le dicen que no hay alternativa.',
  },
]

export default function EmpathyMap({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'empathy-map', DEFAULT)
  const [saved, setSaved] = useState(false)

  const filledQuadrants = [data.thinksFeel, data.sees, data.saysDoes, data.hears].filter(v => v.trim()).length
  const filledInsights = data.insights.filter(i => i.trim()).length
  const filledCount = (data.personName.trim() ? 1 : 0) + (filledQuadrants >= 4 ? 1 : 0) + (filledInsights >= 3 ? 1 : 0)

  const updateInsight = (i: number, value: string) =>
    setData(p => { const ins = [...p.insights]; ins[i] = value; return { ...p, insights: ins } })

  const handleReport = () => {
    const content = `
MAPA DE EMPATÍA

PERSONA: ${data.personName || '(Sin nombre)'}
CONTEXTO: ${data.personContext || '(No completado)'}

PIENSA Y SIENTE:
${data.thinksFeel || '(No completado)'}

VE:
${data.sees || '(No completado)'}

DICE Y HACE:
${data.saysDoes || '(No completado)'}

ESCUCHA:
${data.hears || '(No completado)'}

INSIGHTS SÍNTESIS:
${data.insights.map((ins, i) => `${i + 1}. ${ins || '(No completado)'}`).join('\n')}
`.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledCount} total={3} accentColor={ACCENT} />

      <ToolSection
        number={1}
        title="¿De quién es este mapa?"
        subtitle="La persona que vive el problema que seleccionaste"
        insight="Shift fundamental del Design Thinking: el founder deja de ser el protagonista. El afectado ocupa el centro. Esta perspectiva es el corazón del Human-Centered Design."
        insightSource="XPLANE / Dave Gray — Mapa de Empatía · Stanford d.school"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Nombre ficticio de la persona</label>
            <input
              value={data.personName}
              onChange={e => setData(p => ({ ...p, personName: e.target.value }))}
              placeholder="Ej: María, 38 años"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Contexto / perfil breve</label>
            <input
              value={data.personContext}
              onChange={e => setData(p => ({ ...p, personContext: e.target.value }))}
              placeholder="Ej: Agricultora de café, comunidad rural en Perú"
              style={inputStyle}
            />
          </div>
        </div>
      </ToolSection>

      <ToolSection
        number={2}
        title="Los 4 cuadrantes"
        subtitle="Describe qué experimenta la persona desde adentro"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          {QUADRANTS.map(q => (
            <div key={q.key} style={{
              padding: '1rem', borderRadius: 12,
              border: `1px solid ${data[q.key].trim() ? ACCENT + '40' : 'var(--color-border)'}`,
              background: 'var(--color-bg-primary)',
            }}>
              <div style={{
                fontFamily: 'var(--font-heading)', fontSize: '0.8125rem',
                fontWeight: 700, color: ACCENT, marginBottom: '0.25rem',
              }}>
                {q.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.6875rem',
                color: 'var(--color-text-muted)', marginBottom: '0.625rem', lineHeight: 1.4,
              }}>
                {q.subtitle}
              </div>
              <textarea
                value={data[q.key]}
                onChange={e => setData(p => ({ ...p, [q.key]: e.target.value }))}
                placeholder={q.placeholder}
                style={{ ...textareaStyle, minHeight: 110, fontSize: '0.8125rem' }}
              />
            </div>
          ))}
        </div>
      </ToolSection>

      <ToolSection
        number={3}
        title="3 insights síntesis"
        subtitle="¿Qué revela este mapa que no sabías antes?"
        insight="Un insight no es una observación — es una contradicción, una tensión no resuelta, o una necesidad oculta que nadie estaba satisfaciendo."
        insightSource="IDEO — Design Thinking"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {data.insights.map((insight, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: insight.trim() ? `${ACCENT}15` : 'var(--color-border)',
                border: `1.5px solid ${insight.trim() ? ACCENT : 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 700,
                color: insight.trim() ? ACCENT : 'var(--color-text-muted)',
              }}>
                {i + 1}
              </div>
              <textarea
                value={insight}
                onChange={e => updateInsight(i, e.target.value)}
                placeholder={`Insight ${i + 1}: Aunque [la persona] dice X, en realidad necesita/siente Y porque...`}
                style={{ ...textareaStyle, flex: 1, minHeight: 60 }}
              />
            </div>
          ))}
        </div>
      </ToolSection>

      <ToolActionBar
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        onComplete={onComplete}
        onReport={handleReport}
        saved={saved}
        accentColor={ACCENT}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tools/EmpathyMap.tsx
git commit -m "feat(ideacion): 00.3 EmpathyMap tool component"
```

---

### 6d — InterviewGuide.tsx (Tool 00.4)

**Files:**
- Create: `src/components/tools/InterviewGuide.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import type { ToolComponentProps } from './ToolPage'
import {
  ToolSection, ToolActionBar, ToolProgress,
  inputStyle, textareaStyle, labelStyle, btnSmall,
} from './shared'

interface Question {
  text: string
  type: 'past-behavior' | 'context' | 'pain-depth' | 'current-solution'
}

interface Interview {
  interviewee: string
  date: string
  quotes: string
  patterns: string
  validated: string
  refuted: string
}

interface Data {
  questions: Question[]
  interviews: Interview[]
  synthesis: string
}

const QUESTION_TYPES = [
  { value: 'past-behavior' as const, label: 'Comportamiento pasado', color: '#16A34A' },
  { value: 'context' as const, label: 'Contexto', color: '#1F77F6' },
  { value: 'pain-depth' as const, label: 'Profundidad del dolor', color: '#DA4E24' },
  { value: 'current-solution' as const, label: 'Solución actual', color: '#9333EA' },
]

const emptyQuestion = (): Question => ({ text: '', type: 'past-behavior' })
const emptyInterview = (): Interview => ({
  interviewee: '', date: '', quotes: '', patterns: '', validated: '', refuted: '',
})
const DEFAULT: Data = {
  questions: [emptyQuestion(), emptyQuestion(), emptyQuestion()],
  interviews: [emptyInterview()],
  synthesis: '',
}

const ACCENT = '#16A34A'

export default function InterviewGuide({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'interview-guide', DEFAULT)
  const [saved, setSaved] = useState(false)

  const filledQuestions = data.questions.filter(q => q.text.trim()).length
  const filledInterviews = data.interviews.filter(i => i.interviewee.trim() && i.quotes.trim()).length

  const filledCount = (filledQuestions >= 6 ? 1 : 0) + (filledInterviews >= 3 ? 1 : 0) + (data.synthesis.trim() ? 1 : 0)

  const updateQuestion = (i: number, field: keyof Question, value: string) =>
    setData(p => { const qs = [...p.questions]; qs[i] = { ...qs[i], [field]: value as Question[keyof Question] }; return { ...p, questions: qs } })

  const addQuestion = () => setData(p => ({ ...p, questions: [...p.questions, emptyQuestion()] }))
  const removeQuestion = (i: number) => setData(p => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }))

  const updateInterview = (i: number, field: keyof Interview, value: string) =>
    setData(p => { const ivs = [...p.interviews]; ivs[i] = { ...ivs[i], [field]: value }; return { ...p, interviews: ivs } })

  const addInterview = () => setData(p => ({ ...p, interviews: [...p.interviews, emptyInterview()] }))
  const removeInterview = (i: number) => setData(p => ({ ...p, interviews: p.interviews.filter((_, idx) => idx !== i) }))

  const handleReport = () => {
    const content = `
GUÍA DE ENTREVISTA

PREGUNTAS DISEÑADAS:
${data.questions.map((q, i) => `${i + 1}. [${q.type}] ${q.text || '(No completada)'}`).join('\n')}

REGISTRO DE ENTREVISTAS (${data.interviews.length}):
${data.interviews.map((iv, i) => `
Entrevista ${i + 1}: ${iv.interviewee || '(Sin nombre)'} — ${iv.date || 'Sin fecha'}
  Citas relevantes: ${iv.quotes || '(No registradas)'}
  Patrones: ${iv.patterns || '(No registrados)'}
  Supuestos VALIDADOS: ${iv.validated || '(Ninguno)'}
  Supuestos REFUTADOS: ${iv.refuted || '(Ninguno)'}`).join('\n')}

SÍNTESIS DE PATRONES:
${data.synthesis || '(No completada)'}
`.trim()
    onGenerateReport(content)
  }

  const typeColor = (type: Question['type']) =>
    QUESTION_TYPES.find(t => t.value === type)?.color ?? ACCENT

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledCount} total={3} accentColor={ACCENT} />

      <ToolSection
        number={1}
        title="Diseña tu guía de preguntas"
        subtitle={`${data.questions.filter(q => q.text.trim()).length}/${data.questions.length} preguntas escritas — mínimo 6`}
        insight="The Mom Test (Fitzpatrick): nunca preguntes si les gusta tu idea. Pregunta sobre el pasado: '¿Cuándo fue la última vez que...?' No reveles tu solución. Busca comportamiento real, no intención hipotética."
        insightSource="The Mom Test — Rob Fitzpatrick"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {data.questions.map((q, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              padding: '0.875rem', borderRadius: 10,
              border: `1px solid ${q.text.trim() ? typeColor(q.type) + '40' : 'var(--color-border)'}`,
              background: 'var(--color-bg-primary)',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
                background: `${typeColor(q.type)}15`,
                border: `1.5px solid ${typeColor(q.type)}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 700,
                color: typeColor(q.type),
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {QUESTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => updateQuestion(i, 'type', t.value)}
                      style={{
                        ...btnSmall,
                        color: q.type === t.value ? '#fff' : t.color,
                        background: q.type === t.value ? t.color : 'transparent',
                        borderColor: `${t.color}40`,
                        fontSize: '0.625rem',
                        padding: '0.2rem 0.5rem',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={q.text}
                  onChange={e => updateQuestion(i, 'text', e.target.value)}
                  placeholder="Escribe la pregunta completa tal como la harías en la entrevista..."
                  style={{ ...textareaStyle, minHeight: 55, fontSize: '0.875rem' }}
                />
              </div>
              {data.questions.length > 3 && (
                <button onClick={() => removeQuestion(i)} style={{ ...btnSmall, color: '#EF4444', marginTop: 2 }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {data.questions.length < 10 && (
          <button onClick={addQuestion} style={{
            ...btnSmall, color: ACCENT, borderColor: `${ACCENT}40`,
            borderStyle: 'dashed', padding: '0.625rem', borderRadius: 10,
            width: '100%', justifyContent: 'center',
          }}>
            <Plus size={14} /> Agregar pregunta
          </button>
        )}

        {/* Validation reminder */}
        <div style={{
          marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: 10,
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
          display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <strong>Revisa antes de entrevistar:</strong> ¿Alguna pregunta empieza con "¿Te gustaría…?" o "¿Estarías dispuesto a…?"? Esas revelan tu solución y sesgan la respuesta. Reformúlalas en tiempo pasado.
          </span>
        </div>
      </ToolSection>

      <ToolSection
        number={2}
        title="Registro de entrevistas"
        subtitle={`${filledInterviews} entrevista(s) registrada(s) — mínimo 3`}
        defaultOpen={filledInterviews > 0}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.interviews.map((iv, i) => (
            <div key={i} style={{
              padding: '1rem', borderRadius: 12,
              border: `1px solid ${iv.interviewee.trim() ? ACCENT + '30' : 'var(--color-border)'}`,
              background: 'var(--color-bg-primary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, color: ACCENT }}>
                  Entrevista {i + 1}
                </span>
                {data.interviews.length > 1 && (
                  <button onClick={() => removeInterview(i)} style={{ ...btnSmall, color: '#EF4444' }}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Entrevistado/a (nombre o alias)</label>
                  <input value={iv.interviewee} onChange={e => updateInterview(i, 'interviewee', e.target.value)} placeholder="María R., 38 años, agricultora" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={iv.date} onChange={e => updateInterview(i, 'date', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div>
                  <label style={labelStyle}>Citas textuales más relevantes (entre comillas)</label>
                  <textarea value={iv.quotes} onChange={e => updateInterview(i, 'quotes', e.target.value)} placeholder='"Cuando llevo mi cosecha al mercado siempre pierdo porque no sé el precio del día..."' style={{ ...textareaStyle, minHeight: 70 }} />
                </div>
                <div>
                  <label style={labelStyle}>Patrones observados / comportamientos notables</label>
                  <textarea value={iv.patterns} onChange={e => updateInterview(i, 'patterns', e.target.value)} placeholder="Qué fue sorprendente, qué se repitió, qué contradicción observaste" style={{ ...textareaStyle, minHeight: 60 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ ...labelStyle, color: '#16A34A' }}>Supuestos CONFIRMADOS</label>
                    <textarea value={iv.validated} onChange={e => updateInterview(i, 'validated', e.target.value)} placeholder="¿Qué creías antes que esto confirmó?" style={{ ...textareaStyle, minHeight: 60 }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: '#DC2626' }}>Supuestos REFUTADOS</label>
                    <textarea value={iv.refuted} onChange={e => updateInterview(i, 'refuted', e.target.value)} placeholder="¿Qué creías antes que esto refutó?" style={{ ...textareaStyle, minHeight: 60 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addInterview} style={{
            ...btnSmall, color: ACCENT, borderColor: `${ACCENT}40`,
            borderStyle: 'dashed', padding: '0.625rem', borderRadius: 10, width: '100%', justifyContent: 'center',
          }}>
            <Plus size={14} /> Agregar entrevista
          </button>
        </div>
      </ToolSection>

      <ToolSection
        number={3}
        title="Síntesis de patrones"
        subtitle="¿Qué aprendiste de todas las entrevistas juntas?"
        defaultOpen={filledInterviews >= 2}
        accentColor={ACCENT}
      >
        <textarea
          value={data.synthesis}
          onChange={e => setData(p => ({ ...p, synthesis: e.target.value }))}
          placeholder="Describe los 3-5 patrones que se repitieron en las entrevistas. ¿Qué supuestos quedaron confirmados? ¿Qué te sorprendió? ¿Cambió alguna hipótesis importante?"
          style={{ ...textareaStyle, minHeight: 110 }}
        />
        {filledInterviews >= 3 && (
          <div style={{
            marginTop: '0.75rem', padding: '0.75rem', borderRadius: 10,
            background: `${ACCENT}08`, border: `1px solid ${ACCENT}25`,
            display: 'flex', gap: '0.5rem', alignItems: 'center',
          }}>
            <CheckCircle2 size={14} color={ACCENT} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: ACCENT, fontWeight: 600 }}>
              Con {filledInterviews} entrevistas completadas puedes avanzar a la Idea inicial.
            </span>
          </div>
        )}
      </ToolSection>

      <ToolActionBar
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        onComplete={onComplete}
        onReport={handleReport}
        saved={saved}
        accentColor={ACCENT}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tools/InterviewGuide.tsx
git commit -m "feat(ideacion): 00.4 InterviewGuide tool component"
```

---

### 6e — InitialIdea.tsx (Tool 00.5)

**Files:**
- Create: `src/components/tools/InitialIdea.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useState } from 'react'
import { Unlock } from 'lucide-react'
import { useToolState } from '@/lib/useToolState'
import { supabase } from '@/lib/supabase'
import type { ToolComponentProps } from './ToolPage'
import {
  ToolSection, ToolActionBar, ToolProgress,
  inputStyle, textareaStyle, labelStyle,
} from './shared'

interface Data {
  problem: string
  problemEvidence: string
  customer: string
  problemFrequency: 'Diaria' | 'Semanal' | 'Mensual' | 'Esporádica'
  currentSolutions: string
  hypothesis: string
  whyUs: string
  riskiestAssumption: string
}

const FREQUENCY_OPTIONS = ['Diaria', 'Semanal', 'Mensual', 'Esporádica'] as const

const DEFAULT: Data = {
  problem: '',
  problemEvidence: '',
  customer: '',
  problemFrequency: 'Semanal',
  currentSolutions: '',
  hypothesis: '',
  whyUs: '',
  riskiestAssumption: '',
}

const ACCENT = '#16A34A'

export default function InitialIdea({ userId, onComplete, onGenerateReport }: ToolComponentProps) {
  const [data, setData] = useToolState<Data>(userId, 'initial-idea', DEFAULT)
  const [saved, setSaved] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  const fields: (keyof Data)[] = [
    'problem', 'problemEvidence', 'customer', 'currentSolutions',
    'hypothesis', 'whyUs', 'riskiestAssumption',
  ]
  const filledCount = fields.filter(f => (data[f] as string).trim()).length
  const isComplete = filledCount >= 6

  const handleComplete = async () => {
    // 1. Mark the tool as completed (standard behavior)
    onComplete()

    // 2. Unlock Pre-incubación by updating profiles.stage
    setUnlocking(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ stage: 'pre-incubacion' })
        .eq('id', userId)

      if (error) {
        console.error('[S4C Sync] Error unlocking Pre-incubación:', error)
      }
    } catch (err) {
      console.error('[S4C Sync] Error unlocking Pre-incubación:', err)
    } finally {
      setUnlocking(false)
    }
  }

  const handleReport = () => {
    const content = `
IDEA INICIAL

PROBLEMA: ${data.problem || '(No completado)'}
  Evidencia: ${data.problemEvidence || '(Sin evidencia documentada)'}

CLIENTE: ${data.customer || '(No completado)'}
  Frecuencia del problema: ${data.problemFrequency}
  Soluciones actuales: ${data.currentSolutions || '(No completado)'}

HIPÓTESIS DE SOLUCIÓN: ${data.hypothesis || '(No completada)'}
  Por qué nosotros: ${data.whyUs || '(No completado)'}

SUPUESTO MÁS RIESGOSO: ${data.riskiestAssumption || '(No identificado)'}
`.trim()
    onGenerateReport(content)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ToolProgress filled={filledCount} total={fields.length} accentColor={ACCENT} />

      {/* Unlock banner */}
      <div style={{
        padding: '1rem 1.25rem', borderRadius: 12,
        background: `${ACCENT}08`, border: `1px solid ${ACCENT}25`,
        display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
      }}>
        <Unlock size={20} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: ACCENT, marginBottom: '0.25rem' }}>
            Esta herramienta desbloquea Pre-incubación
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Al completarla, el módulo de Pre-incubación se activa y tu hipótesis de problema y cliente se pre-carga en las primeras herramientas.
          </div>
        </div>
      </div>

      {/* Section 1: Problem */}
      <ToolSection
        number={1}
        title="El problema"
        subtitle="Específico, desde la perspectiva del afectado"
        insight="DE Step 0 (Aulet): el problema debe ser articulado desde el punto de vista del afectado, con evidencia de entrevistas reales. Un problema sin evidencia es solo una hipótesis."
        insightSource="Disciplined Entrepreneurship Step 0 — Bill Aulet, MIT"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Describe el problema (1-2 oraciones, desde el afectado)</label>
            <textarea
              value={data.problem}
              onChange={e => setData(p => ({ ...p, problem: e.target.value }))}
              placeholder="Los pequeños agricultores de café en regiones remotas de Perú pierden entre 20-35% de su ingreso potencial porque no tienen acceso a precios de mercado en tiempo real al momento de negociar con intermediarios."
              style={{ ...textareaStyle, minHeight: 80 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Evidencia de entrevistas que lo confirma</label>
            <textarea
              value={data.problemEvidence}
              onChange={e => setData(p => ({ ...p, problemEvidence: e.target.value }))}
              placeholder='Citas o hallazgos concretos de tus entrevistas. Ej: "En 4 de 5 entrevistas, los agricultores mencionaron que el intermediario siempre llega con el precio ya decidido y ellos no tienen con qué comparar."'
              style={{ ...textareaStyle, minHeight: 80 }}
            />
          </div>
        </div>
      </ToolSection>

      {/* Section 2: Customer */}
      <ToolSection
        number={2}
        title="El cliente"
        subtitle="¿Quién sufre este problema? ¿Con qué frecuencia?"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Descripción del afectado principal</label>
            <input
              value={data.customer}
              onChange={e => setData(p => ({ ...p, customer: e.target.value }))}
              placeholder="Ej: Agricultor de café en comunidades rurales de Perú/Colombia/Bolivia, sin acceso a internet estable, vende a intermediarios 2-4 veces por año."
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Frecuencia del problema</label>
              <select
                value={data.problemFrequency}
                onChange={e => setData(p => ({ ...p, problemFrequency: e.target.value as Data['problemFrequency'] }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Soluciones actuales que usa (aunque sean malas)</label>
              <input
                value={data.currentSolutions}
                onChange={e => setData(p => ({ ...p, currentSolutions: e.target.value }))}
                placeholder="¿Cómo resuelve hoy el problema?"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </ToolSection>

      {/* Section 3: Hypothesis */}
      <ToolSection
        number={3}
        title="Hipótesis de solución"
        subtitle="¿Qué harías diferente? ¿Por qué tú?"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>¿Qué harías diferente? (1-2 oraciones)</label>
            <textarea
              value={data.hypothesis}
              onChange={e => setData(p => ({ ...p, hypothesis: e.target.value }))}
              placeholder="Una app offline-first que proporciona precios de mercado en tiempo real via SMS y permite a los agricultores comparar antes de negociar, sin necesitar internet."
              style={{ ...textareaStyle, minHeight: 70 }}
            />
          </div>
          <div>
            <label style={labelStyle}>¿Por qué tú? ¿Qué ventaja tienes para resolver esto?</label>
            <textarea
              value={data.whyUs}
              onChange={e => setData(p => ({ ...p, whyUs: e.target.value }))}
              placeholder="Conocimiento del territorio (crecí en comunidad agrícola), red de contacto con 3 cooperativas en Ucayali, experiencia técnica en apps de bajo ancho de banda."
              style={{ ...textareaStyle, minHeight: 70 }}
            />
          </div>
        </div>
      </ToolSection>

      {/* Section 4: Riskiest assumption */}
      <ToolSection
        number={4}
        title="Supuesto más riesgoso"
        subtitle="La cosa más crítica que debes confirmar antes de seguir"
        insight="Lean Startup (Ries): identifica el supuesto que, si resultase falso, hundiría toda la hipótesis. Ese es el que debes testar primero en Pre-incubación."
        insightSource="Lean Startup — Eric Ries"
        defaultOpen={true}
        accentColor={ACCENT}
      >
        <textarea
          value={data.riskiestAssumption}
          onChange={e => setData(p => ({ ...p, riskiestAssumption: e.target.value }))}
          placeholder="Ej: Que los agricultores están dispuestos a pagar $3/mes por acceso a precios de mercado en tiempo real, y que tienen el modelo mental para usar una app de consulta antes de negociar."
          style={{ ...textareaStyle, minHeight: 90 }}
        />
      </ToolSection>

      <ToolActionBar
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        onComplete={handleComplete}
        onReport={handleReport}
        saved={saved || unlocking}
        accentColor={ACCENT}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tools/InitialIdea.tsx
git commit -m "feat(ideacion): 00.5 InitialIdea component + auto-unlock Pre-incubacion"
```

---

## Task 7: Register New Components in ToolPage.tsx

**Files:**
- Modify: `src/components/tools/ToolPage.tsx`

- [ ] **Step 1: Add 5 new entries to TOOL_COMPONENTS**

In `src/components/tools/ToolPage.tsx`, find the `TOOL_COMPONENTS` const and add 5 new entries **at the top**:

```ts
const TOOL_COMPONENTS: Record<string, React.ComponentType<ToolComponentProps>> = {
  'problem-exploration': dynamic(() => import('./ProblemExploration')),
  'problem-selection': dynamic(() => import('./ProblemSelection')),
  'empathy-map': dynamic(() => import('./EmpathyMap')),
  'interview-guide': dynamic(() => import('./InterviewGuide')),
  'initial-idea': dynamic(() => import('./InitialIdea')),
  // ... existing entries unchanged
  'passion-purpose': dynamic(() => import('./PassionPurpose')),
  // ...
}
```

- [ ] **Step 2: Verify TypeScript and test routing**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Then open http://localhost:3000/tools/problem-exploration in the browser (while logged in as founder@demo.startups4climate.org).

Expected: The tool renders with the green Ideación theme, ToolProgress bar, and all sections.

- [ ] **Step 3: Test save/load cycle**

1. Fill in some data in the tool
2. Refresh the page
3. Verify data persisted (loaded from Supabase)

- [ ] **Step 4: Commit**

```bash
git add src/components/tools/ToolPage.tsx
git commit -m "feat(ideacion): register 5 new Ideacion tool components in ToolPage"
```

---

## Task 8: Onboarding Stage Selector

**Files:**
- Modify: `src/app/tools/completar-perfil/page.tsx`

- [ ] **Step 1: Read current completar-perfil page structure**

```bash
wc -l src/app/tools/completar-perfil/page.tsx
```

Read the file to understand the current step structure. The page likely has multi-step form logic.

- [ ] **Step 2: Add stage selection as the first question**

Find where the form steps/sections start. Add a stage selector step at the **beginning**. The key logic is:

After the founder selects their stage, save it to Supabase immediately (don't wait for the rest of the form to complete):

```ts
// Add this function to the component
async function saveStage(stageValue: AppUser['stage']) {
  if (!user?.id) return
  const { error } = await supabase
    .from('profiles')
    .update({ stage: stageValue })
    .eq('id', user.id)
  if (error) {
    console.error('[S4C Sync] Error saving stage:', error)
  }
}
```

Add a stage selector UI step. Insert before the first existing form step:

```tsx
{/* Stage selection step */}
{currentStep === 0 && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
    <div style={{
      fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700,
      color: 'var(--color-text-primary)', marginBottom: '0.25rem',
    }}>
      ¿En qué etapa está tu startup?
    </div>
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: '0.875rem',
      color: 'var(--color-text-secondary)', marginBottom: '0.75rem',
    }}>
      Esto personaliza las herramientas que verás primero. Puedes cambiarlo después.
    </div>
    {[
      { value: 'ideacion', label: 'Ideación', desc: 'No tengo problema ni solución clara aún. Quiero descubrirlos.', color: '#16A34A' },
      { value: 'pre-incubacion', label: 'Pre-incubación', desc: 'Tengo un problema identificado. Estoy validando el mercado.', color: '#DA4E24' },
      { value: 'incubacion', label: 'Incubación', desc: 'Tengo clientes potenciales y estoy construyendo el producto.', color: '#1F77F6' },
      { value: 'aceleracion', label: 'Aceleración', desc: 'Tengo un producto y clientes. Estoy escalando el modelo.', color: '#F0721D' },
      { value: 'escalamiento', label: 'Escalamiento', desc: 'Tengo tracción probada y busco capital o expansión.', color: '#5BB4FF' },
      { value: null, label: 'No lo sé aún', desc: 'Te recomendamos empezar por Ideación.', color: '#9CA3AF' },
    ].map(option => (
      <button
        key={option.value ?? 'unknown'}
        onClick={async () => {
          const stageToSave = (option.value ?? 'ideacion') as AppUser['stage']
          await saveStage(stageToSave)
          // Update local appUser state so layout reflects immediately
          // (AuthContext will refresh on next render)
          setCurrentStep(1) // advance to next step
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0.875rem 1.125rem', borderRadius: 12, width: '100%',
          border: '1.5px solid var(--color-border)',
          background: 'var(--color-bg-card)', cursor: 'pointer',
          textAlign: 'left', transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = option.color
          e.currentTarget.style.background = `${option.color}08`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.background = 'var(--color-bg-card)'
        }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: option.color, flexShrink: 0,
        }} />
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)', fontSize: '0.9375rem',
            fontWeight: 700, color: 'var(--color-text-primary)',
          }}>
            {option.label}
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
          }}>
            {option.desc}
          </div>
        </div>
      </button>
    ))}
  </div>
)}
```

Adjust all existing step index references by +1 (since stage selection is now step 0 and the original first step is now step 1).

- [ ] **Step 3: Verify stage selector saves to DB**

1. Log in as a new test user (or reset `profiles.stage` to NULL for demo founder)
2. Go to `/tools/completar-perfil`
3. Select "Ideación"
4. Verify in Supabase: `SELECT stage FROM profiles WHERE email = 'founder@demo.startups4climate.org'`
5. Expected: `stage = 'ideacion'`
6. Go to `/tools` — verify Pre-incubación sidebar items show locked overlay

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/completar-perfil/page.tsx
git commit -m "feat(ideacion): stage selector in completar-perfil onboarding flow"
```

---

## Task 9: Progressive Unlocking in tools/page.tsx

**Files:**
- Modify: `src/app/tools/page.tsx`

- [ ] **Step 1: Add stage-0 module entry to the tools dashboard view**

In `src/app/tools/page.tsx`, find where stages are rendered (likely a loop over `[1, 2, 3, 4]` or `TOOLS_BY_STAGE`). Update to include stage 0:

The stage 0 module should appear first with its green accent. If `appUser.stage === 'ideacion'`, show a call-to-action banner above the tool grid:

```tsx
{appUser?.stage === 'ideacion' && (
  <div style={{
    padding: '1.25rem 1.5rem', borderRadius: 14, marginBottom: '1.5rem',
    background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)',
    display: 'flex', alignItems: 'center', gap: '1rem',
  }}>
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700,
        color: '#16A34A', marginBottom: '0.25rem',
      }}>
        Comienza con el Módulo 00 — Ideación
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '0.875rem',
        color: 'var(--color-text-secondary)',
      }}>
        Antes de Pre-incubación, descubre y valida el problema que quieres resolver.
        Son 5 herramientas, ~2.5 horas en total.
      </div>
    </div>
    <Link
      href="/tools/problem-exploration"
      style={{
        padding: '0.75rem 1.25rem', borderRadius: 10, textDecoration: 'none',
        background: '#16A34A', color: '#fff',
        fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
        flexShrink: 0,
      }}
    >
      Empezar Ideación
    </Link>
  </div>
)}
```

- [ ] **Step 2: Show stage 0 tools in the tool grid**

Find the section that builds the tool grid. Update the stage loop to start from 0:

```ts
// Find something like:
const displayStages = ([1, 2, 3, 4] as const)

// Update to:
const displayStages = ([0, 1, 2, 3, 4] as const)
```

- [ ] **Step 3: Lock non-ideacion tools in grid when founder is in ideacion stage**

Find `ToolCard` component (or equivalent). When `appUser.stage === 'ideacion'` and `tool.stage > 0`, pass `locked={true}`:

```tsx
locked={appUser?.stage === 'ideacion' && tool.stage > 0}
```

Verify `ToolCard` already has a `locked` prop that renders a lock icon. If not, add it — find the `locked` prop in ToolCard (it's already in `tools/page.tsx` from the existing code at line ~80: `locked: boolean` param). The lock icon and visual treatment is already implemented.

- [ ] **Step 4: Auto-reload AppUser after InitialIdea unlocks**

When `InitialIdea.tsx` completes and updates `profiles.stage` to `pre-incubacion`, the AuthContext needs to refresh. In `AuthContext.tsx`, add a `refreshUser` function if it doesn't exist:

```ts
// In AuthContext value, add:
refreshUser: async () => {
  if (!user) return
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, org_id, startup_name, stage')
    .eq('id', user.id)
    .single()
  if (profile) {
    setAppUser({ ...profile, stage: profile.stage as AppUser['stage'] ?? null })
  }
}
```

Then in `InitialIdea.tsx`, call `refreshUser()` after updating the stage:

```ts
// In handleComplete, after supabase update:
const { refreshUser } = useAuth()
// ...
await supabase.from('profiles').update({ stage: 'pre-incubacion' }).eq('id', userId)
await refreshUser()
```

- [ ] **Step 5: End-to-end test**

1. Set `profiles.stage = 'ideacion'` for the demo founder in Supabase
2. Log in as demo founder
3. Verify: `/tools` shows Module 00 banner + Pre-incubation tools locked
4. Complete all 5 Ideación tools (or just mark them as completed)
5. On completing `initial-idea`, verify:
   - `profiles.stage` updates to `'pre-incubacion'` in DB
   - Page refreshes and Pre-incubación tools unlock
   - Module 00 banner disappears

- [ ] **Step 6: Commit**

```bash
git add src/app/tools/page.tsx src/context/AuthContext.tsx
git commit -m "feat(ideacion): progressive unlock — stage 0 banner + lock/unlock logic"
```

---

## Task 10: Final integration — TypeScript check + build

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors. Fix any remaining type errors before proceeding.

- [ ] **Step 2: Build verification**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completes successfully. If there are errors, fix them.

- [ ] **Step 3: Final commit + push**

```bash
git add -A
git commit -m "feat(ideacion): Módulo 00 — 5 tools, progressive unlock, onboarding stage selector"
git push
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `/tools/problem-exploration` renders with green theme
- [ ] `/tools/problem-selection` renders with ICE matrix scoring
- [ ] `/tools/empathy-map` renders with 4-quadrant layout
- [ ] `/tools/interview-guide` renders with question designer + interview log
- [ ] `/tools/initial-idea` renders with structured hypothesis template
- [ ] All 5 tools save/load data correctly (Supabase + localStorage fallback)
- [ ] Founder with `stage = 'ideacion'` sees locked Pre-incubación sidebar
- [ ] Completing `initial-idea` updates `profiles.stage` to `'pre-incubacion'`
- [ ] After unlock, Pre-incubación tools become accessible
- [ ] Stage selector appears in completar-perfil flow
- [ ] StartupLifecycle on landing shows Module 00 with green accent
- [ ] `npm run build` passes with 0 errors
