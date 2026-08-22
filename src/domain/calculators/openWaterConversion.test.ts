import { describe, expect, it } from 'vitest'
import { openWaterPaceFromPool } from './openWaterConversion'

describe('openWaterPaceFromPool', () => {
  it('adds the 3 factors (turns, wetsuit, sighting) as a range around a pool pace of 1:32/100m', () => {
    const result = openWaterPaceFromPool({
      poolPaceSecPer100m: 92,
      poolLengthM: 25,
      wetsuit: true,
      sightingFrequency: 'moyenne',
    })

    expect(result.value.lowPaceSecPer100m).toBeCloseTo(90.5, 5)
    expect(result.value.highPaceSecPer100m).toBeCloseTo(94.5, 5)
    expect(result.value.centralPaceSecPer100m).toBeCloseTo(92.5, 5)
    expect(result.proofLevel).toBe('weak')
    expect(result.source).toMatch(/estimation par règle empirique/)
  })

  it('has no wetsuit contribution when not worn', () => {
    const result = openWaterPaceFromPool({
      poolPaceSecPer100m: 92,
      poolLengthM: 50,
      wetsuit: false,
      sightingFrequency: 'faible',
    })

    // 50m pool -> turns [0,1] ; no wetsuit -> [0,0] ; faible sighting -> [1,1.5]
    expect(result.value.lowPaceSecPer100m).toBeCloseTo(93, 5)
    expect(result.value.highPaceSecPer100m).toBeCloseTo(94.5, 5)
  })
})
