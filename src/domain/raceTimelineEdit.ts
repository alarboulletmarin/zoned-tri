import type { Race, RaceTimelineEvent, RaceTimelinePhase } from './types'

/**
 * Écrire le déroulé du jour J — le dernier écran de la section Courses qui ne se remplissait pas.
 *
 * L'artboard 11 dessine deux blocs : « La veille » et « À rebours du départ ». Le modèle porte bien
 * `Race.timeline`, `buildRaceIcs` sait l'exporter en agenda, `RaceDayScreen` sait l'afficher — mais
 * AUCUN écran ne savait l'écrire. Le déroulé n'existait donc que dans le jeu de démonstration : sur
 * un appareil réel, « Timeline du jour J » était éteint pour toujours, et l'export `.ICS` d'une
 * course, pourtant écrit et testé, était du code mort.
 *
 * Rien n'est proposé par défaut au-delà de ce que l'utilisateur a déjà saisi : un déroulé de course
 * dépend du dossard, du parc, du trajet — l'app n'a aucun moyen de le deviner (règle nº 4).
 */
export interface TimelineRow {
  /** Clé de rendu, propre à la session d'édition : le modèle n'a pas d'identifiant d'événement. */
  key: string
  at: string
  label: string
  detail: string
  phase: RaceTimelinePhase
  isStart: boolean
}

let counter = 0

export function newRowKey(): string {
  counter += 1
  return `row-${counter}`
}

export function rowsFromRace(race: Race): TimelineRow[] {
  const timeline = race.timeline ?? []
  if (timeline.length > 0) {
    return timeline.map((event) => ({
      key: newRowKey(),
      at: event.at,
      label: event.label,
      detail: event.detail ?? '',
      phase: event.phase,
      isStart: event.isStart === true,
    }))
  }

  // Rien à reprendre — sauf l'heure de départ, que la fiche de course porte peut-être déjà. Ce
  // n'est pas une invention : c'est la valeur que l'utilisateur a saisie, posée là où elle va.
  if (race.startTime) {
    return [
      { key: newRowKey(), at: race.startTime, label: 'Départ', detail: '', phase: 'race_day', isStart: true },
    ]
  }

  return []
}

export function emptyRow(phase: RaceTimelinePhase): TimelineRow {
  return { key: newRowKey(), at: '', label: '', detail: '', phase, isStart: false }
}

export type TimelineRowErrors = Partial<Record<'at' | 'label', string>>

export function validateRow(row: TimelineRow): TimelineRowErrors {
  const errors: TimelineRowErrors = {}
  if (!/^\d{2}:\d{2}$/.test(row.at)) errors.at = 'hh:mm attendu'
  if (row.label.trim() === '') errors.label = 'un repère se nomme'
  return errors
}

export function rowsAreValid(rows: TimelineRow[]): boolean {
  return rows.every((row) => Object.keys(validateRow(row)).length === 0)
}

const PHASE_ORDER: RaceTimelinePhase[] = ['eve', 'race_day']

/**
 * Le déroulé enregistré : trié par phase puis par heure, parce que `buildRaceIcs` borne chaque
 * événement par le SUIVANT dans le tableau — un tableau désordonné produirait des durées négatives.
 */
export function timelineFromRows(rows: TimelineRow[]): RaceTimelineEvent[] {
  return [...rows]
    .sort((a, b) => {
      const phase = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
      return phase !== 0 ? phase : a.at.localeCompare(b.at)
    })
    .map((row) => {
      const event: RaceTimelineEvent = { label: row.label.trim(), at: row.at, phase: row.phase }
      if (row.detail.trim() !== '') event.detail = row.detail.trim()
      if (row.isStart) event.isStart = true
      return event
    })
}

/** Un seul départ : cocher une ligne décoche les autres, comme un choix unique. */
export function markStart(rows: TimelineRow[], key: string): TimelineRow[] {
  return rows.map((row) => ({ ...row, isStart: row.key === key ? !row.isStart : false }))
}
