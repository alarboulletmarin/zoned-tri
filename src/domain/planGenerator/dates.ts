// Arithmétique de calendrier du générateur. Toutes les dates sont des jours ISO `YYYY-MM-DD`
// manipulés en UTC (jamais d'objet `Date` stocké), pour que « lundi » reste lundi quel que soit
// le fuseau de la machine. `weekdayIndex` et `todayIso` vivent déjà dans `planWeek.ts` : on les
// réexporte plutôt que d'en écrire une seconde version.

import { weekdayIndex } from '../planWeek'

export { todayIso, weekdayIndex } from '../planWeek'

const MS_PER_DAY = 86_400_000

export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

/** Nombre de jours de `fromIso` à `toIso` (négatif si `toIso` précède `fromIso`). */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / MS_PER_DAY)
}

/** Lundi de la semaine calendaire contenant `isoDate` (lui-même s'il est déjà un lundi). */
export function mondayOf(isoDate: string): string {
  return addDays(isoDate, -weekdayIndex(isoDate))
}

/**
 * Nombre de semaines de préparation entre aujourd'hui et la course, la semaine en cours comprise.
 *
 * On compte à partir du lundi de la semaine de `todayIso` : c'est le premier lundi du plan, donc
 * la semaine 1 contient toujours le jour courant et l'écran « Aujourd'hui » a quelque chose à
 * montrer dès la génération. Une course déjà passée donne 0.
 */
export function weeksUntilRace(todayIso: string, raceDateIso: string): number {
  const days = daysBetween(mondayOf(todayIso), raceDateIso)
  if (days < 0) return 0
  return Math.floor(days / 7) + 1
}

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** « 30 août 2026 ». */
export function formatLongDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** « 30 août » — sans l'année, pour les récapitulatifs serrés (canevas G6). */
export function formatDayMonthLong(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

/** « dimanche ». */
export function weekdayName(isoDate: string): string {
  return WEEKDAYS[weekdayIndex(isoDate)]
}
