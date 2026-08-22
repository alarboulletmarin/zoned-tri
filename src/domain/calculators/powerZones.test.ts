import { describe, expect, it } from 'vitest'
import { ftpPowerZones } from './powerZones'

describe('ftpPowerZones', () => {
  it('matches the mockup example for FTP 248W (screen 21)', () => {
    const result = ftpPowerZones(248)
    expect(result.proofLevel).toBe('moderate')
    expect(result.source).toMatch(/Allen.*Coggan/)
    expect(result.value).toEqual([
      { zone: 'Z1', minWatts: null, maxWatts: 136 },
      { zone: 'Z2', minWatts: 136, maxWatts: 186 },
      { zone: 'Z3', minWatts: 187, maxWatts: 223 },
      { zone: 'Z4', minWatts: 224, maxWatts: 260 },
      { zone: 'Z5', minWatts: 261, maxWatts: 298 },
      { zone: 'Z6', minWatts: 299, maxWatts: null },
    ])
  })

  it('scales with a different FTP', () => {
    const result = ftpPowerZones(200)
    expect(result.value[3]).toEqual({ zone: 'Z4', minWatts: 181, maxWatts: 210 })
  })
})
