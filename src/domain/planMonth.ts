/**
 * Vue Mois — artboard 04m, « le niveau qui manquait entre la semaine et la saison ».
 *
 * Le mois montre, il n'arbitre pas : la note de l'artboard le dit en toutes lettres — « le mois ne
 * se modifie pas ici ». Ce module ne fait donc que dériver, et n'écrit rien.
 *
 * Deux blocs en sortent : la grille calendaire, qui répond à « quand est-ce que je m'entraîne »,
 * et les lignes de semaine, qui répondent à « combien ». Les jours hors du plan restent dans la
 * grille — un mois amputé de ses bords ne se lit pas — mais s'annoncent comme tels.
 */

import { addDays, mondayOf } from './planGenerator/dates'
import { DISCIPLINE_ORDER, PHASE_LABELS } from './planWeek'
import type { Discipline, PlanWeek, Race, TrainingPlan, Workout } from './types'

/** Une case de la grille : un jour du calendrier, dans le plan ou non. */
export interface MonthDay {
  date: string
  /** Numéro du jour dans son mois — le seul chiffre que l'artboard écrit. */
  dayOfMonth: number
  /** Hors du mois affiché : les débords de la première et de la dernière ligne. */
  outsideMonth: boolean
  /**
   * Les disciplines du jour, dans l'ordre des séances — `['C', 'C']` pour deux courses, `['C', 'V']`
   * pour une course puis un vélo. Vide pour un jour sans séance : l'artboard y écrit un tiret.
   *
   * Une seule pastille par case cachait le second entraînement d'un jour doublé, alors que c'est
   * précisément ce qu'on vient vérifier sur un calendrier.
   */
  disciplines: Discipline[]
  /** Discipline dominante — celle qui porte le plus de minutes. Sert au repli et aux tests. */
  discipline: Discipline | null
  /** Plusieurs séances le même jour (jour doublé). */
  doubled: boolean
  isToday: boolean
  /** Le jour tombe hors des dates du plan : rien à y montrer, et on le dit. */
  outsidePlan: boolean
  /** Rang de la semaine du plan qui contient ce jour — la destination de l'appui. */
  weekNumber?: number
}

/** Une ligne du bloc « Charge par semaine · appui pour ouvrir ». */
export interface MonthWeekRow {
  weekNumber: number
  /** « S07 ». */
  label: string
  /** « 8 h 10 ». */
  volumeLabel: string
  /** « 24 → 30 août ». */
  rangeLabel: string
  /** « faite » · « en cours » · « à venir », plus « relâche » quand la semaine est allégée. */
  statusLabel: string
  /** Part de la semaine la plus chargée du mois — la petite jauge de 58 px de l'artboard. */
  volumePercent: number
  isCurrent: boolean
}

/** Une part de la frise de répartition, en tête de l'écran (14 px entre deux filets). */
export interface MonthShare {
  discipline: Discipline
  percent: number
}

export interface PlanMonthView {
  /** « Août 2026 ». */
  monthLabel: string
  /** « Semaines 03 → 07 · bloc construction ». */
  spanLabel: string
  /** « 5 semaines · 34 h 15 · 24 séances en août ». */
  totalsLabel: string
  /** Premier jour du mois précédent / suivant, ou `undefined` quand le plan s'arrête là. */
  previousMonth?: string
  nextMonth?: string
  days: MonthDay[]
  weeks: MonthWeekRow[]
  /** Répartition N / V / C sur le mois, pour la frise de 14 px. */
  shares: MonthShare[]
  /** « aucune course en août · 70.3 Vichy le 9 nov. » — l'artboard l'écrit sous la grille. */
  raceNote: string
}

const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const MONTH_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

/** Semaine allégée : moins de 85 % du volume moyen des semaines du mois. */
const RECOVERY_RATIO = 0.85

