import type { Race, RaceTimelineEvent } from '../types'
import { renderIcs, type IcsEvent, type IcsOptions } from './icsFile'

/**
 * Le jour J dans l'agenda — la timeline de l'artboard 11, un événement par ligne.
 *
 * L'écran « Jour J » portait une puce `.ICS` grise sous « Bientôt disponible », alors que le
 * moteur d'agenda existe depuis la reprise de l'artboard 24 : il ne manquait qu'un lecteur de
 * timeline. Aucun format n'est réinventé — `renderIcs` écrit le fichier, avec ses conventions
 * (heure locale sans `Z`, pliage RFC 5545, fuseau par défaut).
 *
 * Ce que le fichier NE contient pas : une durée devinée. Le modèle ne porte que l'heure de chaque
 * repère, jamais sa longueur. Chaque événement dure donc jusqu'au repère suivant, et le dernier —
 * l'arrivée, le plus souvent — prend quinze minutes, la plus petite valeur qui reste lisible dans
 * un agenda. C'est écrit dans sa description plutôt que laissé à deviner.
 */
const LAST_EVENT_MIN = 15

/** Repères de la veille : le canevas les range sous la phase `eve`, ils tombent la veille au soir. */
function eventDate(race: Race, event: RaceTimelineEvent): string {
  if (event.phase !== 'eve') return race.date
  const [year, month, day] = race.date.split('-').map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1))
  return previous.toISOString().slice(0, 10)
}

function toLocal(isoDate: string, time: string): string {
  return `${isoDate.replace(/-/g, '')}T${time.replace(':', '')}00`
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  const wrapped = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

export function buildRaceIcsEvents(race: Race): IcsEvent[] {
  const timeline = race.timeline ?? []
  if (timeline.length === 0) return []

  return timeline.map((event, index) => {
    const date = eventDate(race, event)
    const next = timeline[index + 1]
    // Le repère suivant borne celui-ci — mais seulement s'il tombe le même jour : un repère de la
    // veille ne dure pas jusqu'au lendemain matin.
    const sameDay = next !== undefined && eventDate(race, next) === date
    const end = sameDay ? next.at : addMinutes(event.at, LAST_EVENT_MIN)

    return {
      uid: `${date}-${index + 1}-${race.id}@zonedtri.local`,
      startLocal: toLocal(date, event.at),
      endLocal: toLocal(date, end),
      summary: event.isStart ? `${race.name} — départ` : `${race.name} — ${event.label}`,
      location: null,
      description: [
        event.detail,
        sameDay ? null : `Repère de ${LAST_EVENT_MIN} min : le modèle ne porte que l’heure, pas la durée.`,
      ].filter((line): line is string => Boolean(line)),
      categories: ['Zoned Tri', 'Course'],
    }
  })
}

/** `null` quand la course ne porte aucune timeline : il n'y a rien à mettre dans un agenda. */
export function buildRaceIcs(race: Race, options: IcsOptions = {}): string | null {
  const events = buildRaceIcsEvents(race)
  if (events.length === 0) return null
  return renderIcs(events, options)
}

/** `zonedtri-course-2026-11-08.ics`. */
export function raceIcsFileName(race: Race): string {
  return `zonedtri-course-${race.date}.ics`
}
