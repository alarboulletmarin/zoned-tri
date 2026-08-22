import { describe, expect, it } from 'vitest'
import type { Workout, WorkoutBlock } from '../../../domain/types'
import { buildRunBlockRows, runStatBlocks } from './runBlockRows'

const repeatBlocks: WorkoutBlock[] = [
  { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z1' },
  {
    kind: 'repeat',
    count: 3,
    steps: [
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 8, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z1' },
    ],
  },
]

describe('buildRunBlockRows', () => {
  it('collapses a repeat into one row', () => {
    const rows = buildRunBlockRows(repeatBlocks)
    expect(rows).toHaveLength(2)
    // Canevas 29 : les durées de tableau sont en minutes primes.
    expect(rows[1].label).toBe('3 × 8′ · récup 2′')
    expect(rows[1].pace).toBe('—')
  })
})

describe('runStatBlocks', () => {
  it('omits VOLUME and ALLURE when the data does not carry them', () => {
    const workout: Workout = { id: 'r1', title: 't', discipline: 'C', zone: 'Z4', durationMin: 60, blocks: repeatBlocks, status: 'planned' }
    expect(runStatBlocks(workout).map((s) => s.label)).toEqual(['DURÉE'])
  })

  it('includes ALLURE when a main-effort segment carries a pace target', () => {
    const blocksWithPace: WorkoutBlock[] = [
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 18, zone: 'Z2', target: { pace: '5:20/km' } },
    ]
    const workout: Workout = { id: 'r2', title: 't', discipline: 'C', zone: 'Z2', durationMin: 18, blocks: blocksWithPace, status: 'planned' }
    expect(runStatBlocks(workout).map((s) => s.label)).toEqual(['ALLURE', 'DURÉE'])
  })
})
