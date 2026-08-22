import { describe, expect, it } from 'vitest'
import { demoPlan, demoRace } from './demoData'
import type { TrainingPlan } from './types'
import {
  applyRaceDraft,
  draftFromRace,
  emptyRaceDraft,
  raceDeletionEffect,
  validateRaceDraft,
} from './raceEdit'

const TODAY = '2026-08-22'

describe('validateRaceDraft', () => {
  it('exige un nom : c’est lui qui nomme la course partout', () => {
    expect(validateRaceDraft(emptyRaceDraft(TODAY)).name).toBeDefined()
  })

  it('accepte une heure de départ vide, refuse une heure mal écrite', () => {
    const base = { ...emptyRaceDraft(TODAY), name: 'Vichy' }
    expect(validateRaceDraft(base).startTime).toBeUndefined()
    expect(validateRaceDraft({ ...base, startTime: '7h20' }).startTime).toMatch(/hh:mm/)
    expect(validateRaceDraft({ ...base, startTime: '07:20' }).startTime).toBeUndefined()
  })

  it('borne les jours faciles avant une prépa', () => {
    const base = { ...emptyRaceDraft(TODAY), name: 'Vichy', role: 'preparation' as const }
    expect(validateRaceDraft({ ...base, easyDaysBefore: '20' }).easyDaysBefore).toBeDefined()
    expect(validateRaceDraft({ ...base, easyDaysBefore: '3' }).easyDaysBefore).toBeUndefined()
  })
})

describe('applyRaceDraft', () => {
  it('prend les distances du format, jamais une saisie', () => {
    const race = applyRaceDraft(
      { ...emptyRaceDraft(TODAY), name: 'Sprint local', format: 'Sprint' },
      undefined,
      'race-1',
    )
    expect(race.distances).toEqual({ swimM: 750, bikeKm: 20, runKm: 5 })
  })

  it('garde l’identifiant d’une course modifiée : les plans qui la visent le référencent', () => {
    const race = applyRaceDraft({ ...draftFromRace(demoRace), name: 'Vichy 2027' }, demoRace, 'race-neuf')
    expect(race.id).toBe(demoRace.id)
    expect(race.name).toBe('Vichy 2027')
  })

  it('oublie les champs de prépa quand la course redevient un objectif', () => {
    const prep = applyRaceDraft(
      { ...emptyRaceDraft(TODAY), name: 'Test', role: 'preparation', purpose: 'test d’allure', easyDaysBefore: '3' },
      undefined,
      'race-1',
    )
    expect(prep.purpose).toBe('test d’allure')

    const goal = applyRaceDraft({ ...draftFromRace(prep), role: 'primary_goal' }, prep, 'race-1')
    expect(goal.purpose).toBeUndefined()
    expect(goal.easyDaysBefore).toBeUndefined()
  })
})

describe('raceDeletionEffect', () => {
  it('dit ce que la fiche emporte', () => {
    expect(raceDeletionEffect(demoRace, [])[0]).toMatch(/pacing, sa nutrition et sa checklist/)
  })

  it('avertit que le plan en cours perd sa cible — sans le supprimer', () => {
    const plan: TrainingPlan = { ...demoPlan, raceId: demoRace.id, status: 'active' }
    const lines = raceDeletionEffect(demoRace, [plan])
    expect(lines.join(' ')).toMatch(/il reste en place/)
  })

  it('distingue un plan archivé, qui ne perd que le nom', () => {
    const plan: TrainingPlan = { ...demoPlan, raceId: demoRace.id, status: 'archived_completed' }
    expect(raceDeletionEffect(demoRace, [plan]).join(' ')).toMatch(/plan archivé/)
  })
})
