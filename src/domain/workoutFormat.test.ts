import { describe, expect, it } from 'vitest'
import {
  formatDistanceM,
  formatDurationMin,
  formatMeters,
  formatShortDuration,
  formatWorkoutDistance,
  zoneToNumber,
} from './workoutFormat'

describe('formatDurationMin', () => {
  it('formats minutes under an hour', () => {
    expect(formatDurationMin(45)).toBe('45 min')
  })

  it('rounds fractional minutes', () => {
    expect(formatDurationMin(46.8)).toBe('47 min')
  })

  it('formats exact hours without minutes', () => {
    expect(formatDurationMin(120)).toBe('2 h')
  })

  it('formats hours with minutes, zero-padded', () => {
    expect(formatDurationMin(65)).toBe('1 h 05')
  })
})

describe('formatDistanceM', () => {
  it('formats sub-kilometre distances in metres', () => {
    expect(formatDistanceM(400)).toBe('400 m')
  })

  it('formats kilometre distances', () => {
    expect(formatDistanceM(2400)).toBe('2,4 km')
  })
})

describe('formatMeters', () => {
  // Canevas 05 l. 577 / S4 l. 1591 : « 2 400 m ». Le separateur est une espace FINE INSECABLE.
  it('groups thousands with a narrow no-break space', () => {
    expect(formatMeters(2400)).toBe('2\u202f400 m')
  })

  it('leaves sub-kilometre distances ungrouped', () => {
    expect(formatMeters(400)).toBe('400 m')
  })
})

describe('formatWorkoutDistance', () => {
  it('counts swimming in metres', () => {
    expect(formatWorkoutDistance('N', 2400)).toBe('2\u202f400 m')
  })

  it('counts running and cycling in kilometres', () => {
    expect(formatWorkoutDistance('C', 13000)).toBe('13 km')
  })
})

describe('formatShortDuration', () => {
  it('expresses sub-minute rests in seconds', () => {
    expect(formatShortDuration(0.5)).toBe('30 s')
    expect(formatShortDuration(1 / 3)).toBe('20 s')
  })

  it('uses prime minutes above a minute', () => {
    expect(formatShortDuration(4)).toBe('4\u2032')
  })
})

describe('zoneToNumber', () => {
  it('extracts the numeric zone from a Zone string', () => {
    expect(zoneToNumber('Z4')).toBe(4)
  })
})
