import { describe, expect, it } from 'vitest'
import type { Workout } from './types'
import { findTextMatch, searchWorkouts } from './searchWorkouts'

const workouts: Workout[] = [
  { id: 'v1', title: "3 × 12′ au seuil", discipline: 'V', zone: 'Z4', durationMin: 65, blocks: [], status: 'planned' },
  { id: 'v2', title: 'Sur-seuil 6 × 4′', discipline: 'V', zone: 'Z5', durationMin: 58, blocks: [], status: 'planned' },
  { id: 'c1', title: '6 × 1 000 m au seuil', discipline: 'C', zone: 'Z4', durationMin: 52, blocks: [], status: 'planned' },
  { id: 'n1', title: 'Éducatifs et technique', discipline: 'N', zone: 'Z2', durationMin: 26, blocks: [], status: 'planned' },
]

describe('searchWorkouts', () => {
  it('returns an empty array for a blank query', () => {
    expect(searchWorkouts(workouts, '   ')).toEqual([])
  })

  it('matches titles case-insensitively', () => {
    const matches = searchWorkouts(workouts, 'SEUIL')
    expect(matches.map((m) => m.workout.id)).toEqual(['v1', 'v2', 'c1'])
  })

  it('reports the match position for highlighting', () => {
    const [match] = searchWorkouts(workouts, 'seuil')
    expect(workouts[0].title.slice(match.matchStart, match.matchEnd)).toBe('seuil')
  })

  it('returns no result when nothing matches', () => {
    expect(searchWorkouts(workouts, 'triathlon')).toEqual([])
  })
})

/**
 * L'artboard 25 groupe ses résultats par nature — séances, calculateurs, plan. Une seule mécanique
 * de correspondance les sert tous : sans elle, chaque groupe aurait sa propre définition de
 * « ça correspond », et le compte total ne voudrait plus rien dire.
 */
describe('findTextMatch', () => {
  it('reports the position of the term, whatever the case', () => {
    expect(findTextMatch('FTP → zones de puissance', 'zones')).toEqual({ start: 6, end: 11 })
  })

  it('returns null for a blank query — a blank search matches nothing, not everything', () => {
    expect(findTextMatch('Test 20 min', '   ')).toBeNull()
  })

  it('returns null when the term is absent', () => {
    expect(findTextMatch('Test 20 min', 'seuil')).toBeNull()
  })
})

/**
 * Personne ne tape ses accents dans un champ de recherche — et le produit est entièrement en
 * français. « seuil velo » ne trouvait rien alors que « Seuil vélo » est le titre le plus courant
 * du catalogue : la recherche était inutilisable sans clavier accentué et sans réflexe d'accent.
 */
describe('findTextMatch · accents', () => {
  it('trouve un titre accentué depuis un terme sans accent', () => {
    expect(findTextMatch('Seuil vélo 2×20', 'velo')).toEqual({ start: 6, end: 10 })
  })

  it('trouve un titre sans accent depuis un terme accenté', () => {
    expect(findTextMatch('Sortie longue velo', 'vélo')).toEqual({ start: 14, end: 18 })
  })

  it('surligne le texte ORIGINAL, accents compris, et pas sa version dépliée', () => {
    const title = 'Récupération légère'
    const match = findTextMatch(title, 'recuperation')
    expect(match).not.toBeNull()
    expect(title.slice(match!.start, match!.end)).toBe('Récupération')
  })

  it('garde les bornes justes quand la correspondance suit plusieurs accents', () => {
    const title = 'Été · préparation spécifique'
    const match = findTextMatch(title, 'specifique')
    expect(title.slice(match!.start, match!.end)).toBe('spécifique')
  })

  it('borne correctement une correspondance qui va jusqu’au dernier caractère', () => {
    const title = 'Nage en eau libre'
    expect(findTextMatch(title, 'libre')).toEqual({ start: 12, end: 17 })
  })
})
