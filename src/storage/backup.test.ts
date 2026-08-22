import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteDatabase } from './db'
import * as repo from './repository'
import { exportBackup, importBackup } from './backup'
import { CURRENT_SCHEMA_VERSION } from '../domain/types'
import type { BackupFile } from '../domain/types'

function validBackup(): BackupFile {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: {
      id: 'singleton',
      weightKg: 72.5,
      sweatRateLPerH: 1.1,
      maxHeartRateBpm: 186,
      css: { paceMinPer100m: '1:32', measuredAt: '2026-08-03' },
      ftp: { watts: 248, measuredAt: '2026-07-20' },
      runThreshold: { paceMinPerKm: '4:12', measuredAt: '2026-06-15' },
      language: 'fr',
      theme: 'light',
    },
    plans: [
      {
        id: 'plan-1',
        format: '70.3',
        startDate: '2026-05-04',
        endDate: '2026-08-30',
        weeksCount: 18,
        status: 'active',
        settings: {
          weeklyVolumeTargetMin: 450,
          availableDays: [true, true, true, true, false, true, true],
          maxSessionsPerDiscipline: { N: 2, V: 3, C: 3 },
        },
        constraints: { pool: true, blockedWeeks: [] },
        referencesSnapshot: { cssPaceMinPer100m: '1:32', ftpWatts: 248 },
        phases: [{ name: 'Base', weeksCount: 4, status: 'done' }],
        intensityDistribution: { z1z2Percent: 78, z3Percent: 8, z4PlusPercent: 14 },
        weeks: [],
      },
    ],
    workoutsDone: [
      {
        id: 'w-1',
        title: 'Pyramide CSS',
        discipline: 'N',
        zone: 'Z4',
        durationMin: 55,
        blocks: [],
        status: 'completed',
        completedAt: '2026-08-10',
      },
    ],
    races: [
      {
        id: 'r-1',
        name: '70.3 Vichy',
        date: '2026-08-30',
        format: '70.3',
        role: 'primary_goal',
        distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
      },
    ],
    journal: [
      {
        id: 'j-1',
        planId: 'plan-1',
        at: '2026-08-10T10:00:00.000Z',
        author: 'user',
        description: 'Seance marquee faite',
        undone: false,
      },
    ],
  }
}

beforeEach(async () => {
  await deleteDatabase()
})

afterEach(async () => {
  await deleteDatabase()
})

describe('importBackup', () => {
  it('writes every entity when the backup is fully valid', async () => {
    const result = await importBackup(validBackup())
    expect(result.ok).toBe(true)

    expect(await repo.getProfile()).toEqual(validBackup().profile)
    expect(await repo.getAllPlans()).toEqual(validBackup().plans)
    expect(await repo.getAllWorkouts()).toEqual(validBackup().workoutsDone)
    expect(await repo.getAllRaces()).toEqual(validBackup().races)
    expect(await repo.getAllJournalEntries()).toEqual(validBackup().journal)
  })

  it('writes nothing at all when one field among many valid entities is invalid (all-or-nothing)', async () => {
    // Pre-existing data that must survive an untouched, unmodified import attempt.
    const existingProfile = { ...validBackup().profile, weightKg: 60 }
    await repo.putProfile(existingProfile)
    await repo.putRace({ ...validBackup().races[0]!, id: 'existing-race' })

    const invalidBackup = validBackup()
    ;(invalidBackup.profile.ftp as unknown as { watts: unknown }).watts = '248 W'

    const result = await importBackup(invalidBackup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'profile.ftp.watts', receivedValue: '248 W' }),
      )
    }

    // Nothing was written: not the invalid profile, not the otherwise-valid plans/workouts/races/journal.
    expect(await repo.getProfile()).toEqual(existingProfile)
    expect(await repo.getAllPlans()).toEqual([])
    expect(await repo.getAllWorkouts()).toEqual([])
    expect(await repo.getAllRaces()).toEqual([{ ...validBackup().races[0]!, id: 'existing-race' }])
    expect(await repo.getAllJournalEntries()).toEqual([])
  })

  it('rejects an incompatible schema version and writes nothing', async () => {
    const backup = validBackup()
    ;(backup as unknown as { schemaVersion: number }).schemaVersion = 1.1

    const result = await importBackup(backup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'schemaVersion', receivedValue: 1.1 }),
      )
    }
    expect(await repo.getProfile()).toBeUndefined()
    expect(await repo.getAllPlans()).toEqual([])
  })

  it('rejects a completely malformed payload without throwing', async () => {
    const result = await importBackup({ garbage: true })
    expect(result.ok).toBe(false)
    expect(await repo.getProfile()).toBeUndefined()
  })
})

describe('exportBackup', () => {
  it('serializes the current state into a BackupFile', async () => {
    const importResult = await importBackup(validBackup())
    expect(importResult.ok).toBe(true)

    const exported = await exportBackup()
    expect(exported).toEqual(validBackup())
  })

  it('refuses to export before onboarding (no profile saved yet) instead of fabricating one', async () => {
    await expect(exportBackup()).rejects.toThrow()
  })
})
