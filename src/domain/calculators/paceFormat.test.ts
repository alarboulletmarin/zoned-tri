import { describe, expect, it } from 'vitest'
import { formatPaceMinSec, paceSecToSpeedKmh, secPerKmToSecPer100m, speedKmhToPaceSecPerKm } from './paceFormat'

describe('formatPaceMinSec', () => {
  it('formats 92 seconds as 1:32', () => {
    expect(formatPaceMinSec(92)).toBe('1:32')
  })

  it('pads seconds under 10', () => {
    expect(formatPaceMinSec(65)).toBe('1:05')
  })

  it('rounds to the nearest second', () => {
    expect(formatPaceMinSec(92.4)).toBe('1:32')
    expect(formatPaceMinSec(92.6)).toBe('1:33')
  })

  it('formats sub-minute paces', () => {
    expect(formatPaceMinSec(45)).toBe('0:45')
  })
})

describe('speedKmhToPaceSecPerKm', () => {
  it('converts 14.28 km/h to seconds per km', () => {
    expect(speedKmhToPaceSecPerKm(14.28)).toBeCloseTo(252.1, 0)
  })
})

describe('paceSecToSpeedKmh', () => {
  it('converts pace seconds/km back to km/h', () => {
    expect(paceSecToSpeedKmh(252.1)).toBeCloseTo(14.28, 1)
  })
})

describe('secPerKmToSecPer100m', () => {
  it('converts a per-km pace to a per-100m pace', () => {
    expect(secPerKmToSecPer100m(300)).toBe(30)
  })
})
