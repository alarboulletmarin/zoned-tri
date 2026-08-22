import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  formatDayMonthLong,
  formatLongDate,
  mondayOf,
  weekdayName,
  weeksUntilRace,
} from './dates'

describe('addDays / daysBetween', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-08-30', 2)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -2)).toBe('2026-08-30')
  })

  it('counts days in both directions', () => {
    expect(daysBetween('2026-06-15', '2026-06-22')).toBe(7)
    expect(daysBetween('2026-06-22', '2026-06-15')).toBe(-7)
  })
})

describe('mondayOf', () => {
  it('returns the same day when it is already a Monday', () => {
    expect(mondayOf('2026-06-15')).toBe('2026-06-15')
  })

  it('walks back to Monday from a Sunday', () => {
    expect(mondayOf('2026-06-21')).toBe('2026-06-15')
  })
})

describe('weeksUntilRace', () => {
  it('counts the current week as week 1', () => {
    // Lundi 15 juin, course le dimanche 21 : une seule semaine de préparation.
    expect(weeksUntilRace('2026-06-15', '2026-06-21')).toBe(1)
    expect(weeksUntilRace('2026-06-18', '2026-06-21')).toBe(1)
  })

  it('counts a full extra week per additional Monday', () => {
    expect(weeksUntilRace('2026-06-18', '2026-06-28')).toBe(2)
    expect(weeksUntilRace('2026-06-15', '2026-08-30')).toBe(11)
  })

  it('returns 0 for a race already run', () => {
    expect(weeksUntilRace('2026-06-15', '2026-06-01')).toBe(0)
  })
})

describe('formatting', () => {
  it('writes the French long date of the canvas', () => {
    expect(formatLongDate('2026-08-30')).toBe('30 août 2026')
    expect(formatDayMonthLong('2026-08-30')).toBe('30 août')
  })

  it('names the weekday', () => {
    expect(weekdayName('2026-08-30')).toBe('dimanche')
    expect(weekdayName('2026-06-15')).toBe('lundi')
  })
})
