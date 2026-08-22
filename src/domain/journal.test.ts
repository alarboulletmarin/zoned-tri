import { describe, expect, it } from 'vitest'
import { canUndoJournalEntry } from './journal'
import type { PlanJournalEntry } from './types'

function makeEntry(overrides: Partial<PlanJournalEntry> = {}): PlanJournalEntry {
  return {
    id: 'j1',
    planId: 'p1',
    at: '2026-08-01T10:00:00.000Z',
    author: 'user',
    description: 'Seance marquee faite',
    undone: false,
    ...overrides,
  }
}

describe('canUndoJournalEntry', () => {
  it('is undoable within 30 days and not already undone', () => {
    const entry = makeEntry({ at: '2026-08-01T10:00:00.000Z' })
    const now = new Date('2026-08-15T10:00:00.000Z')
    expect(canUndoJournalEntry(entry, now)).toBe(true)
  })

  it('is no longer undoable after 30 days', () => {
    const entry = makeEntry({ at: '2026-07-01T10:00:00.000Z' })
    const now = new Date('2026-08-15T10:00:00.000Z')
    expect(canUndoJournalEntry(entry, now)).toBe(false)
  })

  it('is exactly at the 30 day boundary still undoable', () => {
    const entry = makeEntry({ at: '2026-08-01T10:00:00.000Z' })
    const now = new Date('2026-08-31T10:00:00.000Z')
    expect(canUndoJournalEntry(entry, now)).toBe(true)
  })

  it('is never undoable once already undone, even within 30 days', () => {
    const entry = makeEntry({ at: '2026-08-01T10:00:00.000Z', undone: true })
    const now = new Date('2026-08-02T10:00:00.000Z')
    expect(canUndoJournalEntry(entry, now)).toBe(false)
  })
})
