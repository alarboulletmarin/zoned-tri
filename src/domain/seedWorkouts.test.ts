import { describe, expect, it } from 'vitest'
import { validateBackupFile } from '../storage/validation'
import { demoAthleteProfile, demoJournalEntries, demoPlan, demoRace } from './demoData'
import { SEED_WORKOUTS } from './seedWorkouts'
import { CURRENT_SCHEMA_VERSION } from './types'

describe('seed workouts', () => {
  it('has a stable, unique id per workout', () => {
    const ids = SEED_WORKOUTS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('forms a fully valid BackupFile (basic shape validation)', () => {
    const result = validateBackupFile({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      profile: demoAthleteProfile,
      plans: [demoPlan],
      workoutsDone: SEED_WORKOUTS,
      races: [demoRace],
      journal: demoJournalEntries,
    })
    expect(result.ok).toBe(true)
  })

  it('covers a realistic ~30-workout set, all planned', () => {
    expect(SEED_WORKOUTS.length).toBeGreaterThanOrEqual(28)
    expect(SEED_WORKOUTS.length).toBeLessThanOrEqual(32)
    expect(SEED_WORKOUTS.every((w) => w.status === 'planned')).toBe(true)
  })

  it('covers every discipline with at least one workout', () => {
    const byDiscipline = new Map<string, number>()
    for (const w of SEED_WORKOUTS) {
      byDiscipline.set(w.discipline, (byDiscipline.get(w.discipline) ?? 0) + 1)
    }
    expect(byDiscipline.get('N') ?? 0).toBeGreaterThanOrEqual(1)
    expect(byDiscipline.get('V') ?? 0).toBeGreaterThanOrEqual(1)
    expect(byDiscipline.get('C') ?? 0).toBeGreaterThanOrEqual(1)
    expect(byDiscipline.get('R') ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('has at least two workouts tagged as brick', () => {
    const bricks = SEED_WORKOUTS.filter((w) => w.isBrick === true)
    expect(bricks.length).toBeGreaterThanOrEqual(2)
    // A brick session stays classified under a real discipline (N/V/C), it is not a 5th
    // discipline of its own.
    for (const brick of bricks) {
      expect(['N', 'V', 'C']).toContain(brick.discipline)
    }
  })

  it('every block/repeat has a positive duration and repeats have at least one step', () => {
    function checkBlocks(blocks: (typeof SEED_WORKOUTS)[number]['blocks']) {
      for (const block of blocks) {
        if (block.kind === 'repeat') {
          expect(block.count).toBeGreaterThan(0)
          expect(block.steps.length).toBeGreaterThan(0)
          for (const step of block.steps) {
            expect(step.durationMin).toBeGreaterThan(0)
          }
        } else {
          expect(block.durationMin).toBeGreaterThan(0)
        }
      }
    }
    for (const workout of SEED_WORKOUTS) {
      checkBlocks(workout.blocks)
    }
  })
})
