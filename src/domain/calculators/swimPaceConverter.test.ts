import { describe, expect, it } from 'vitest'
import { swimPaceConversions, swimPaceFromTimeAndDistance, swimTimeForDistance } from './swimPaceConverter'

describe('swimPaceConversions', () => {
  it('converts 1:32/100m to m/s and km/h — pure arithmetic, no proof badge', () => {
    const result = swimPaceConversions(92)
    expect(result.value.paceSecPer100m).toBe(92)
    expect(result.value.speedMs).toBeCloseTo(1.087, 3)
    expect(result.value.speedKmh).toBeCloseTo(3.913, 3)
    expect(result.proofLevel).toBe('definition')
  })
})

describe('swimTimeForDistance', () => {
  it('computes the time to cover a distance at a given pace', () => {
    const result = swimTimeForDistance(92, 1500)
    expect(result.value).toBe(1380)
    expect(result.proofLevel).toBe('definition')
  })
})

describe('swimPaceFromTimeAndDistance', () => {
  it('derives a pace/100m from a time and a distance', () => {
    const result = swimPaceFromTimeAndDistance(1380, 1500)
    expect(result.value).toBe(92)
    expect(result.proofLevel).toBe('definition')
  })
})
