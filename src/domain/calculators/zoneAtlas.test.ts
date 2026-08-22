import { describe, expect, it } from 'vitest'
import { buildZoneAtlas, swimZonesFromCss } from './zoneAtlas'

describe('swimZonesFromCss', () => {
  it('derives 6 swim zones from % of CSS pace (Friel model, shifted so Z4 contains CSS pace) for CSS 1:32/100m', () => {
    const result = swimZonesFromCss(92)
    expect(result.proofLevel).toBe('moderate')
    expect(result.source).toMatch(/Friel/)
    expect(result.value).toEqual([
      { zone: 'Z1', fastPaceMinPer100m: '1:50', slowPaceMinPer100m: null },
      { zone: 'Z2', fastPaceMinPer100m: '1:43', slowPaceMinPer100m: '1:50' },
      { zone: 'Z3', fastPaceMinPer100m: '1:37', slowPaceMinPer100m: '1:42' },
      { zone: 'Z4', fastPaceMinPer100m: '1:30', slowPaceMinPer100m: '1:36' },
      { zone: 'Z5', fastPaceMinPer100m: '1:25', slowPaceMinPer100m: '1:29' },
      { zone: 'Z6', fastPaceMinPer100m: null, slowPaceMinPer100m: '1:25' },
    ])
  })

  it('keeps the CSS pace itself inside Z4, consistent with the "Seuil" zone name', () => {
    const result = swimZonesFromCss(92)
    const z4 = result.value.find((z) => z.zone === 'Z4')
    expect(z4).toBeDefined()
  })
})

describe('buildZoneAtlas', () => {
  it('aggregates swim/bike/run/HR zones into one 6-zone table, without a new formula', () => {
    const result = buildZoneAtlas({
      cssPaceSecPer100m: 92,
      ftpWatts: 248,
      thresholdPaceSecPerKm: 252,
      maxHeartRateBpm: 186,
    })

    expect(result).toHaveLength(6)
    expect(result[3]).toEqual({
      zone: 'Z4',
      swim: { fastPaceMinPer100m: '1:30', slowPaceMinPer100m: '1:36' },
      bike: { minWatts: 224, maxWatts: 260 },
      run: { fastPaceMinPerKm: '4:04', slowPaceMinPerKm: '4:25' },
      heartRate: { minBpm: 150, maxBpm: 162 },
    })
  })
})
