import { describe, expect, it } from 'vitest'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { addressTerms, nearestWorkouts } from './nearestWorkouts'

describe('addressTerms', () => {
  it('ne garde que les mots de l’adresse de l’artboard 18', () => {
    expect(addressTerms('/seance/8f2c-pyramide-css-v2')).toEqual(['pyramide', 'css'])
  })

  it('écarte les fragments d’identifiant et les nombres', () => {
    expect(addressTerms('/workouts/4b1e-42')).toEqual([])
  })

  it('rend une liste vide sur une adresse sans dernier fragment', () => {
    expect(addressTerms('/')).toEqual([])
  })

  it('lit les accents d’une adresse encodée', () => {
    expect(addressTerms('/seance/s%C3%A9ance-longue')).toEqual(['séance', 'longue'])
  })
})

describe('nearestWorkouts', () => {
  it('classe d’abord la séance qui porte les deux mots de l’adresse', () => {
    const found = nearestWorkouts(SEED_WORKOUTS, '/seance/8f2c-pyramide-css-v2')
    expect(found).toHaveLength(2)
    expect(found[0].title).toBe('Pyramide CSS courte')
  })

  it('ne propose rien quand aucun mot de l’adresse n’est reconnaissable', () => {
    expect(nearestWorkouts(SEED_WORKOUTS, '/workouts/8f2c')).toEqual([])
  })

  it('ne propose rien plutôt que les deux premières venues', () => {
    expect(nearestWorkouts(SEED_WORKOUTS, '/seance/quelquechosedintrouvable')).toEqual([])
  })
})
