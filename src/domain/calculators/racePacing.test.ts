import { describe, expect, it } from 'vitest'
import { raceSegmentPacing } from './racePacing'

describe('raceSegmentPacing', () => {
  it('allocates segment times from references weighted by a target IF per discipline', () => {
    const result = raceSegmentPacing({
      distances: { swimM: 1500, bikeKm: 90, runKm: 21.1 },
      targetIf: { swim: 1, bike: 0.78, run: 0.85 },
      references: { cssPaceSecPer100m: 92, bikeThresholdSpeedKmh: 35, runThresholdPaceSecPerKm: 252 },
      transitionsSec: { t1: 180, t2: 120 },
    })

    expect(result.value.targetTimeSec).toBe(19804)
    expect(result.value.segments.map((s) => [s.segment, s.cumulativeTimeSec])).toEqual([
      ['N', 1380],
      ['T1', 1560],
      ['V', 13428],
      ['T2', 13548],
      ['C', 19804],
    ])
    expect(result.proofLevel).toBe('product_rule')
    expect(result.source).toMatch(/pas une prédiction validée/)
  })
})
