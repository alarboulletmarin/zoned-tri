import { describe, expect, it } from 'vitest'
import { ftpFrom20MinTest } from './ftpFrom20MinTest'

describe('ftpFrom20MinTest', () => {
  it('estimates FTP at 95% of the 20min average power (screen 12 note 7)', () => {
    const result = ftpFrom20MinTest(261)
    expect(result.value).toBe(248)
    expect(result.proofLevel).toBe('weak')
    expect(result.source).toMatch(/heuristique de terrain/)
  })

  it('rounds to the nearest watt', () => {
    expect(ftpFrom20MinTest(300).value).toBe(285)
  })
})
