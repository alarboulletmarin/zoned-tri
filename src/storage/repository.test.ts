import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteDatabase } from './db'
import * as repo from './repository'
import type { AthleteProfile, PlanJournalEntry, Race, TrainingPlan, Workout } from '../domain/types'

function makeProfile(): AthleteProfile {
  return {
    id: 'singleton',
    weightKg: 72.5,
    sweatRateLPerH: 1.1,
    maxHeartRateBpm: 186,
    language: 'fr',
    theme: 'light',
  }
}

function makePlan(id: string): TrainingPlan {
  return {
    id,
    format: '70.3',
    startDate: '2026-05-04',
    endDate: '2026-08-30',
    weeksCount: 18,
    status: 'active',
    settings: {
      weeklyVolumeTargetMin: 450,
      availableDays: [true, true, true, true, false, true, true],
      maxSessionsPerDiscipline: {},
    },
    constraints: { blockedWeeks: [] },
    referencesSnapshot: {},
    phases: [],
    intensityDistribution: { z1z2Percent: 78, z3Percent: 8, z4PlusPercent: 14 },
    weeks: [],
  }
}

function makeWorkout(id: string): Workout {
  return {
    id,
    title: 'Pyramide CSS',
    discipline: 'N',
    zone: 'Z4',
    durationMin: 55,
    blocks: [],
    status: 'completed',
  }
}

function makeRace(id: string): Race {
  return {
    id,
    name: '70.3 Vichy',
    date: '2026-08-30',
    format: '70.3',
    role: 'primary_goal',
    distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
  }
}

function makeJournalEntry(id: string): PlanJournalEntry {
  return {
    id,
    planId: 'plan-1',
    at: '2026-08-10T10:00:00.000Z',
    author: 'user',
    description: 'Seance marquee faite',
    undone: false,
  }
}

beforeEach(async () => {
  await deleteDatabase()
})

afterEach(async () => {
  await deleteDatabase()
})

describe('profile repository', () => {
  it('returns undefined when no profile has been saved', async () => {
    expect(await repo.getProfile()).toBeUndefined()
  })

  it('saves and retrieves the profile singleton', async () => {
    await repo.putProfile(makeProfile())
    expect(await repo.getProfile()).toEqual(makeProfile())
  })

  it('overwrites the profile on a second save', async () => {
    await repo.putProfile(makeProfile())
    await repo.putProfile({ ...makeProfile(), weightKg: 73 })
    expect((await repo.getProfile())?.weightKg).toBe(73)
  })
})

describe('plans repository', () => {
  it('lists all plans, gets one by id, and deletes it', async () => {
    await repo.putPlan(makePlan('plan-1'))
    await repo.putPlan(makePlan('plan-2'))

    expect(await repo.getAllPlans()).toHaveLength(2)
    expect(await repo.getPlan('plan-1')).toEqual(makePlan('plan-1'))

    await repo.deletePlan('plan-1')
    expect(await repo.getAllPlans()).toHaveLength(1)
    expect(await repo.getPlan('plan-1')).toBeUndefined()
  })
})

describe('workouts repository', () => {
  it('lists all workouts, gets one by id, and deletes it', async () => {
    await repo.putWorkout(makeWorkout('w-1'))
    expect(await repo.getAllWorkouts()).toEqual([makeWorkout('w-1')])
    expect(await repo.getWorkout('w-1')).toEqual(makeWorkout('w-1'))
    await repo.deleteWorkout('w-1')
    expect(await repo.getAllWorkouts()).toEqual([])
  })
})

describe('races repository', () => {
  it('lists all races, gets one by id, and deletes it', async () => {
    await repo.putRace(makeRace('r-1'))
    expect(await repo.getAllRaces()).toEqual([makeRace('r-1')])
    expect(await repo.getRace('r-1')).toEqual(makeRace('r-1'))
    await repo.deleteRace('r-1')
    expect(await repo.getAllRaces()).toEqual([])
  })
})

describe('journal repository', () => {
  it('lists all entries and gets one by id (no delete: never physically removed)', async () => {
    await repo.putJournalEntry(makeJournalEntry('j-1'))
    expect(await repo.getAllJournalEntries()).toEqual([makeJournalEntry('j-1')])
    expect(await repo.getJournalEntry('j-1')).toEqual(makeJournalEntry('j-1'))
  })

  it('marks an entry as undone by re-saving it, keeping it in the store', async () => {
    await repo.putJournalEntry(makeJournalEntry('j-1'))
    await repo.putJournalEntry({ ...makeJournalEntry('j-1'), undone: true })
    const entries = await repo.getAllJournalEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.undone).toBe(true)
  })
})
