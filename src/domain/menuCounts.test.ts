import { describe, expect, it } from 'vitest'
import { buildMenuCounts } from './menuCounts'
import { demoPlan, demoRace } from './demoData'
import { alignWeekToWeekOf, todayIso } from './planWeek'
import { SEED_WORKOUTS } from './seedWorkouts'
import type { TrainingPlan } from './types'

const today = todayIso()

describe('buildMenuCounts', () => {
  it('numbers the current week of the active plan on two digits (« sem. 07 »)', () => {
    const plan: TrainingPlan = {
      ...demoPlan,
      weeks: demoPlan.weeks.map((week) => alignWeekToWeekOf(week, today)),
    }
    const counts = buildMenuCounts({ plans: [plan], races: [], today })
    expect(counts['/plan']).toBe(`sem. ${String(plan.weeks[0].weekNumber).padStart(2, '0')}`)
  })

  it('says « aucun plan » when no plan is active', () => {
    const counts = buildMenuCounts({
      plans: [{ ...demoPlan, status: 'archived_completed' }],
      races: [],
      today,
    })
    expect(counts['/plan']).toBe('aucun plan')
  })

  it('counts the races stored on the device', () => {
    const counts = buildMenuCounts({ plans: [], races: [demoRace], today })
    expect(counts['/races']).toBe('1')
  })

  it('counts Séances like the library screen does — the catalogue it opens', () => {
    const counts = buildMenuCounts({ plans: [], races: [], today })
    expect(counts['/workouts']).toBe(String(SEED_WORKOUTS.length))
  })

  it('keeps the canvas placeholder for Outils, whose screen does not exist yet', () => {
    const counts = buildMenuCounts({ plans: [], races: [], today })
    expect(counts['/tools']).toBe('12')
  })
})
