import { describe, expect, it } from 'vitest'
import { demoAthleteProfile, demoPlan, demoWorkouts } from './demoData'
import { SEED_WORKOUTS } from './seedWorkouts'
import type { AthleteProfile, TrainingPlan } from './types'
import {
  NEVER_MEASURED,
  buildToolsReferences,
  findNextReferenceTest,
  formatDecimalFr,
  parsePaceToSeconds,
  vmaFromThresholdPace,
} from './toolsReferences'

const TODAY = '2026-08-21'

describe('formats', () => {
  it('writes decimals with a French comma', () => {
    expect(formatDecimalFr(3.4207)).toBe('3,4')
    expect(formatDecimalFr(72.5)).toBe('72,5')
  })

  it('reads a m:ss pace and refuses anything else', () => {
    expect(parsePaceToSeconds('4:12')).toBe(252)
    expect(parsePaceToSeconds('1:32')).toBe(92)
    expect(parsePaceToSeconds('4.12')).toBeNull()
    expect(parsePaceToSeconds('')).toBeNull()
  })
})

describe('vmaFromThresholdPace', () => {
  // Artboard 12 : allure seuil 4:12 /km → « VMA 17,2 ».
  it('reproduces the VMA of artboard 12 from the stored threshold pace', () => {
    expect(vmaFromThresholdPace('4:12')).toBe(17.2)
  })

  it('returns null on an unreadable pace instead of guessing', () => {
    expect(vmaFromThresholdPace('quatre douze')).toBeNull()
  })
})

describe('buildToolsReferences · artboard 12', () => {
  const view = buildToolsReferences(demoAthleteProfile, TODAY)

  it('lists the three threshold references with the artboard values', () => {
    expect(view.lines.map((line) => [line.label, line.value, line.unit])).toEqual([
      ['CSS', '1:32', '/100 m'],
      ['FTP', '248', 'W'],
      ['SEUIL', '4:12', '/km'],
    ])
  })

  it('derives the right column of the artboard: protocol, W/kg, VMA', () => {
    expect(view.lines.map((line) => line.meta)).toEqual(['test 400/200', '3,4 W/kg', 'VMA 17,2'])
  })

  it('hangs note 7 on the FTP, and on it alone', () => {
    expect(view.lines.filter((line) => line.noteNumber !== undefined).map((line) => line.label)).toEqual(['FTP'])
    expect(view.lines[1].noteNumber).toBe(7)
  })

  it('fills the Mesure / Valeur table from the profile', () => {
    expect(view.measures).toEqual([
      { label: 'Poids', value: '72,5 kg' },
      { label: 'Taux de sudation', value: '1,1 L/h' },
      { label: 'FC max mesurée', value: '186 bpm' },
    ])
  })

  it('dates the head line on the most recent measurement', () => {
    expect(view.lastTestLabel).toBe('3 août')
    expect(view.measuredCount).toBe(3)
  })

  it('counts the days since each test (artboard S8)', () => {
    expect(view.lines[0].sinceLabel).toBe('testé le 3 août · il y a 18 j')
  })
})

describe('buildToolsReferences · ce qui manque', () => {
  it('renders an absent reference as a null value, never as an estimate', () => {
    const profile: AthleteProfile = { ...demoAthleteProfile }
    delete profile.ftp
    const view = buildToolsReferences(profile, TODAY)

    expect(view.lines[1].value).toBeNull()
    expect(view.lines[1].meta).toBeNull()
    expect(view.lines[1].sinceLabel).toBe(NEVER_MEASURED)
    expect(view.measuredCount).toBe(2)
  })

  it('treats a heart rate of zero as never measured — nothing is guessed from age', () => {
    const view = buildToolsReferences({ ...demoAthleteProfile, maxHeartRateBpm: 0 }, TODAY)
    expect(view.heartRate.value).toBeNull()
    expect(view.heartRate.sinceLabel).toBe(NEVER_MEASURED)
  })

  it('says nothing at all without a profile', () => {
    const view = buildToolsReferences(undefined, TODAY)
    expect(view.lines).toEqual([])
    expect(view.measures).toEqual([])
    expect(view.lastTestLabel).toBeNull()
  })
})

describe('findNextReferenceTest · artboard S8', () => {
  const ftpTest = SEED_WORKOUTS.find((workout) => workout.id === 'bike-test-ftp-20min')

  function planWithTest(): TrainingPlan {
    return {
      ...demoPlan,
      weeks: [
        {
          ...demoPlan.weeks[0],
          weekNumber: 9,
          days: demoPlan.weeks[0].days.map((day, index) =>
            index === 4 ? { ...day, workoutIds: [ftpTest!.id] } : { ...day, workoutIds: [] },
          ),
        },
      ],
    }
  }

  it('finds the next dated reference test and says when it falls', () => {
    const plan = planWithTest()
    const next = findNextReferenceTest(plan, [ftpTest!], plan.weeks[0].days[0].date)
    expect(next).toEqual({ title: 'Test FTP 20 minutes', weekLabel: 'semaine 09', whenLabel: 'dans 4 jours' })
  })

  it('returns null when the plan carries no reference test', () => {
    expect(findNextReferenceTest(demoPlan, demoWorkouts, '2026-06-15')).toBeNull()
  })

  it('returns null without an active plan', () => {
    expect(findNextReferenceTest(undefined, demoWorkouts, TODAY)).toBeNull()
  })
})
