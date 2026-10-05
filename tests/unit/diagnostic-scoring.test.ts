import { describe, it } from 'vitest'

/**
 * The diagnostic scoring logic (questions/score options, `profiles` ranges,
 * `classifyProfile`, `detectInconsistencies`, `ADAPTIVE_RULES`,
 * `mapToolByBottleneck`, `mapToolByRevenueModel`) lives as module-private
 * code inside the client component src/components/DiagnosticForm.tsx, so it
 * cannot be imported from a test without changing application code.
 *
 * Once it is moved to e.g. src/lib/diagnostic-scoring.ts and exported, these
 * cases should be implemented. Current expected values (from the component):
 *   - 6 score questions: madurez, validacion, impacto, financiamiento,
 *     data_room (1-4 each) + equipo (1-3)  → min 6, max 23
 *   - ranges: 6-11 → etapa 1, 12-16 → etapa 2, 17-20 → etapa 3, 21-23 → etapa 4
 *   - totals outside every range fall back to etapa 1
 *
 * Note: docs/diagnostico-cuestionario.md still documents max 24 and ranges
 * 6-11 / 12-18 / 19-21 / 22-24, which disagree with the code.
 */
describe('diagnostic scoring (pending export from DiagnosticForm.tsx)', () => {
  it.todo('all-minimum answers total 6 and classify as ETAPA 1 (Pre-incubación)')
  it.todo('all-maximum answers total 23 and classify as ETAPA 4 (Escalamiento)')
  it.todo('boundaries: 11→1, 12→2, 16→2, 17→3, 20→3, 21→4')
  it.todo('profile ranges are contiguous and cover exactly [min, max] of the question set')
  it.todo('totals below 6 or above 23 fall back to ETAPA 1')
  it.todo('dimension_scores contain the 6 score keys with 0 for unanswered questions')
  it.todo('detectInconsistencies: INC-01 when madurez<=2 and validacion=4')
  it.todo('detectInconsistencies: INC-05 when |madurez - validacion| >= 3')
  it.todo('detectInconsistencies: INC-07 when cuello_botella=operaciones and madurez<=2')
  it.todo('detectInconsistencies: none for a consistent all-3 profile')
  it.todo('ADAPTIVE_RULES trigger only for their question id and conditions')
  it.todo('mapToolByBottleneck returns early-stage tools for etapa<=2 and late-stage otherwise')
  it.todo('mapToolByRevenueModel always returns a tool from HERRAMIENTAS_POR_ETAPA or the documented fallbacks')
})
