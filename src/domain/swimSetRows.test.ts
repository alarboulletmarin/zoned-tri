import { describe, expect, it } from 'vitest'
import { SEED_WORKOUTS } from './seedWorkouts'
import { buildDetailMetaLine, buildSwimSetRows } from './swimSetRows'

const swim = SEED_WORKOUTS.find((w) => w.id === 'swim-seuil-css-8x200')!

describe('buildSwimSetRows', () => {
  it('lays out the canvas rows: échauffement, série, retour au calme', () => {
    const rows = buildSwimSetRows(swim)
    expect(rows.map((row) => row.block)).toEqual(['Éch. 400 m', '8 × 200 m', 'RAC 300 m'])
  })

  it('reads the target pace from the block, and the rest from the repeat', () => {
    const [warmup, main] = buildSwimSetRows(swim)
    expect(warmup.target).toBe('—')
    expect(warmup.rest).toBe('—')
    expect(main.target).toBe('1:33/100m')
    expect(main.rest).toBe('30 s')
  })
})

describe('buildDetailMetaLine', () => {
  it('assembles the S4 meta line — distance in metres, duration, target', () => {
    expect(buildDetailMetaLine(swim)).toBe('2\u202f300 m · 47 min · 1:33/100m')
  })

  it('drops the distance when the workout has none', () => {
    const run = SEED_WORKOUTS.find((w) => w.id === 'run-seuil-fractionne-3x8')!
    expect(buildDetailMetaLine(run).startsWith('1 h')).toBe(true)
  })
})
