import { describe, expect, it } from 'vitest'
import {
  buildIcs,
  buildIcsEvents,
  firstEventBlock,
  icsDayFileName,
  icsWeekFileName,
  renderIcs,
} from './icsFile'
import { demoBikeWorkout, demoBrickRunWorkout, demoSwimWorkout } from '../demoData'
import type { Workout } from '../types'

/** Le mardi 25 août 2026 de l'artboard 24, avec la séance de natation de l'artboard 02. */
const DAY = '2026-08-25'
const OPTIONS = { timeZone: 'Europe/Paris', now: new Date('2026-08-20T10:45:00Z') }

describe('buildIcsEvents', () => {
  it('pose le créneau exact de l’artboard 24 (06:30 → 07:25 pour 55 min)', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS)
    expect(event.startLocal).toBe('20260825T063000')
    expect(event.endLocal).toBe('20260825T072500')
  })

  it('écrit le SUMMARY « code · zone · titre distance »', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS)
    expect(event.summary).toMatch(/^N · Z4 · 8 × 150 m au CSS 2.400 m$/u)
  })

  it('fait précéder le bassin de son établissement, comme le LOCATION de l’artboard', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS)
    expect(event.location).toBe('Piscine · bassin 25 m')
  })

  it('n’invente aucun établissement pour les autres lieux', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoBikeWorkout] }], OPTIONS)
    expect(event.location).toBe('Home-trainer')
  })

  it('abrège le déroulé en Éch. / Corps / RAC et finit par la phrase de preuve', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS)
    expect(event.description).toEqual([
      'Éch. 400 m (12′)',
      'Corps 8 × 150 m @ 1:34/100m — r 20 s (23′)',
      'RAC 200 m (6′)',
      'Allure dérivée de ton CSS du 3 août.',
    ])
  })

  it('range l’événement sous Zoned Tri, sa discipline et sa zone', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS)
    expect(event.categories).toEqual(['Zoned Tri', 'Natation', 'Seuil'])
  })

  /** Pied de l'artboard 24 : « jamais un seul bloc ». */
  it('produit deux événements distincts pour une journée à deux séances, enchaînés', () => {
    const events = buildIcsEvents(
      [{ date: DAY, workouts: [demoBikeWorkout, demoBrickRunWorkout] }],
      OPTIONS,
    )
    expect(events).toHaveLength(2)
    expect(events[0].startLocal).toBe('20260825T063000')
    // 65 min de vélo : l'enchaînement démarre à 07:35, il ne se superpose pas.
    expect(events[0].endLocal).toBe('20260825T073500')
    expect(events[1].startLocal).toBe('20260825T073500')
    expect(events[1].endLocal).toBe('20260825T080000')
  })

  it('donne à chaque événement un UID local, jamais lié à un compte', () => {
    const events = buildIcsEvents(
      [{ date: DAY, workouts: [demoBikeWorkout, demoBrickRunWorkout] }],
      OPTIONS,
    )
    expect(events[0].uid).toBe(`${DAY}-1-${demoBikeWorkout.id}@zonedtri.local`)
    expect(events[1].uid).not.toBe(events[0].uid)
  })

  it('écarte une séance annulée', () => {
    const cancelled: Workout = { ...demoSwimWorkout, status: 'cancelled' }
    expect(buildIcsEvents([{ date: DAY, workouts: [cancelled] }], OPTIONS)).toEqual([])
  })

  it('bascule au lendemain quand la séance déborde de minuit', () => {
    const [event] = buildIcsEvents([{ date: DAY, workouts: [demoSwimWorkout] }], {
      ...OPTIONS,
      startTime: '23:30',
    })
    expect(event.startLocal).toBe('20260825T233000')
    expect(event.endLocal).toBe('20260826T002500')
  })
})

describe('renderIcs', () => {
  const text = buildIcs([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS)

  it('enveloppe les événements dans un VCALENDAR lisible par un agenda', () => {
    expect(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(text).toContain('PRODID:-//Zoned Tri//Plan//FR')
  })

  it('écrit DTSTART et DTEND avec le TZID de l’artboard', () => {
    expect(text).toContain('DTSTART;TZID=Europe/Paris:20260825T063000')
    expect(text).toContain('DTEND;TZID=Europe/Paris:20260825T072500')
  })

  it('confirme l’événement et ne pose AUCUN rappel', () => {
    expect(text).toContain('STATUS:CONFIRMED')
    expect(text).not.toContain('VALARM')
  })

  it('sépare les lignes du déroulé par des \\n échappés, pas par un pliage seul', () => {
    expect(text).toContain('\\nRAC 200 m (6′)')
  })

  it('plie les lignes au-delà de 75 octets, continuation précédée d’une espace', () => {
    const physical = text.split('\r\n')
    for (const line of physical) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(physical.some((line) => line.startsWith(' '))).toBe(true)
  })

  it('ne coupe jamais un caractère multi-octets en deux', () => {
    // Un « é » coupé produirait un caractère de remplacement au décodage.
    expect(text).not.toContain('�')
  })

  it('échappe les caractères réservés d’un TEXT', () => {
    const tricky: Workout = { ...demoSwimWorkout, title: 'Bloc; virgule, et \\ antislash' }
    const output = renderIcs(buildIcsEvents([{ date: DAY, workouts: [tricky] }], OPTIONS), OPTIONS)
    expect(output).toContain('Bloc\\; virgule\\, et \\\\ antislash')
  })

  it('horodate chaque événement en UTC', () => {
    expect(text).toContain('DTSTAMP:20260820T104500Z')
  })
})

describe('firstEventBlock', () => {
  it('rend le VEVENT que l’artboard 24 donne à lire, pliage compris', () => {
    const block = firstEventBlock(buildIcs([{ date: DAY, workouts: [demoSwimWorkout] }], OPTIONS))
    expect(block.startsWith('BEGIN:VEVENT')).toBe(true)
    expect(block.endsWith('END:VEVENT')).toBe(true)
    expect(block).toContain('SUMMARY:N · Z4 ·')
  })

  it('rend une chaîne vide quand le fichier ne porte aucun événement', () => {
    expect(firstEventBlock(renderIcs([], OPTIONS))).toBe('')
  })
})

describe('noms de fichier', () => {
  it('nomme la semaine comme l’artboard 24', () => {
    expect(icsWeekFileName(7)).toBe('zonedtri-semaine-07.ics')
  })

  it('nomme la journée par sa date', () => {
    expect(icsDayFileName(DAY)).toBe('zonedtri-2026-08-25.ics')
  })
})
