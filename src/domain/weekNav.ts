/**
 * Navigation entre les semaines du plan — artboard 03, la barre ← → et le rail des 18 semaines.
 *
 * Avant, la Semaine ne montrait que la semaine en cours : rien ne permettait de regarder celle
 * d'avant ni celle d'après. Le canevas répond par trois choses, et ce module les dérive : la barre
 * de titre avec ses deux flèches, la ligne d'état (« semaine en cours » / « revenir à
 * aujourd'hui »), et le rail où les dix-huit semaines se comparent d'un coup d'œil.
 *
 * Rien n'est calculé dans l'écran : ni rang, ni pourcentage, ni libellé.
 */

import { PHASE_LABELS } from './planWeek'
import type { PlanWeek, TrainingPlan } from './types'

/** Une cellule du rail : un rang de semaine et sa charge, rapportée à la plus chargée du plan. */
export interface WeekRailCell {
  weekNumber: number
  /** Hauteur de la barre, 0-100, relative à la semaine la plus chargée du plan. */
  percent: number
  /** La semaine affichée à l'écran. */
  isSelected: boolean
  /** La semaine où tombe aujourd'hui — elle n'est pas forcément celle qu'on regarde. */
  isCurrent: boolean
}

export interface WeekNavView {
  /** « 24 → 30 août · bloc construction ». */
  rangeLabel: string
  /** « Semaine 07 ». */
  title: string
  /** « 8 h 10 planifiées · 7 / 18 ». */
  plannedLabel: string
  /** Rang de la semaine précédente / suivante, ou `undefined` aux deux bouts du plan. */
  previousWeek?: number
  nextWeek?: number
  /** « Semaine en cours » · « Semaine passée » · « Semaine à venir ». */
  stateLabel: string
  /** Rang de la semaine d'aujourd'hui — absent quand aujourd'hui tombe hors du plan. */
  currentWeekNumber?: number
  /** Vrai quand la semaine affichée est déjà celle d'aujourd'hui : le retour n'a rien à faire. */
  isCurrent: boolean
  rail: WeekRailCell[]
  /** « glisse pour parcourir les 18 semaines ». */
  railHint: string
}

const MONTH_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

export interface BuildWeekNavOptions {
  plan: TrainingPlan
  /** Semaine affichée. */
  week: PlanWeek
  today: string
  /**
   * Volume réellement résolu contre le catalogue, en minutes. L'écran le connaît déjà (c'est le
   * chiffre de son titre) ; on ne recalcule pas à partir de `PlanWeek.totalVolumeMin`, sans quoi
   * la barre annoncerait un volume que la liste des jours ne montre pas.
   */
  plannedMin: number
}

export function buildWeekNav({ plan, week, today, plannedMin }: BuildWeekNavOptions): WeekNavView {
  const ordered = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  const index = ordered.findIndex((candidate) => candidate.weekNumber === week.weekNumber)

  const current = ordered.find((candidate) => candidate.days.some((day) => day.date === today))
  const isCurrent = current?.weekNumber === week.weekNumber

  const maxVolume = ordered.reduce((max, candidate) => Math.max(max, candidate.totalVolumeMin), 0)

  return {
    rangeLabel: buildRangeLabel(week),
    title: `Semaine ${pad(week.weekNumber)}`,
    plannedLabel: `${formatHours(plannedMin)} planifiées · ${week.weekNumber} / ${plan.weeksCount}`,
    ...(index > 0 ? { previousWeek: ordered[index - 1].weekNumber } : {}),
    ...(index >= 0 && index < ordered.length - 1 ? { nextWeek: ordered[index + 1].weekNumber } : {}),
    stateLabel: buildStateLabel(week, today, isCurrent),
    ...(current ? { currentWeekNumber: current.weekNumber } : {}),
    isCurrent,
    rail: ordered.map((candidate) => ({
      weekNumber: candidate.weekNumber,
      percent: maxVolume > 0 ? (candidate.totalVolumeMin / maxVolume) * 100 : 0,
      isSelected: candidate.weekNumber === week.weekNumber,
      isCurrent: candidate.weekNumber === current?.weekNumber,
    })),
    railHint: `glisse pour parcourir les ${ordered.length} semaines`,
  }
}

/** « 24 → 30 août · bloc construction ». Le mois n'est écrit qu'une fois quand il ne change pas. */
function buildRangeLabel(week: PlanWeek): string {
  const first = week.days[0]?.date
  const last = week.days[week.days.length - 1]?.date
  if (!first || !last) return PHASE_LABELS[week.phase] ?? week.phase

  const firstMonth = Number(first.slice(5, 7))
  const lastMonth = Number(last.slice(5, 7))
  const range =
    firstMonth === lastMonth
      ? `${dayOf(first)} → ${dayOf(last)} ${MONTH_SHORT[lastMonth - 1]}`
      : `${dayOf(first)} ${MONTH_SHORT[firstMonth - 1]} → ${dayOf(last)} ${MONTH_SHORT[lastMonth - 1]}`

  const phase = PHASE_LABELS[week.phase]
  const blocked = week.blockedReason ? ' · semaine bloquée' : ''
  return phase ? `${range} · ${phase}${blocked}` : `${range}${blocked}`
}

function buildStateLabel(week: PlanWeek, today: string, isCurrent: boolean): string {
  if (isCurrent) return 'Semaine en cours'
  const last = week.days[week.days.length - 1]?.date ?? ''
  return last < today ? 'Semaine passée' : 'Semaine à venir'
}

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** « 8 h 10 » — mêmes règles d'écriture que partout ailleurs, arrondi compris. */
function formatHours(rawMinutes: number): string {
  const minutes = Math.round(rawMinutes)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}
