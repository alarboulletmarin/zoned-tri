import { describe, expect, it } from 'vitest'
import { heartRateZones } from './heartRateZones'

describe('heartRateZones', () => {
  it('computes contiguous bpm bounds for maxHr 186', () => {
    const result = heartRateZones(186)
    expect(result.proofLevel).toBe('weak')
    expect(result.value).toEqual([
      { zone: 'Z1', minBpm: null, maxBpm: 112 },
      { zone: 'Z2', minBpm: 112, maxBpm: 130 },
      { zone: 'Z3', minBpm: 131, maxBpm: 149 },
      { zone: 'Z4', minBpm: 150, maxBpm: 162 },
      { zone: 'Z5', minBpm: 163, maxBpm: 173 },
      { zone: 'Z6', minBpm: 174, maxBpm: null },
    ])
  })
})
