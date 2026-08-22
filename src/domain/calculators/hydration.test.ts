import { describe, expect, it } from 'vitest'
import { hydrationForDuration } from './hydration'

describe('hydrationForDuration', () => {
  it('computes fluid losses and a sodium range from sweat rate and duration', () => {
    const result = hydrationForDuration(1.1, 4)
    expect(result.value.fluidLossesL).toBeCloseTo(4.4, 5)
    expect(result.value.sodiumMgLow).toBeCloseTo(1760, 5)
    expect(result.value.sodiumMgHigh).toBeCloseTo(3520, 5)
    expect(result.proofLevel).toBe('weak')
    expect(result.source).toMatch(/ACSM/)
  })
})
