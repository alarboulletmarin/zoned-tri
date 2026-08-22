import { describe, expect, it } from 'vitest'
import type { WorkoutBlock } from '../../../domain/types'
import { bikeFtpScale, bikeMainTargetPercent, bikeTargetColumnLabel, buildBikeBlockRows } from './bikeBlockRows'

const blocks: WorkoutBlock[] = [
  { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2', target: { powerPercentFtp: 60 } },
  {
    kind: 'repeat',
    count: 2,
    steps: [
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 20, zone: 'Z4', target: { powerPercentFtp: 98, cadenceRpm: 90 } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 5, zone: 'Z1', target: { powerPercentFtp: 45 } },
    ],
  },
]

describe('buildBikeBlockRows', () => {
  it('renders one row per repeat, not one per repetition', () => {
    const rows = buildBikeBlockRows(blocks)
    expect(rows).toHaveLength(2)
    // Canevas 28 l. 3089 : « 3 × 12′ · r 4′ » — minutes primes dans le tableau.
    expect(rows[1].label).toBe('2 × 20′ · r 5′')
    expect(rows[1].cadence).toBe('90')
  })

  it('reste en % de FTP tant qu’aucune FTP n’est mesurée', () => {
    expect(buildBikeBlockRows(blocks)[0].target).toBe('60 %')
    expect(bikeTargetColumnLabel(null)).toBe('% FTP')
  })

  /** Canevas 28 : « 238 W » de CIBLE, soit 96 % de la FTP de 248 W du profil de démonstration. */
  it('convertit en watts dès qu’une FTP est mesurée', () => {
    const rows = buildBikeBlockRows(blocks, 248)
    expect(rows[0].target).toBe('149')
    expect(rows[1].target).toBe('243')
    expect(bikeTargetColumnLabel(248)).toBe('Watts')
  })

  it('écrit un tiret, jamais un zéro, quand un bloc ne cible rien', () => {
    const noTarget: WorkoutBlock[] = [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, zone: 'Z2' }]
    expect(buildBikeBlockRows(noTarget, 248)[0].target).toBe('—')
    expect(buildBikeBlockRows(noTarget, 248)[0].cadence).toBe('—')
  })
})

describe('bikeMainTargetPercent', () => {
  it('finds the first main-effort %FTP target across segments and repeats', () => {
    expect(bikeMainTargetPercent({ id: 'x', title: 't', discipline: 'V', zone: 'Z4', durationMin: 10, blocks, status: 'planned' })).toBe(98)
  })

  it('returns null when nothing carries a power target', () => {
    const noTarget: WorkoutBlock[] = [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, zone: 'Z2' }]
    expect(bikeMainTargetPercent({ id: 'y', title: 't', discipline: 'V', zone: 'Z2', durationMin: 30, blocks: noTarget, status: 'planned' })).toBeNull()
  })
})

describe('bikeFtpScale', () => {
  /** Canevas 28 l. 3083 : « 65 % · 96 % FTP sur les blocs · 55 % » sous le graphe. */
  it('donne les trois repères du graphe : premier bloc, corps de séance, dernier bloc', () => {
    expect(bikeFtpScale(blocks)).toEqual({ start: '60 %', main: '98 % FTP sur les blocs', end: '45 %' })
  })

  it('ne montre aucune échelle quand les blocs ne portent pas de cible', () => {
    expect(bikeFtpScale([{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, zone: 'Z2' }])).toBeNull()
  })
})
