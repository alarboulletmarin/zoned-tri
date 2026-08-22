import { describe, expect, it } from 'vitest'
import {
  intensityFactorBike,
  intensityFactorRun,
  intensityFactorSwim,
  tssFromDurationAndIf,
} from './intensityFactorTss'

describe('intensityFactorBike', () => {
  it('is NP/FTP — no proof badge, it is a definition', () => {
    const result = intensityFactorBike(218, 248)
    expect(result.value).toBeCloseTo(0.879, 3)
    expect(result.proofLevel).toBe('definition')
  })
})

describe('intensityFactorRun', () => {
  it('is thresholdPace/actualPace — faster real pace gives a higher IF', () => {
    const fasterThanThreshold = intensityFactorRun(252, 240)
    expect(fasterThanThreshold.value).toBeCloseTo(1.05, 2)

    const slowerThanThreshold = intensityFactorRun(252, 270)
    expect(slowerThanThreshold.value).toBeCloseTo(0.933, 3)
  })
})

describe('intensityFactorSwim', () => {
  it('is CSS/actualPace — inverted vs bike/run, swimming faster raises IF', () => {
    const fasterThanCss = intensityFactorSwim(92, 88)
    expect(fasterThanCss.value).toBeCloseTo(1.045, 3)

    const slowerThanCss = intensityFactorSwim(92, 100)
    expect(slowerThanCss.value).toBeCloseTo(0.92, 2)
  })
})

describe('tssFromDurationAndIf', () => {
  it('is hours x IF^2 x 100 (Coggan 2003, extended by Skiba 2008)', () => {
    const result = tssFromDurationAndIf(1, 0.88)
    expect(result.value).toBeCloseTo(77.44, 2)
    expect(result.proofLevel).toBe('definition')
  })

  it('scales linearly with duration', () => {
    expect(tssFromDurationAndIf(0.5, 1).value).toBeCloseTo(50, 5)
  })
})
