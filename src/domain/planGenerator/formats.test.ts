import { describe, expect, it } from 'vitest'
import { RACE_FORMATS, largestFormatWithin, raceFormat } from './formats'

describe('RACE_FORMATS', () => {
  it('lists the four formats of the canvas in increasing order', () => {
    expect(RACE_FORMATS.map((f) => f.format)).toEqual(['Sprint', 'Olympique', '70.3', 'Ironman'])
  })

  it('carries the minimum preparation lengths written on screen G1', () => {
    expect(RACE_FORMATS.map((f) => f.minWeeks)).toEqual([8, 11, 16, 24])
  })

  it('renders the meta line of the canvas', () => {
    expect(raceFormat('70.3').metaLabel).toBe('1,9 km · 90 km · 21,1 km · 16 sem. min.')
  })
})

describe('largestFormatWithin', () => {
  it('falls back to the most demanding format that still fits', () => {
    expect(largestFormatWithin(11)?.format).toBe('Olympique')
    expect(largestFormatWithin(15)?.format).toBe('Olympique')
    expect(largestFormatWithin(16)?.format).toBe('70.3')
    expect(largestFormatWithin(30)?.format).toBe('Ironman')
  })

  it('returns nothing when even a sprint does not fit', () => {
    expect(largestFormatWithin(7)).toBeUndefined()
  })
})
