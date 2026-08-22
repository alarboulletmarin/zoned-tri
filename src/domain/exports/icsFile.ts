// Contenu du fichier `.ICS` — artboard 24, « ce que l'agenda reçoit exactement ·
// un événement par séance ».
//
// Le fichier est écrit ici POUR DE BON : c'est un format texte, il n'y a aucune raison de le
// reporter. Rien n'est calculé une seconde fois — le déroulé passe par `describeBlocks`, les
// libellés par `workoutFormat`, la distance par `formatWorkoutDistance`.
//
// TROIS ÉCARTS ASSUMÉS avec l'artboard, tous dans le sens de la conformité RFC 5545 :
//  1. l'artboard ne montre qu'un `VEVENT` : un fichier lisible par un agenda exige aussi
//     l'enveloppe `VCALENDAR` (`VERSION`, `PRODID`, `CALSCALE`), et chaque événement un `UID`
//     et un `DTSTAMP`. Le pied de l'artboard les autorise en creux — « aucun UID **lié à un
//     compte** » : l'UID existe, il est local (`@zonedtri.local`) et se dérive du plan ;
//  2. l'artboard replie sa `DESCRIPTION` sur plusieurs lignes commençant par une espace : c'est
//     le pliage RFC 5545 §3.1, qu'on reproduit — et on ajoute les `\n` d'échappement, sans quoi
//     l'agenda afficherait le déroulé en un seul paragraphe au lieu d'une ligne par bloc ;
//  3. `TZID=Europe/Paris` est écrit sans composant `VTIMEZONE`, exactement comme l'artboard.
//     Les agendas courants résolvent le nom IANA ; le fuseau réel vient du navigateur.
//
// CE QUI MANQUE FAUTE DE DONNÉES : le modèle ne porte AUCUNE heure de séance (`PlanDay` n'a
// qu'une date). L'heure de départ est donc celle que l'artboard écrit — 06:30 — et les séances
// d'une même journée s'enchaînent à la suite plutôt que de se superposer. Le pied de l'artboard
// l'exige : « un jour à deux séances produit deux événements distincts, jamais un seul bloc ».

import type { Discipline, Workout, WorkoutLocation } from '../types'
import { describeBlocks } from '../workoutBlocks'
import {
  DISCIPLINE_LABELS,
  LOCATION_LABELS,
  ZONE_LABELS,
  formatWorkoutDistance,
} from '../workoutFormat'

/** Une journée du plan, ses séances déjà résolues contre le catalogue. */
export interface IcsDay {
  date: string
  workouts: Workout[]
}

export interface IcsOptions {
  /** `Europe/Paris` sur l'artboard 24 ; par défaut le fuseau du navigateur. */
  timeZone?: string
  /** `HH:MM`. Heure de l'artboard 24 — le modèle n'en porte aucune. */
  startTime?: string
  /** Horloge du `DTSTAMP`, injectée par les tests. */
  now?: Date
}

/** Heure de départ de l'artboard 24 (`DTSTART…T063000`). */
export const DEFAULT_START_TIME = '06:30'

/** Fuseau de l'artboard 24, employé quand le navigateur n'en déclare pas. */
export const DEFAULT_TIME_ZONE = 'Europe/Paris'

export interface IcsEvent {
  uid: string
  /** `20260825T063000` — heure locale du fuseau, sans `Z`. */
  startLocal: string
  endLocal: string
  summary: string
  location: string | null
  /** Une entrée par ligne de la `DESCRIPTION`, dans l'ordre de l'artboard. */
  description: string[]
  categories: string[]
}

// --- Ce que l'artboard écrit dans chaque champ -------------------------------------------

/**
 * `Éch.` / `Corps` / `RAC` — les abréviations de la `DESCRIPTION` de l'artboard 24, qui sont
 * aussi celles de la légende des profils (« effort · éch. / RAC · repos »). La clé est
 * l'intitulé long que produit `describeBlocks` : une seule source pour le déroulé.
 */
