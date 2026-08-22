import { describe, expect, it } from 'vitest'
import { cssFrom400And200 } from './css'

describe('cssFrom400And200', () => {
  it('derives CSS 1:32/100m from a 400m/200m test', () => {
    const result = cssFrom400And200(354, 170)
    expect(result.value.speedMs).toBeCloseTo(1.087, 3)
    expect(result.value.pacePer100m).toBe('1:32')
    expect(result.proofLevel).toBe('moderate')
    expect(result.source).toMatch(/Wakayoshi/)
  })
})
