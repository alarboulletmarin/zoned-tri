import { describe, expect, it } from 'vitest'
import { carbsForDuration } from './carbs'

describe('carbsForDuration', () => {
  it('computes total carbs from a g/h rate and a duration', () => {
    const result = carbsForDuration(90, 4)
    expect(result.value).toBe(360)
    expect(result.proofLevel).toBe('solid')
    expect(result.source).toMatch(/Jeukendrup/)
  })

  it('handles fractional hours', () => {
    expect(carbsForDuration(60, 1.5).value).toBe(90)
  })
})