export interface BuildPlanMonthOptions {
  plan: TrainingPlan
  /** Catalogue où retrouver les séances référencées par les jours du plan. */
  catalogue: Workout[]
  /** Jour courant, injecté par les tests. */
  today: string
  /** Mois affiché : n'importe quel jour du mois voulu. Par défaut, celui d'aujourd'hui. */
  anchor?: string
  /** Toutes les courses connues — la note sous la grille les nomme. */
  races?: Race[]
}

export function buildPlanMonthView({
  plan,
  catalogue,
  today,
  anchor,
  races = [],
}: BuildPlanMonthOptions): PlanMonthView {
  const reference = anchor ?? today
  const [year, month] = splitIso(reference)

  const byDate = indexPlanDays(plan)
  const workoutsById = new Map(catalogue.map((workout) => [workout.id, workout]))

  const days = buildGrid(year, month, { byDate, workoutsById, plan, today })
  const weeks = weeksTouching(plan, year, month)

  const maxVolume = weeks.reduce((max, week) => Math.max(max, week.totalVolumeMin), 0)

  return {
    monthLabel: `${capitalize(MONTH_NAMES[month - 1])} ${year}`,
    spanLabel: buildSpanLabel(weeks),
    totalsLabel: buildTotalsLabel(weeks, year, month, byDate, workoutsById),
    ...neighbourMonths(plan, year, month),
    days,
    weeks: weeks.map((week) => toWeekRow(week, weeks, today, maxVolume)),
    shares: buildShares(year, month, byDate, workoutsById),
    raceNote: buildRaceNote(races, year, month),
  }
}

/** Frise de répartition : les trois disciplines du triathlon, en part des minutes du mois. */
function buildShares(
  year: number,
  month: number,
  byDate: Map<string, { week: PlanWeek; workoutIds: string[] }>,
  workoutsById: Map<string, Workout>,
): MonthShare[] {
  const prefix = `${isoMonth(year, month)}-`
  const minutes = new Map<Discipline, number>()

  for (const [date, entry] of byDate) {
    if (!date.startsWith(prefix)) continue
    for (const id of entry.workoutIds) {
      const workout = workoutsById.get(id)
      if (!workout || workout.discipline === 'R') continue
      minutes.set(workout.discipline, (minutes.get(workout.discipline) ?? 0) + workout.durationMin)
    }
  }

  const total = [...minutes.values()].reduce((sum, value) => sum + value, 0)
  if (total === 0) return []

  return (['N', 'V', 'C'] as const)
    .map((discipline) => ({ discipline, percent: ((minutes.get(discipline) ?? 0) / total) * 100 }))
    .filter((share) => share.percent > 0)
}

// --- Grille ---------------------------------------------------------------------------------

interface GridContext {
  byDate: Map<string, { week: PlanWeek; workoutIds: string[] }>
  workoutsById: Map<string, Workout>
  plan: TrainingPlan
  today: string
}

/**
 * Six lignes au plus, de lundi à dimanche, débords compris : le canevas dessine le mois d'août
 * 2026 sur cinq lignes commençant au 27 juillet. On ne coupe jamais une semaine en deux.
 */
function buildGrid(year: number, month: number, context: GridContext): MonthDay[] {
  const firstOfMonth = isoOf(year, month, 1)
  const start = mondayOf(firstOfMonth)
  const lastOfMonth = isoOf(year, month, daysInMonth(year, month))
  const end = addDays(mondayOf(lastOfMonth), 6)

  const days: MonthDay[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const entry = context.byDate.get(date)
    const workouts = (entry?.workoutIds ?? [])
      .map((id) => context.workoutsById.get(id))
      .filter((workout): workout is Workout => workout !== undefined)
      .filter((workout) => workout.discipline !== 'R')

    days.push({
      date,
      dayOfMonth: Number(date.slice(8, 10)),
      outsideMonth: !date.startsWith(`${isoMonth(year, month)}-`),
      disciplines: workouts.map((workout) => workout.discipline),
      discipline: dominant(workouts),
      doubled: workouts.length > 1,
      isToday: date === context.today,
      outsidePlan: date < context.plan.startDate || date > context.plan.endDate,
      ...(entry ? { weekNumber: entry.week.weekNumber } : {}),
    })
  }
  return days
}