const SHORT_BLOCK_LABEL: Record<string, string> = {
  Échauffement: 'Éch.',
  'Corps de séance': 'Corps',
  Récupération: 'Récup.',
  Repos: 'Repos',
  'Retour au calme': 'RAC',
}

/**
 * `LOCATION:Piscine · bassin 25 m` (artboard 24). Le seul lieu que le canevas nomme est le
 * bassin, et il le fait précéder de son établissement. Les six autres valeurs de
 * `WorkoutLocation` se nomment déjà toutes seules dans `LOCATION_LABELS` (« Eau libre »,
 * « Home-trainer », « Route »…) : rien n'est inventé pour elles.
 */
function icsLocation(location: WorkoutLocation | undefined): string | null {
  if (!location) return null
  const label = LOCATION_LABELS[location]
  if (location === 'pool_25m' || location === 'pool_50m') return `Piscine · ${label.toLowerCase()}`
  return label
}

/** `N · Z4 · Pyramide CSS 2 400 m` — code de discipline, zone, puis titre suivi de sa distance. */
function icsSummary(workout: Workout): string {
  const named = workout.distanceM
    ? `${workout.title} ${formatWorkoutDistance(workout.discipline, workout.distanceM)}`
    : workout.title
  return [workout.discipline as string, workout.zone, named].filter(Boolean).join(' · ')
}

/** `Éch. 400 m (12′)` — le déroulé de `describeBlocks`, abrégé comme l'artboard l'abrège. */
function icsDescription(workout: Workout): string[] {
  const lines = describeBlocks(workout.blocks, workout.discipline).map((row) => {
    const label = SHORT_BLOCK_LABEL[row.title] ?? row.title
    return `${[label, row.meta].filter(Boolean).join(' ')} (${row.durationLabel})`
  })
  // Dernière ligne de l'artboard : la phrase de preuve, sans sa source ni sa qualification —
  // l'agenda n'est pas l'endroit où l'on argumente, il rappelle d'où vient l'allure.
  if (workout.why) lines.push(workout.why.text)
  return lines
}

/** `Zoned Tri,Natation,Seuil` — l'app, la discipline, la zone quand la séance en porte une. */
function icsCategories(discipline: Discipline, workout: Workout): string[] {
  const categories = ['Zoned Tri', DISCIPLINE_LABELS[discipline]]
  if (workout.zone) categories.push(ZONE_LABELS[workout.zone])
  return categories
}

