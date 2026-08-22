import type { PlanJournalEntry } from './types'

const UNDO_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export function canUndoJournalEntry(entry: PlanJournalEntry, now: Date = new Date()): boolean {
  if (entry.undone) return false
  const enteredAt = new Date(entry.at).getTime()
  return now.getTime() - enteredAt <= UNDO_WINDOW_MS
}