/** Discipline du jour : celle qui porte le plus de minutes, `DISCIPLINE_ORDER` départageant. */
function dominant(workouts: Workout[]): Discipline | null {
  if (workouts.length === 0) return null

  const minutes = new Map<Discipline, number>()
  for (const workout of workouts) {
    minutes.set(workout.discipline, (minutes.get(workout.discipline) ?? 0) + workout.durationMin)
  }

  let best: Discipline | null = null
  for (const discipline of DISCIPLINE_ORDER) {
    const value = minutes.get(discipline)
    if (value === undefined) continue
    if (best === null || value > (minutes.get(best) ?? 0)) best = discipline
  }
  return best
}

// --- Semaines -------------------------------------------------------------------------------

/** Les semaines du plan qui touchent le mois, dans l'ordre — celles des lignes « S03 … S07 ». */
function weeksTouching(plan: TrainingPlan, year: number, month: number): PlanWeek[] {
  const prefix = `${isoMonth(year, month)}-`
  return plan.weeks
    .filter((week) => week.days.some((day) => day.date.startsWith(prefix)))
    .sort((a, b) => a.weekNumber - b.weekNumber)
}

function toWeekRow(
  week: PlanWeek,
  all: PlanWeek[],
  today: string,
  maxVolume: number,
): MonthWeekRow {
  const first = week.days[0]?.date ?? ''
  const last = week.days[week.days.length - 1]?.date ?? first
  const isCurrent = week.days.some((day) => day.date === today)

  return {
    weekNumber: week.weekNumber,
    label: `S${String(week.weekNumber).padStart(2, '0')}`,
    volumeLabel: formatHours(week.totalVolumeMin),
    rangeLabel: `${formatDayMonthShort(first)} → ${formatDayMonthShort(last)}`,
    statusLabel: statusOf(week, all, today, isCurrent),
    volumePercent: maxVolume > 0 ? (week.totalVolumeMin / maxVolume) * 100 : 0,
    isCurrent,
  }
}

function statusOf(week: PlanWeek, all: PlanWeek[], today: string, isCurrent: boolean): string {
  const last = week.days[week.days.length - 1]?.date ?? ''
  const base = isCurrent ? 'en cours' : last < today ? 'faite' : 'à venir'

  if (week.blockedReason) return `${base} · bloquée`

  const average = all.reduce((sum, item) => sum + item.totalVolumeMin, 0) / Math.max(1, all.length)
  return week.totalVolumeMin < average * RECOVERY_RATIO ? `${base} · relâche` : base
}

// --- Libellés -------------------------------------------------------------------------------

function buildSpanLabel(weeks: PlanWeek[]): string {
  if (weeks.length === 0) return 'aucune semaine du plan ce mois-ci'

  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  const range =
    first.weekNumber === last.weekNumber
      ? `Semaine ${pad(first.weekNumber)}`
      : `Semaines ${pad(first.weekNumber)} → ${pad(last.weekNumber)}`

  // Le canevas nomme UNE phase sous le mois. Quand le mois en chevauche deux, on nomme celle qui
  // porte le plus de semaines : annoncer les deux mentirait sur ce que le mois montre en majorité.
  const counts = new Map<string, number>()
  for (const week of weeks) counts.set(week.phase, (counts.get(week.phase) ?? 0) + 1)
  const dominantPhase = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const phaseLabel = dominantPhase ? PHASE_LABELS[dominantPhase] : undefined

  return phaseLabel ? `${range} · ${phaseLabel}` : range
}

