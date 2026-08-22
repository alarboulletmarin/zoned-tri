import { describe, expect, it } from 'vitest'
import {
  CATALOGUE_COUNT,
  CATALOGUE_TOTAL_MIN,
  SEED_WORKOUTS,
  catalogueDisciplineShares,
} from './seedWorkouts'

/**
 * L'ouverture annonçait « la répartition des 32 séances » sous quatre pourcentages tapés à la main
 * — N 27 / V 31 / C 28 / R 14. Le catalogue n'a jamais eu cette forme, ni en nombre ni en temps.
 * Ces assertions gardent la propriété qui manquait : la frise LIT le catalogue.
 */
describe('catalogue de démonstration', () => {
  it('se compte lui-même', () => {
    expect(CATALOGUE_COUNT).toBe(SEED_WORKOUTS.length)
    expect(CATALOGUE_TOTAL_MIN).toBe(SEED_WORKOUTS.reduce((sum, w) => sum + w.durationMin, 0))
  })

  it('répartit à l’échelle du temps, jamais du nombre de séances', () => {
    const shares = catalogueDisciplineShares()
    const parMinutes = Object.fromEntries(shares.map((s) => [s.discipline, s.totalMin]))

    for (const [discipline, minutes] of Object.entries(parMinutes)) {
      const attendu = SEED_WORKOUTS.filter((w) => w.discipline === discipline).reduce(
        (sum, w) => sum + w.durationMin,
        0,
      )
      expect(minutes).toBe(attendu)
    }
  })

  it('rend cent pour cent, sans discipline vide', () => {
    const shares = catalogueDisciplineShares()
    expect(shares.length).toBeGreaterThan(0)
    expect(shares.every((s) => s.totalMin > 0)).toBe(true)
    expect(Math.round(shares.reduce((sum, s) => sum + s.percent, 0))).toBe(100)
  })

  /** Les quatre valeurs écrites à la main, pour qu'aucune ne revienne par mégarde. */
  it('ne retombe sur aucun des quatre pourcentages inventés', () => {
    const arrondis = catalogueDisciplineShares().map((s) => Math.round(s.percent))
    expect(arrondis).not.toEqual([27, 31, 28, 14])
  })
})
