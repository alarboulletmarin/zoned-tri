import { describe, expect, it } from 'vitest'
import { validateBackupFile } from './validation'
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

describe('validateBackupFile', () => {
  it('accepts a fully valid backup', () => {
    const result = validateBackupFile(validBackup())
    expect(result).toEqual({ ok: true, data: validBackup() })
  })

  it('rejects a non-object payload', () => {
    const result = validateBackupFile('not an object')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.path).toBe('$')
    }
  })

  it('rejects a schema version mismatch with a dedicated error', () => {
    const backup = validBackup()
    ;(backup as unknown as { schemaVersion: number }).schemaVersion = 1.1
    const result = validateBackupFile(backup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({
          path: 'schemaVersion',
          expectedType: `version ${CURRENT_SCHEMA_VERSION}`,
          receivedValue: 1.1,
        }),
      ])
    }
  })

  it('reports the exact field, received value and expected type on a type error (ftp in watts)', () => {
    const backup = validBackup()
    ;(backup.profile.ftp as unknown as { watts: unknown }).watts = '248 W'
    const result = validateBackupFile(backup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'profile.ftp.watts',
          expectedType: 'number (watts)',
          receivedValue: '248 W',
        }),
      )
    }
  })

  it('collects multiple errors across different entities in a single pass', () => {
    const backup = validBackup()
    ;(backup.profile as unknown as { weightKg: unknown }).weightKg = 'lourd'
    ;(backup.races[0] as unknown as { date: unknown }).date = 12345
    const result = validateBackupFile(backup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path)
      expect(paths).toContain('profile.weightKg')
      expect(paths).toContain('races[0].date')
    }
  })

  it('rejects an invalid discipline code on a workout', () => {
    const backup = validBackup()
    ;(backup.workoutsDone[0] as unknown as { discipline: unknown }).discipline = 'X'
    const result = validateBackupFile(backup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'workoutsDone[0].discipline', receivedValue: 'X' }),
      )
    }
  })

  it('rejects a missing required field', () => {
    const backup = validBackup()
    const profile = backup.profile as unknown as Record<string, unknown>
    delete profile.maxHeartRateBpm
    const result = validateBackupFile(backup)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'profile.maxHeartRateBpm' }),
      )
    }
  })
})
