import { describe, expect, it } from 'vitest'
import type { PlanPhaseName } from '../types'
import { PHASE_ORDER, allocatePhaseWeeks, buildPhases, phaseNameByWeek, taperWeeksFor } from './phases'

function total(weeksCount: number): number {
  return allocatePhaseWeeks(weeksCount).reduce((sum, phase) => sum + phase.weeksCount, 0)
}

describe('taperWeeksFor', () => {
  it('affûte sur 2 semaines dès que le plan en a assez', () => {
    expect(taperWeeksFor(6)).toBe(2)
    expect(taperWeeksFor(16)).toBe(2)
    expect(taperWeeksFor(24)).toBe(2)
  })

  it('rabat à 1 semaine sur un plan court, jamais à 0', () => {
    expect(taperWeeksFor(5)).toBe(1)
    expect(taperWeeksFor(4)).toBe(1)
    expect(taperWeeksFor(1)).toBe(1)
  })
})

describe('allocatePhaseWeeks', () => {
  it('rend les 4 phases dans l’ordre du canevas', () => {
    expect(allocatePhaseWeeks(16).map((phase) => phase.name)).toEqual([...PHASE_ORDER])
  })

  it('somme exactement au nombre de semaines du plan', () => {
    for (let weeks = 1; weeks <= 60; weeks += 1) {
      expect(total(weeks)).toBe(weeks)
    }
  })

  it('donne au moins une semaine à chaque phase produite', () => {
    for (let weeks = 1; weeks <= 60; weeks += 1) {
      for (const phase of allocatePhaseWeeks(weeks)) {
        expect(phase.weeksCount).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('répartit ~40/40/20 hors affûtage sur un 70.3 de 16 semaines', () => {
    expect(allocatePhaseWeeks(16)).toEqual([
      { name: 'Base', weeksCount: 6 },
      { name: 'Build', weeksCount: 5 },
      { name: 'Specific', weeksCount: 3 },
      { name: 'Taper', weeksCount: 2 },
    ])
  })

  it('garde les phases les plus spécifiques quand il y a moins de 4 semaines', () => {
    expect(allocatePhaseWeeks(3).map((phase) => phase.name)).toEqual(['Build', 'Specific', 'Taper'])
    expect(allocatePhaseWeeks(2).map((phase) => phase.name)).toEqual(['Specific', 'Taper'])
    expect(allocatePhaseWeeks(1).map((phase) => phase.name)).toEqual(['Taper'])
  })

  it('rend une liste vide pour un plan sans semaine', () => {
    expect(allocatePhaseWeeks(0)).toEqual([])
  })
})

describe('phaseNameByWeek', () => {
  it('donne une phase par semaine, dans l’ordre', () => {
    const names = phaseNameByWeek(16)
    expect(names).toHaveLength(16)
    expect(names[0]).toBe('Base')
    expect(names[15]).toBe('Taper')
    expect(names[14]).toBe('Taper')
    expect(names[13]).toBe('Specific')
  })

  it('ne recule jamais dans l’ordre des phases', () => {
    const rank = (name: PlanPhaseName) => PHASE_ORDER.indexOf(name)
    const names = phaseNameByWeek(24)
    for (let index = 1; index < names.length; index += 1) {
      expect(rank(names[index])).toBeGreaterThanOrEqual(rank(names[index - 1]))
    }
  })
})

describe('buildPhases', () => {
  it('marque done / active / upcoming autour de la semaine courante', () => {
    const phases = buildPhases(16, 8)
    // Base = semaines 1-6, Build = 7-11, Specific = 12-14, Taper = 15-16.
    expect(phases.map((phase) => phase.status)).toEqual(['done', 'active', 'upcoming', 'upcoming'])
  })

  it('met la première phase en cours quand le plan démarre', () => {
    expect(buildPhases(16, 1).map((phase) => phase.status)).toEqual([
      'active',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('laisse tout à venir quand la semaine courante précède le plan', () => {
    expect(buildPhases(16, 0).every((phase) => phase.status === 'upcoming')).toBe(true)
  })

  it('marque tout comme fait quand la semaine courante dépasse le plan', () => {
    expect(buildPhases(16, 17).every((phase) => phase.status === 'done')).toBe(true)
  })

  it('porte une description en français sur chaque phase', () => {
    for (const phase of buildPhases(16, 1)) {
      expect(phase.description).toBeTruthy()
    }
  })
})