// --- Horodatage ----------------------------------------------------------------------------

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `HH:MM` → minutes depuis minuit. `null` si la chaîne n'a pas la forme attendue. */
function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function addDaysIso(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

/**
 * `20260825T063000` — horodatage LOCAL du fuseau déclaré par `TZID`, donc une heure d'horloge
 * murale et non un instant : aucune conversion à faire, et une séance qui déborde sur le
 * lendemain change de jour comme le ferait un calendrier.
 */
function localStamp(dateIso: string, minutesFromMidnight: number): string {
  const dayShift = Math.floor(minutesFromMidnight / 1440)
  const rest = minutesFromMidnight - dayShift * 1440
  const date = dayShift === 0 ? dateIso : addDaysIso(dateIso, dayShift)
  return `${date.replace(/-/g, '')}T${pad(Math.floor(rest / 60))}${pad(rest % 60)}00`
}

/** `20260820T104500Z` — le `DTSTAMP`, qui est un instant et s'écrit donc en UTC. */
function utcStamp(at: Date): string {
  return `${at.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
}

// --- Les événements --------------------------------------------------------------------------

/**
 * Un événement par séance, les séances d'une même journée enchaînées à partir de `startTime`.
 * Les séances annulées sont écartées : l'agenda ne reçoit que ce qui est encore prévu ou fait.
 */
export function buildIcsEvents(days: IcsDay[], options: IcsOptions = {}): IcsEvent[] {
  const startMinutes = parseClock(options.startTime ?? DEFAULT_START_TIME) ?? parseClock(DEFAULT_START_TIME)!
  const events: IcsEvent[] = []

  for (const day of days) {
    let cursor = startMinutes
    day.workouts.forEach((workout, index) => {
      if (workout.status === 'cancelled') return
      const durationMin = Math.max(1, Math.round(workout.durationMin))
      events.push({
        uid: `${day.date}-${index + 1}-${workout.id}@zonedtri.local`,
        startLocal: localStamp(day.date, cursor),
        endLocal: localStamp(day.date, cursor + durationMin),
        summary: icsSummary(workout),
        location: icsLocation(workout.location),
        description: icsDescription(workout),
        categories: icsCategories(workout.discipline, workout),
      })
      cursor += durationMin
    })
  }

  return events
}

// --- Sérialisation RFC 5545 -------------------------------------------------------------------

/** `\` `;` `,` et les sauts de ligne sont les quatre caractères que la RFC échappe dans un TEXT. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

const encoder = new TextEncoder()

/**
 * Pliage RFC 5545 §3.1 : au-delà de 75 octets, la ligne se poursuit sur la suivante, précédée
 * d'une espace — c'est exactement ce que montre la `DESCRIPTION` de l'artboard 24. Le découpage
 * compte des OCTETS et jamais des caractères, sinon un « é » se retrouverait coupé en deux.
 */
function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line

  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  let limit = 75

  for (const char of line) {
    const size = encoder.encode(char).length
    if (currentBytes + size > limit) {
      parts.push(current)
      current = ''
      currentBytes = 0
      // Les lignes de continuation consomment une colonne pour leur espace de tête.
      limit = 74
    }
    current += char
    currentBytes += size
  }
  parts.push(current)

  return parts.join('\r\n ')
}

function eventLines(event: IcsEvent, timeZone: string, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${timeZone}:${event.startLocal}`,
    `DTEND;TZID=${timeZone}:${event.endLocal}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ]
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.description.length > 0) {
    lines.push(`DESCRIPTION:${event.description.map(escapeText).join('\\n')}`)
  }
  lines.push(`CATEGORIES:${event.categories.map(escapeText).join(',')}`)
  // `STATUS:CONFIRMED` et rien d'autre : aucun `VALARM`, l'app ne pose pas de rappel (artboard 24).
  lines.push('STATUS:CONFIRMED')
  lines.push('END:VEVENT')
  return lines
}

/** Le fichier entier, terminaisons `CRLF` comme la RFC l'exige. */
export function renderIcs(events: IcsEvent[], options: IcsOptions = {}): string {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE
  const stamp = utcStamp(options.now ?? new Date())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zoned Tri//Plan//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => eventLines(event, timeZone, stamp)),
    'END:VCALENDAR',
  ]

  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

/** Le fichier d'un ensemble de journées, en un appel — c'est ce que branchent les écrans. */
export function buildIcs(days: IcsDay[], options: IcsOptions = {}): string {
  return renderIcs(buildIcsEvents(days, options), options)
}

/** `zonedtri-semaine-07.ics` (artboard 24). */
export function icsWeekFileName(weekNumber: number): string {
  return `zonedtri-semaine-${String(weekNumber).padStart(2, '0')}.ics`
}

/** `zonedtri-2026-08-25.ics` — l'export d'une seule journée (« Exporter la journée », 15). */
export function icsDayFileName(isoDate: string): string {
  return `zonedtri-${isoDate}.ics`
}

/**
 * Le premier `VEVENT` du fichier, pliage compris : c'est le bloc que l'artboard 24 donne à lire.
 * Sert l'aperçu du produit, pas l'écriture du fichier.
 */
export function firstEventBlock(ics: string): string {
  const lines = ics.split('\r\n')
  const start = lines.indexOf('BEGIN:VEVENT')
  if (start === -1) return ''
  const end = lines.indexOf('END:VEVENT', start)
  return lines.slice(start, end === -1 ? undefined : end + 1).join('\n')
}
