import { describe, expect, it } from 'vitest'
import { buildSessionCard, sessionCardFileName } from './sessionCard'
import { demoBikeWorkout, demoRestWorkout, demoSwimWorkout } from '../demoData'
import type { Workout } from '../types'

describe('buildSessionCard', () => {
  const card = buildSessionCard(demoSwimWorkout)

  it('porte le jeton de discipline et celui de zone', () => {
    expect(card.discipline).toBe('N')
    expect(card.zone).toBe('Z4')
  })

  it('écrit « Seuil · bassin 25 m » en haut à droite', () => {
    expect(card.contextLabel).toBe('Seuil · bassin 25 m')
  })

  it('donne les trois quantités de l’artboard, dans son ordre', () => {
    expect(card.stats.map((stat) => stat.label)).toEqual(['Distance', 'Durée', 'Corps'])
    expect(card.stats[1].value).toBe('55 min')
    expect(card.stats[2].value).toBe('8 × 150')
  })

  it('saute la colonne « Corps » quand la séance n’a aucune série', () => {
    const noRepeat: Workout = {
      ...demoSwimWorkout,
      blocks: [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 40, zone: 'Z2' }],
    }
    expect(buildSessionCard(noRepeat).stats.map((stat) => stat.label)).toEqual(['Distance', 'Durée'])
  })

  it('saute la distance quand la séance ne la porte pas', () => {
    expect(buildSessionCard(demoBikeWorkout).stats.map((stat) => stat.label)).toEqual([
      'Durée',
      'Corps',
    ])
  })

  it('reprend le profil de l’écran Aujourd’hui, sans le recalculer', () => {
    expect(card.bars.length).toBeGreaterThan(1)
    // Un temps mort reste un filet, jamais une barre pleine.
    expect(card.bars.some((bar) => bar.thin)).toBe(true)
  })

  it('dit la durée du repos au mur', () => {
    expect(card.restLabel).toBe('20 s')
  })

  /**
   * « aucune donnée personnelle » (ligne grise de l'artboard 23) : la carte NOMME la référence
   * et ne la publie pas — sinon elle diffuserait le CSS de celui qui l'a produite.
   */
  it('nomme la référence sans jamais écrire l’allure de l’athlète', () => {
    expect(card.footerLeft).toBe('Allure au CSS · repos 20 s')
    expect(card.footerLeft).not.toContain('1:34')
    expect(JSON.stringify(card)).not.toContain('1:34')
  })

  it('nomme la référence de chaque discipline', () => {
    expect(buildSessionCard(demoBikeWorkout).footerLeft).toContain('Puissance à la FTP')
    expect(
      buildSessionCard({ ...demoSwimWorkout, discipline: 'C' }).footerLeft,
    ).toContain('Allure au seuil')
  })

  it('n’écrit rien à gauche du pied quand il n’y a rien à nommer', () => {
    expect(buildSessionCard(demoRestWorkout).footerLeft).toBe('')
  })

  it('signe la carte', () => {
    expect(card.footerRight).toBe('Zoned Tri')
  })
})

describe('sessionCardFileName', () => {
  it('réduit le titre à un nom de fichier PNG', () => {
    expect(sessionCardFileName(demoSwimWorkout)).toBe('zonedtri-8-150-m-au-css.png')
  })
})
