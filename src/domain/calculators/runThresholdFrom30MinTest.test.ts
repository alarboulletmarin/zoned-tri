import { describe, expect, it } from 'vitest'
import { runThresholdFrom30MinTest } from './runThresholdFrom30MinTest'

describe('runThresholdFrom30MinTest', () => {
  it('matches the mockup example (screen 33): 7140m/30min', () => {
    const result = runThresholdFrom30MinTest(7140)
    expect(result.value.speedKmh).toBeCloseTo(14.3, 1)
    expect(result.value.thresholdPaceMinPerKm).toBe('4:12')
    expect(result.value.vmaKmh).toBeCloseTo(17.2, 1)
    expect(result.proofLevel).toBe('weak')
    expect(result.source).toMatch(/0,83/)
  })
})
