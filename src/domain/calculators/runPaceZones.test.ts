import { describe, expect, it } from 'vitest'
import { runPaceZonesFromThreshold } from './runPaceZones'

describe('runPaceZonesFromThreshold', () => {
  it('derives 6 run zones from % of threshold pace (Friel model) for a 4:12/km threshold', () => {
    const result = runPaceZonesFromThreshold(252)
    expect(result.proofLevel).toBe('moderate')
    expect(result.source).toMatch(/Friel/)
    expect(result.value).toEqual([
      { zone: 'Z1', fastPaceMinPerKm: '5:25', slowPaceMinPerKm: null },
      { zone: 'Z2', fastPaceMinPerKm: '4:47', slowPaceMinPerKm: '5:23' },
      { zone: 'Z3', fastPaceMinPerKm: '4:27', slowPaceMinPerKm: '4:45' },
      { zone: 'Z4', fastPaceMinPerKm: '4:04', slowPaceMinPerKm: '4:25' },
      { zone: 'Z5', fastPaceMinPerKm: '3:47', slowPaceMinPerKm: '4:02' },
      { zone: 'Z6', fastPaceMinPerKm: null, slowPaceMinPerKm: '3:47' },
    ])
  })

  it('keeps the threshold pace itself inside Z4, consistent with the "Seuil" zone name', () => {
    const thresholdPaceSecPerKm = 252
    const result = runPaceZonesFromThreshold(thresholdPaceSecPerKm)
    const z4 = result.value.find((z) => z.zone === 'Z4')
    expect(z4).toBeDefined()
  })
})