function buildTotalsLabel(
  weeks: PlanWeek[],
  year: number,
  month: number,
  byDate: Map<string, { week: PlanWeek; workoutIds: string[] }>,
  workoutsById: Map<string, Workout>,
): string {
  const prefix = `${isoMonth(year, month)}-`

  let minutes = 0
  let sessions = 0
  for (const [date, entry] of byDate) {
    if (!date.startsWith(prefix)) continue
    for (const id of entry.workoutIds) {
      const workout = workoutsById.get(id)
      if (!workout || workout.discipline === 'R') continue
      minutes += workout.durationMin
      sessions += 1
    }
  }

  const weekWord = weeks.length > 1 ? 'semaines' : 'semaine'
  const sessionWord = sessions > 1 ? 'séances' : 'séance'
  return `${weeks.length} ${weekWord} · ${formatHours(minutes)} · ${sessions} ${sessionWord} en ${MONTH_NAMES[month - 1]}`
}

/**
 * La note sous la grille. Elle nomme les courses du mois, et à défaut la prochaine course à venir
 * — c'est ce que fait l'artboard : « aucune course en août · 70.3 Vichy le 9 nov. ».
 */
function buildRaceNote(races: Race[], year: number, month: number): string {
  const prefix = `${isoMonth(year, month)}-`
  const monthName = MONTH_NAMES[month - 1]

  const inMonth = races.filter((race) => race.date.startsWith(prefix))
  if (inMonth.length > 0) {
    return inMonth.map((race) => `${race.name} le ${formatDayMonthShort(race.date)}`).join(' · ')
  }

  const firstOfNextMonth = isoOf(year, month, daysInMonth(year, month))
  const upcoming = races
    .filter((race) => race.date > firstOfNextMonth)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  if (!upcoming) return `aucune course en ${monthName}`
  return `aucune course en ${monthName} · ${upcoming.name} le ${formatDayMonthShort(upcoming.date)}`
}

/** Mois voisins, bornés aux dates du plan : le canevas n'ouvre pas de mois vide. */
function neighbourMonths(
  plan: TrainingPlan,
  year: number,
  month: number,
): { previousMonth?: string; nextMonth?: string } {
  const previous = month === 1 ? isoOf(year - 1, 12, 1) : isoOf(year, month - 1, 1)
  const next = month === 12 ? isoOf(year + 1, 1, 1) : isoOf(year, month + 1, 1)

  const previousEnd = isoOf(...lastDayOf(previous))
  const nextStart = next

  return {
    ...(previousEnd >= plan.startDate ? { previousMonth: previous } : {}),
    ...(nextStart <= plan.endDate ? { nextMonth: next } : {}),
  }
}

// --- Utilitaires de date --------------------------------------------------------------------

function indexPlanDays(plan: TrainingPlan): Map<string, { week: PlanWeek; workoutIds: string[] }> {
  const index = new Map<string, { week: PlanWeek; workoutIds: string[] }>()
  for (const week of plan.weeks) {
    for (const day of week.days) index.set(day.date, { week, workoutIds: day.workoutIds })
  }
  return index
}

function splitIso(iso: string): [number, number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))]
}

function isoMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function isoOf(year: number, month: number, day: number): string {
  return `${isoMonth(year, month)}-${String(day).padStart(2, '0')}`
}

function lastDayOf(iso: string): [number, number, number] {
  const [year, month] = splitIso(iso)
  return [year, month, daysInMonth(year, month)]
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function formatDayMonthShort(iso: string): string {
  const [, month, day] = splitIso(iso)
  return `${day} ${MONTH_SHORT[month - 1]}`
}

/**
 * « 8 h 10 », « 34 h 15 » — la même écriture que le reste du produit.
 *
 * Le générateur répartit le volume en minutes fractionnaires ; on arrondit ici, une seule fois,
 * plutôt que de laisser « 28 h 21,299999 » remonter jusqu'à l'écran.
 */
function formatHours(rawMinutes: number): string {
  const minutes = Math.round(rawMinutes)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
