import { describe, expect, it } from 'vitest'
import { selectDetailTemplate } from './workoutDetailTemplate'

describe('selectDetailTemplate', () => {
  it('maps N to the swim template (écran 05)', () => {
    expect(selectDetailTemplate('N')).toBe('swim')
  })

  it('maps V to the bike template (écran 28)', () => {
    expect(selectDetailTemplate('V')).toBe('bike')
  })

  it('maps C to the run template (écran 29)', () => {
    expect(selectDetailTemplate('C')).toBe('run')
  })

  it('maps R to the generic fallback template', () => {
    expect(selectDetailTemplate('R')).toBe('generic')
  })
})
