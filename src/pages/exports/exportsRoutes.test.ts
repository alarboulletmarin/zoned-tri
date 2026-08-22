import { describe, expect, it } from 'vitest'
import { EXPORTS_PATH, exportCardPath, exportSheetPath } from './exportsRoutes'

/**
 * Le contexte d'un export vit dans l'URL et nulle part ailleurs : c'est ce qui rend une adresse
 * d'export partageable, mettable en favori, et survivante à un rafraîchissement. Ces trois
 * assertions gardent cette propriété.
 */
describe('exportSheetPath', () => {
  it('sans contexte, vise la feuille nue — la semaine en cours', () => {
    expect(exportSheetPath()).toBe(EXPORTS_PATH)
    expect(exportSheetPath({})).toBe(EXPORTS_PATH)
  })

  it('nomme la semaine regardée, pas celle du calendrier', () => {
    expect(exportSheetPath({ week: 7 })).toBe('/exports?semaine=7')
  })

  it('nomme la séance de la fiche appelante', () => {
    expect(exportSheetPath({ workoutId: 'demo-workout-swim-css-pyramid' })).toBe(
      '/exports?seance=demo-workout-swim-css-pyramid',
    )
  })

  it('porte les deux quand l’appelant connaît les deux', () => {
    expect(exportSheetPath({ week: 3, workoutId: 'a-b' })).toBe('/exports?semaine=3&seance=a-b')
  })

  /** `NaN` arrive vite d'un `Number(...)` sur une valeur absente : il ne doit pas salir l'adresse. */
  it('ignore un rang de semaine qui n’en est pas un', () => {
    expect(exportSheetPath({ week: Number.NaN })).toBe(EXPORTS_PATH)
  })

  it('la carte de séance a son adresse propre, hors de la feuille', () => {
    expect(exportCardPath('run-brick')).toBe('/exports/carte/run-brick')
  })
})
