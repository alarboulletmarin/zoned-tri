import { describe, expect, it } from 'vitest'
import type { WorkoutBlock } from './types'
import {
  buildTimelineBars,
  describeBlocks,
  mainEffortColorVar,
  repeatRestLabel,
  totalBlocksDurationMin,
  workoutStatBlocks,
} from './workoutBlocks'
import { SEED_WORKOUTS } from './seedWorkouts'

const segmentBlock: WorkoutBlock = {
  kind: 'segment',
  phase: 'warmup',
  effort: 'effort',
  durationMin: 10,
  distanceM: 400,
  zone: 'Z1',
}

const repeatBlock: WorkoutBlock = {
  kind: 'repeat',
  count: 8,
  steps: [
    { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.1, distanceM: 200, zone: 'Z4', target: { pace: '1:33/100m' } },
    { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
  ],
}

describe('describeBlocks', () => {
  it('describes a plain segment with its phase label and metrics', () => {
    const [row] = describeBlocks([segmentBlock], 'N')
    expect(row.title).toBe('Échauffement')
    expect(row.meta).toBe('400 m')
    // Canevas 05 l. 592 : la colonne de droite est en minutes primes, pas en « min ».
    expect(row.durationLabel).toBe('10′')
    expect(row.emphasis).toBe(false)
  })

  it('keeps a repeat on a single table row, titled « Corps de séance »', () => {
    const rows = describeBlocks([repeatBlock], 'N')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Corps de séance')
    expect(rows[0].meta).toContain('8 × 200 m')
    expect(rows[0].meta).toContain('@ 1:33/100m')
    // Un repos de 30 s ne s'écrit pas « r 1 min » (et surtout pas « r 0 min »).
    expect(rows[0].meta).toContain('r 30 s')
    expect(rows[0].emphasis).toBe(true)
  })

  it('sums repeat duration across all repetitions', () => {
    const rows = describeBlocks([repeatBlock], 'N')
    expect(rows[0].durationLabel).toBe(`${Math.round((3.1 + 0.5) * 8)}′`)
  })

  it('counts swim distances in metres and run distances in kilometres', () => {
    const swimBlock: WorkoutBlock = { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, distanceM: 1700 }
    expect(describeBlocks([swimBlock], 'N')[0].meta).toBe('1 700 m')
    expect(describeBlocks([swimBlock], 'C')[0].meta).toBe('1,7 km')
  })
})

describe('totalBlocksDurationMin', () => {
  it('sums plain segments and expanded repeats', () => {
    expect(totalBlocksDurationMin([segmentBlock, repeatBlock])).toBeCloseTo(10 + (3.1 + 0.5) * 8, 5)
  })
})

describe('buildTimelineBars', () => {
  it('produces bars whose widths sum to 100 percent', () => {
    const bars = buildTimelineBars([segmentBlock, repeatBlock], 'N')
    const totalWidth = bars.reduce((sum, bar) => sum + bar.widthPercent, 0)
    expect(totalWidth).toBeCloseTo(100, 5)
  })

  it('draws one bar per repetition instead of collapsing the repeat', () => {
    const bars = buildTimelineBars([repeatBlock], 'N')
    // 8 répétitions × (effort + repos) — le canevas 05/28/29 dessine chaque répétition.
    expect(bars).toHaveLength(16)
    expect(bars.filter((bar) => !bar.thin)).toHaveLength(8)
    expect(bars.every((bar) => bar.key.startsWith('bar-0-'))).toBe(true)
  })

  it('colours a bar by the zone of its segment, never by the discipline', () => {
    const bars = buildTimelineBars([segmentBlock, repeatBlock], 'N')
    expect(bars[0].colorVar).toBe('var(--color-zone-1)')
    expect(bars[1].colorVar).toBe('var(--color-zone-4)')
  })

  it('draws swim rests as hairlines and running recoveries as real bars', () => {
    const swimRest = buildTimelineBars([repeatBlock], 'N').filter((bar) => bar.thin)
    expect(swimRest).toHaveLength(8)
    const runRecovery = buildTimelineBars([repeatBlock], 'C').filter((bar) => bar.thin)
    expect(runRecovery).toHaveLength(0)
  })

  it('returns an empty array when there is no duration', () => {
    expect(buildTimelineBars([], 'N')).toEqual([])
  })
})

describe('mainEffortColorVar', () => {
  it('returns the zone colour of the first working segment', () => {
    expect(mainEffortColorVar([segmentBlock, repeatBlock])).toBe('var(--color-zone-4)')
  })

  it('falls back to the grey the canvas uses for unzoned blocks', () => {
    expect(mainEffortColorVar([])).toBe('var(--color-zone-1)')
  })
})

describe('repeatRestLabel', () => {
  it('reads the rest of the first repeat', () => {
    expect(repeatRestLabel([segmentBlock, repeatBlock])).toBe('30 s')
  })

  it('returns null when the workout has no repeat', () => {
    expect(repeatRestLabel([segmentBlock])).toBeNull()
  })
})

describe('workoutStatBlocks', () => {
  it('includes distance only when the workout has one', () => {
    const swim = SEED_WORKOUTS.find((w) => w.id === 'swim-pyramide-css-courte')!
    const run = SEED_WORKOUTS.find((w) => w.id === 'run-seuil-fractionne-3x8')!
    expect(workoutStatBlocks(swim).map((s) => s.label)).toEqual(['DISTANCE', 'DURÉE'])
    expect(workoutStatBlocks(run).map((s) => s.label)).toEqual(['DURÉE'])
  })

  it('counts a swim distance in grouped metres', () => {
    const swim = SEED_WORKOUTS.find((w) => w.id === 'swim-seuil-css-8x200')!
    expect(workoutStatBlocks(swim)[0].value).toBe('2 300 m')
  })
})
