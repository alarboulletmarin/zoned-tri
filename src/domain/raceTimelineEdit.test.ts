import { describe, expect, it } from 'vitest'
import { demoRace } from './demoData'
import type { Race } from './types'
import { buildRaceIcsEvents } from './exports/raceIcs'
import {
  emptyRow,
  markStart,
  newRowKey,
  rowsAreValid,
  rowsFromRace,
  timelineFromRows,
  validateRow,
  type TimelineRow,
} from './raceTimelineEdit'

function row(partial: Partial<TimelineRow>): TimelineRow {
  return { key: newRowKey(), at: '07:20', label: 'Départ', detail: '', phase: 'race_day', isStart: false, ...partial }
}

describe('rowsFromRace', () => {
  it('reprend le déroulé existant', () => {
    expect(rowsFromRace(demoRace)).toHaveLength(demoRace.timeline?.length ?? 0)
  })

  it('part de l’heure de départ déjà saisie — la seule valeur qu’on ne devine pas', () => {
    const race: Race = { ...demoRace, timeline: undefined, startTime: '07:20' }
    const rows = rowsFromRace(race)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ at: '07:20', label: 'Départ', isStart: true, phase: 'race_day' })
  })

  it('ne propose rien du tout quand la course n’a même pas d’heure de départ', () => {
    expect(rowsFromRace({ ...demoRace, timeline: undefined, startTime: undefined })).toEqual([])
  })
})

describe('validateRow', () => {
  it('exige une heure au format hh:mm et un nom', () => {
    const errors = validateRow(row({ at: '7h', label: '  ' }))
    expect(errors.at).toBeDefined()
    expect(errors.label).toBeDefined()
  })

  it('laisse passer un déroulé vide : un bloc sans repère ne s’affiche simplement pas', () => {
    expect(rowsAreValid([])).toBe(true)
  })
})

describe('timelineFromRows', () => {
  /**
   * Le tri n'est pas cosmétique : `buildRaceIcs` borne chaque événement par le SUIVANT dans le
   * tableau. Un tableau désordonné produirait des durées négatives dans l'agenda.
   */
  it('trie par phase puis par heure, ce dont dépend l’export .ICS', () => {
    const timeline = timelineFromRows([
      row({ at: '09:00', label: 'Sortie de l’eau' }),
      row({ at: '19:00', label: 'Dépôt du vélo', phase: 'eve' }),
      row({ at: '07:20', label: 'Départ', isStart: true }),
    ])
    expect(timeline.map((event) => event.label)).toEqual(['Dépôt du vélo', 'Départ', 'Sortie de l’eau'])
  })

  it('omet un détail vide plutôt que d’écrire une sous-ligne blanche', () => {
    const [event] = timelineFromRows([row({ detail: '   ' })])
    expect(event.detail).toBeUndefined()
  })

  it('produit un déroulé que l’export agenda sait lire', () => {
    const race: Race = {
      ...demoRace,
      timeline: timelineFromRows([
        row({ at: '19:00', label: 'Dépôt du vélo', phase: 'eve' }),
        row({ at: '05:30', label: 'Réveil' }),
        row({ at: '07:20', label: 'Départ', isStart: true }),
      ]),
    }
    const events = buildRaceIcsEvents(race)
    expect(events).toHaveLength(3)
    // Chaque repère borné par le suivant : jamais une durée négative dans l'agenda.
    expect(events.every((event) => event.startLocal < event.endLocal)).toBe(true)
    expect(events.map((event) => event.summary)).toEqual([
      `${race.name} — Dépôt du vélo`,
      `${race.name} — Réveil`,
      `${race.name} — départ`,
    ])
  })
})

describe('markStart', () => {
  it('n’autorise qu’un seul départ', () => {
    const first = row({ label: 'Réveil', isStart: true })
    const second = row({ label: 'Départ' })
    const marked = markStart([first, second], second.key)
    expect(marked.map((candidate) => candidate.isStart)).toEqual([false, true])
  })

  it('décoche en recliquant : le départ n’est pas obligatoire', () => {
    const only = row({ isStart: true })
    expect(markStart([only], only.key)[0]!.isStart).toBe(false)
  })
})

describe('emptyRow', () => {
  it('naît dans la phase du bloc qui l’ajoute', () => {
    expect(emptyRow('eve').phase).toBe('eve')
  })
})
