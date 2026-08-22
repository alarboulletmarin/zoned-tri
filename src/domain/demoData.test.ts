import { describe, expect, it } from 'vitest'
import { validateBackupFile } from '../storage/validation'
import { CURRENT_SCHEMA_VERSION } from './types'
import {
  demoAthleteProfile,
  demoJournalEntries,
  demoPlan,
  demoRace,
  demoWorkouts,
} from './demoData'

describe('demo data', () => {
  it('has at least one workout per discipline, including one marked as a brick', () => {
    const disciplines = new Set(demoWorkouts.map((w) => w.discipline))
    expect(disciplines).toEqual(new Set(['N', 'V', 'C', 'R']))
    expect(demoWorkouts.some((w) => w.isBrick === true)).toBe(true)
  })

  it('forms a fully valid BackupFile', () => {
    const result = validateBackupFile({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      profile: demoAthleteProfile,
      plans: [demoPlan],
      workoutsDone: demoWorkouts,
      races: [demoRace],
      journal: demoJournalEntries,
    })
    expect(result.ok).toBe(true)
  })
})
