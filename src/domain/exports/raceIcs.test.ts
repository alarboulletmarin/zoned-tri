import { describe, expect, it } from 'vitest'
import { demoRace } from '../demoData'
import type { Race } from '../types'
import { buildRaceIcs, buildRaceIcsEvents, raceIcsFileName } from './raceIcs'

const AVEC_TIMELINE: Race = {
  ...demoRace,
  date: '2026-11-08',
  timeline: [
    { label: 'Dépôt du vélo au parc', at: '18:00', phase: 'eve' },
    { label: 'Réveil', at: '04:30', phase: 'race_day', detail: '3 h avant le départ' },
    { label: 'Départ', at: '07:20', phase: 'race_day', isStart: true },
    { label: 'Arrivée estimée', at: '12:30', phase: 'race_day' },
  ],
}

describe('buildRaceIcs', () => {
  it('rend null quand la course n’a pas de timeline — il n’y a rien à mettre dans un agenda', () => {
    expect(buildRaceIcs({ ...demoRace, timeline: undefined })).toBeNull()
    expect(buildRaceIcs({ ...demoRace, timeline: [] })).toBeNull()
  })

  it('pose les repères de la veille la veille, et ceux du jour J le jour J', () => {
    const events = buildRaceIcsEvents(AVEC_TIMELINE)
    expect(events[0].startLocal).toBe('20261107T180000')
    expect(events[1].startLocal).toBe('20261108T043000')
  })

  /** Le modèle ne porte que l'heure d'un repère : sa fin est le repère suivant, jamais une durée devinée. */
  it('borne chaque repère par le suivant du même jour', () => {
    const events = buildRaceIcsEvents(AVEC_TIMELINE)
    expect(events[1].endLocal).toBe('20261108T072000')
    expect(events[2].endLocal).toBe('20261108T123000')
  })

  it('donne au dernier repère une durée courte, et le dit dans sa description', () => {
    const events = buildRaceIcsEvents(AVEC_TIMELINE)
    const dernier = events[events.length - 1]
    expect(dernier.endLocal).toBe('20261108T124500')
    expect(dernier.description.join(' ')).toContain('le modèle ne porte que l’heure')
  })

  /** Un repère isolé la veille ne dure pas jusqu'au lendemain matin. */
  it('ne fait pas courir un repère de la veille jusqu’au jour J', () => {
    const events = buildRaceIcsEvents(AVEC_TIMELINE)
    expect(events[0].endLocal).toBe('20261107T181500')
  })

  it('nomme la course dans chaque événement, et marque le départ', () => {
    const events = buildRaceIcsEvents(AVEC_TIMELINE)
    expect(events[0].summary).toBe(`${AVEC_TIMELINE.name} — Dépôt du vélo au parc`)
    expect(events[2].summary).toBe(`${AVEC_TIMELINE.name} — départ`)
  })

  it('écrit un fichier RFC 5545 complet', () => {
    const ics = buildRaceIcs(AVEC_TIMELINE)!
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(4)
    expect(ics.includes('\r\n')).toBe(true)
  })

  it('nomme le fichier par la date de la course', () => {
    expect(raceIcsFileName(AVEC_TIMELINE)).toBe('zonedtri-course-2026-11-08.ics')
  })
})
