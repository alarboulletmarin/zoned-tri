import { describe, expect, it } from 'vitest'
import type { AthleteProfile } from '../types'
import { weekdayIndex } from './dates'
import {
  GENERATOR_STEPS,
  GENERATOR_STEP_COUNT,
  TRAINING_DISCIPLINES,
  VOLUME_MAX_MIN,
  VOLUME_MIN_MIN,
  VOLUME_STEP_MIN,
  availableDayCount,
  createInitialForm,
  defaultRaceDate,
  isDayAvailable,
  type AvailableDays,
} from './form'
import { raceFormat } from './formats'

const TODAY = '2026-08-21' // un vendredi

const profile: AthleteProfile = {
  id: 'athlete-1',
  weightKg: 72,
  sweatRateLPerH: 1.1,
  maxHeartRateBpm: 188,
  css: { paceMinPer100m: '1:32', measuredAt: '2026-08-03' },
  ftp: { watts: 248, measuredAt: '2026-08-03' },
  language: 'fr',
  theme: 'system',
}

describe('étapes du parcours', () => {
  it('décrit les 6 étapes du canevas, dans l’ordre, sans doublon', () => {
    expect(GENERATOR_STEPS).toEqual(['format', 'date', 'availability', 'constraints', 'references', 'summary'])
    expect(GENERATOR_STEP_COUNT).toBe(6)
    expect(new Set(GENERATOR_STEPS).size).toBe(GENERATOR_STEP_COUNT)
  })

  it('ne planifie que les 3 disciplines réelles (« R » n’est pas un choix)', () => {
    expect(TRAINING_DISCIPLINES).toEqual(['N', 'V', 'C'])
  })
})

describe('defaultRaceDate', () => {
  it('propose un dimanche', () => {
    expect(weekdayIndex(defaultRaceDate(TODAY, 16))).toBe(6)
  })

  it('compte les semaines depuis le lundi de la semaine courante', () => {
    // Lundi 17 août + 16 × 7 − 1 jour = dimanche 6 décembre 2026.
    expect(defaultRaceDate(TODAY, 16)).toBe('2026-12-06')
    expect(defaultRaceDate(TODAY, 1)).toBe('2026-08-23')
  })

  it('donne la même date quel que soit le jour de la semaine où on la demande', () => {
    expect(defaultRaceDate('2026-08-17', 11)).toBe(defaultRaceDate('2026-08-23', 11))
  })
})

describe('createInitialForm', () => {
  it('reprend les valeurs de départ du canevas quand elles sont un choix produit', () => {
    const form = createInitialForm(undefined, TODAY)
    expect(form.format).toBe('70.3')
    expect(form.noRace).toBe(false)
    expect(form.weeklyVolumeTargetMin).toBe(450) // 7 h 30
    expect(form.sustainableMaxMin).toBe(540) // maxi tenable : 9 h
    expect(availableDayCount(form.availableDays)).toBe(6)
    expect(form.availableDays[4]).toBe(false) // vendredi laissé libre
    expect(form.maxSessionsPerDiscipline).toEqual({ N: 2, V: 3, C: 3 })
    expect(form.constraints.blockedWeeks).toEqual([])
  })

  it('cale la date par défaut sur le plancher de préparation du format', () => {
    const form = createInitialForm(undefined, TODAY)
    expect(form.raceDate).toBe(defaultRaceDate(TODAY, raceFormat('70.3').minWeeks))
  })

  it('ne devine aucune référence : une référence absente reste absente', () => {
    const form = createInitialForm(undefined, TODAY)
    expect(form.references).toEqual({
      cssPaceMinPer100m: undefined,
      ftpWatts: undefined,
      runThresholdPaceMinPerKm: undefined,
    })
    expect(form.testSessions).toEqual({ N: true, V: true, C: true })
  })

  it('reprend les références du profil et ne propose un test que pour ce qui manque', () => {
    const form = createInitialForm(profile, TODAY)
    expect(form.references.cssPaceMinPer100m).toBe('1:32')
    expect(form.references.ftpWatts).toBe(248)
    expect(form.references.runThresholdPaceMinPerKm).toBeUndefined()
    // Exemple exact du canevas G5 : CSS et FTP connus, seuil « non renseigné » → test sem. 1.
    expect(form.testSessions).toEqual({ N: false, V: false, C: true })
  })

  it('ne partage aucune structure entre deux formulaires initiaux', () => {
    const first = createInitialForm(undefined, TODAY)
    const second = createInitialForm(undefined, TODAY)
    first.availableDays[4] = true
    first.constraints.blockedWeeks.push({ weekNumber: 4, reason: 'déplacement' })
    expect(second.availableDays[4]).toBe(false)
    expect(second.constraints.blockedWeeks).toEqual([])
  })
})

describe('bornes du curseur de volume', () => {
  it('couvre 4 h à 12 h par pas de 15 min, comme le canevas G3', () => {
    expect(VOLUME_MIN_MIN).toBe(240)
    expect(VOLUME_MAX_MIN).toBe(720)
    expect(VOLUME_STEP_MIN).toBe(15)
    expect((VOLUME_MAX_MIN - VOLUME_MIN_MIN) % VOLUME_STEP_MIN).toBe(0)
  })

  it('place la valeur de départ sur un pas du curseur, dans les bornes', () => {
    const { weeklyVolumeTargetMin } = createInitialForm(undefined, TODAY)
    expect(weeklyVolumeTargetMin).toBeGreaterThanOrEqual(VOLUME_MIN_MIN)
    expect(weeklyVolumeTargetMin).toBeLessThanOrEqual(VOLUME_MAX_MIN)
    expect((weeklyVolumeTargetMin - VOLUME_MIN_MIN) % VOLUME_STEP_MIN).toBe(0)
  })
})

describe('jours disponibles', () => {
  const days: AvailableDays = [true, true, true, true, false, true, true]

  it('compte les jours cochés', () => {
    expect(availableDayCount(days)).toBe(6)
    expect(availableDayCount([false, false, false, false, false, false, false])).toBe(0)
  })

  it('lit la disponibilité d’une date par son jour de semaine, index 0 = lundi', () => {
    expect(isDayAvailable(days, '2026-08-17')).toBe(true) // lundi
    expect(isDayAvailable(days, '2026-08-21')).toBe(false) // vendredi
    expect(isDayAvailable(days, '2026-08-22')).toBe(true) // samedi
    expect(isDayAvailable(days, '2026-08-23')).toBe(true) // dimanche
  })

  it('reste vrai d’une semaine à l’autre pour le même jour de semaine', () => {
    expect(isDayAvailable(days, '2026-08-28')).toBe(false) // vendredi suivant
  })
})
