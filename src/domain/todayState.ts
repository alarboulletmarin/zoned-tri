// Dérivation de l'écran « Aujourd'hui » (artboards 02 · normal, 02a · jour de repos,
// 02b · séance faite, 02c · semaine bloquée, 15 · deux séances le même jour).
//
// Pures fonctions, aucune dépendance React : l'écran ne décide de rien, il rend l'état
// que cette union discriminée lui donne. Rien n'est inventé — chaque libellé se dérive
// d'un champ existant du modèle, et un champ absent produit une absence, pas un zéro.

import type {
  Discipline,
  EvidenceNoteData,
  PlanWeek,
  TrainingPlan,
  Workout,
} from './types'
import {
  DAY_SHORT_LABELS,
  buildWeekDays,
  computeDisciplineShares,
  findCurrentWeek,
  firstTargetLabel,
  weekdayIndex,
  workoutSubDetail,
  type DisciplineShare,
} from './planWeek'
import { DAY_LABELS } from './weekContext'
import { buildTimelineBars, type TimelineBar } from './workoutBlocks'
import { LOCATION_LABELS, ZONE_LABELS, formatDistanceM, formatDurationMin, formatMeters } from './workoutFormat'

/** Mois en toutes lettres : tableau explicite plutôt que `toLocaleDateString`, pour que la
 * mise en forme ne dépende pas des données ICU disponibles dans l'environnement. */
const MONTH_LABELS = [
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
] as const

/** Rang d'une séance dans la journée (artboard 15 : « 1 / 2 · première »). */
const ORDINAL_LABELS = ['première', 'seconde', 'troisième', 'quatrième', 'cinquième'] as const

const MS_PER_DAY = 24 * 60 * 60 * 1000

// --- Aides de mise en forme ------------------------------------------------------------

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** `2026-08-25` → `{ dayName: 'Mardi', dayDate: '25 août' }` (titre du jour sur deux lignes). */
export function formatDayHeading(isoDate: string): { dayName: string; dayDate: string } {
  const monthIndex = Number(isoDate.slice(5, 7)) - 1
  const dayNumber = Number(isoDate.slice(8, 10))
  return {
    dayName: capitalize(DAY_LABELS[weekdayIndex(isoDate)]),
    dayDate: `${dayNumber} ${MONTH_LABELS[monthIndex]}`,
  }
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.round((to - from) / MS_PER_DAY)
}

/** « demain », « après-demain », « dans 4 jours » — relatif au jour courant. */
export function formatRelativeDay(todayIso: string, targetIso: string): string {
  const delta = daysBetween(todayIso, targetIso)
  if (delta <= 0) return 'aujourd’hui'
  if (delta === 1) return 'demain'
  if (delta === 2) return 'après-demain'
  return `dans ${delta} jours`
}

/**
 * « il y a 2 h » de l'artboard 02b. Les minutes tant qu'on est sous l'heure, les heures
 * jusqu'à deux jours, les jours ensuite : la précision suit l'échelle, elle ne l'invente pas.
 */
export function formatRelativeSince(completedAtIso: string, now: Date): string {
  const elapsedMin = Math.floor((now.getTime() - new Date(completedAtIso).getTime()) / 60000)
  if (elapsedMin < 1) return 'à l’instant'
  if (elapsedMin < 60) return `il y a ${elapsedMin} min`
  const elapsedHours = Math.floor(elapsedMin / 60)
  if (elapsedHours < 48) return `il y a ${elapsedHours} h`
  return `il y a ${Math.floor(elapsedHours / 24)} j`
}

/** Distance d'une séance : la natation se compte en mètres jusqu'au bout (cf. `workoutSubDetail`). */
function formatWorkoutDistance(workout: Workout): string | null {
  if (!workout.distanceM) return null
  return workout.discipline === 'N' ? formatMeters(workout.distanceM) : formatDistanceM(workout.distanceM)
}

/** Ligne de métadonnées sous le titre : distance · durée · cible. Uniquement des champs présents. */
export function sessionMeta(workout: Workout): string {
  const parts: string[] = []
  const distance = formatWorkoutDistance(workout)
  if (distance) parts.push(distance)
  parts.push(formatDurationMin(workout.durationMin))
  const target = firstTargetLabel(workout)
  if (target) parts.push(target)
  return parts.join(' · ')
}

/** Ligne de contexte à côté des pastilles : zone nommée · lieu (artboard 02 « Seuil · bassin 25 m »). */
export function sessionContextLabel(workout: Workout): string {
  const parts: string[] = []
  if (workout.zone) parts.push(ZONE_LABELS[workout.zone])
  if (workout.location) parts.push(LOCATION_LABELS[workout.location])
  return parts.join(' · ')
}

// --- Séances à venir --------------------------------------------------------------------

export interface UpcomingSession {
  key: string
  workoutId: string
  discipline: Discipline
  title: string
  /** `MER`, `JEU`, `SAM` — colonne de droite des listes. */
  dayLabel: string
  /** `demain · 2 h 30 · 68 km` — sous-ligne chiffrée, sous un titre déjà affiché (artboard 02b). */
  subline: string
  /** `demain · 2 h 30 · longue allure 70.3` — ligne autonome de l'encart « Ce que ça prépare ». */
  headline: string
  date: string
}

function toUpcoming(workout: Workout, date: string, todayIso: string, index: number): UpcomingSession {
  const detail = workoutSubDetail(workout)
  const relative = formatRelativeDay(todayIso, date)
  const duration = formatDurationMin(workout.durationMin)
  const subline = [relative, duration, detail].filter(Boolean).join(' · ')
  const headline = [relative, duration, workout.title.toLowerCase()].join(' · ')
  return {
    headline,
    key: `${date}-${workout.id}-${index}`,
    workoutId: workout.id,
    discipline: workout.discipline,
    title: workout.title,
    dayLabel: DAY_SHORT_LABELS[weekdayIndex(date)].toUpperCase(),
    subline,
    date,
  }
}

// --- Cartes de la journée ---------------------------------------------------------------

export interface TodaySessionCard {
  workout: Workout
  /** `1 / 2 · première` — absent quand la journée ne porte qu'une séance. */
  positionLabel: string | null
  /** `Séance clé` / `Enchaînement` — absent quand la journée ne porte qu'une séance. */
  roleLabel: string | null
  contextLabel: string
  meta: string
  bars: TimelineBar[]
  why: EvidenceNoteData | null
}

export interface TodayDoneStat {
  /** Toujours `—` : le modèle ne porte aucune donnée réalisée, rien n'est estimé à sa place. */
  value: string
  label: string
}

export interface TodayDoneCard {
  workout: Workout
  contextLabel: string
  meta: string
  sinceLabel: string | null
  stats: TodayDoneStat[]
}

const AVERAGE_STAT_LABEL: Record<Discipline, string> = {
  N: '/100 moyen',
  V: 'puissance moyenne',
  C: 'allure moyenne',
  R: 'intensité moyenne',
}

function buildDoneStats(workout: Workout): TodayDoneStat[] {
  return [
    { value: '—', label: AVERAGE_STAT_LABEL[workout.discipline] },
    { value: '—', label: 'dérive' },
    { value: '—', label: 'cardio, non porté' },
  ]
}

// --- États ------------------------------------------------------------------------------

export interface TodayHeader {
  weekNumber: number
  /** `Semaine 07 / 18`, suffixé `· en pause` quand la semaine est bloquée. */
  weekLabel: string
  dayName: string
  dayDate: string
  /** Coin haut droit : volume hebdo, ou nombre de séances du jour quand il y en a plusieurs. */
  headerRight: { label: string; emphasis: boolean }
  /** Parts disciplinaires de la barre 14 px ; vide quand la semaine est en pause (barre hachurée). */
  shares: DisciplineShare[]
  paused: boolean
  /** Identifiants du plan absents du catalogue : signalés, jamais masqués. */
  missingWorkoutIds: string[]
}

export interface TodaySessionsView extends TodayHeader {
  kind: 'sessions'
  cards: TodaySessionCard[]
  /** `3 h 05 cumulées` — uniquement quand la journée porte plusieurs séances. */
  totalLabel: string | null
  /** Mention d'enchaînement quand une séance du jour est un brick. */
  brickNote: string | null
  /** Note de preuve de l'enchaînement (artboard 15 · « Pourquoi les deux le même jour »). */
  brickWhy: EvidenceNoteData | null
  rest: UpcomingSession[]
}

export interface TodayRestDayView extends TodayHeader {
  kind: 'rest_day'
  restLabel: string
  /** Encart pointillé « Ce que ça prépare » : les deux prochaines séances de la semaine. */
  prepares: UpcomingSession[]
  rest: UpcomingSession[]
}

export interface TodayAllDoneView extends TodayHeader {
  kind: 'all_done'
  done: TodayDoneCard[]
  next: UpcomingSession[]
}

export interface TodayWeekPausedView extends TodayHeader {
  kind: 'week_paused'
  reason: string
  /** `depuis lundi` — le blocage porte sur la semaine entière, il commence donc à son premier jour. */
  sinceLabel: string
  /** Encart jaune « Ce qui se passe à la reprise ». */
  resumeLines: string[]
  firstWaiting: UpcomingSession | null
  otherWaitingCount: number
  canBlockMore: boolean
}

/** Aujourd'hui tombe hors des dates du plan : la section Plan n'a rien à dire, l'ouverture répond. */
export interface TodayOutOfRangeView {
  kind: 'out_of_range'
}

export type TodayView =
  | TodaySessionsView
  | TodayRestDayView
  | TodayAllDoneView
  | TodayWeekPausedView
  | TodayOutOfRangeView

// --- Construction ------------------------------------------------------------------------

/**
 * Semaine du plan contenant réellement `todayIso`, ou rien.
 *
 * `findCurrentWeek` retombe sur la première semaine du plan quand aucune ne contient le jour :
 * ce repli convient à la vue « semaine », pas ici — un jour hors plan n'est pas « aujourd'hui ».
 * `PlanRoute` s'appuie sur ce même prédicat pour renvoyer à l'ouverture.
 */
export function currentWeekOf(plan: TrainingPlan, todayIso: string): PlanWeek | undefined {
  const week = findCurrentWeek(plan, todayIso)
  if (!week || !week.days.some((day) => day.date === todayIso)) return undefined
  return week
}

function nextWeek(plan: TrainingPlan, week: PlanWeek): PlanWeek | undefined {
  return plan.weeks.find((candidate) => candidate.weekNumber === week.weekNumber + 1)
}

function positionLabel(index: number, total: number): string {
  const ordinal = ORDINAL_LABELS[index] ?? `${index + 1}ᵉ`
  return `${index + 1} / ${total} · ${ordinal}`
}

function roleLabel(workout: Workout, index: number): string | null {
  if (workout.isBrick) return 'Enchaînement'
  if (index === 0) return 'Séance clé'
  return null
}

/**
 * Vue de l'écran « Aujourd'hui ».
 *
 * `todayIso` et `now` sont injectés pour garder la fonction pure et testable : le jour sert à
 * localiser la semaine et les échéances, l'horloge à dater le « il y a 2 h » d'une séance faite.
 */
export function buildTodayView(
  plan: TrainingPlan,
  catalogue: Workout[],
  todayIso: string,
  now: Date,
): TodayView {
  const week = currentWeekOf(plan, todayIso)
  if (!week) return { kind: 'out_of_range' }

  const days = buildWeekDays(week, catalogue, todayIso)
  const today = days.find((day) => day.date === todayIso)
  if (!today) return { kind: 'out_of_range' }

  const paused = Boolean(week.blockedReason)
  const dayWorkouts = today.workouts.filter((workout) => workout.status !== 'cancelled')
  const activeWorkouts = dayWorkouts.filter((workout) => workout.discipline !== 'R')

  const upcoming = days
    .filter((day) => day.date > todayIso)
    .flatMap((day) =>
      day.workouts
        .filter((workout) => workout.status === 'planned')
        .map((workout, index) => toUpcoming(workout, day.date, todayIso, index)),
    )

  const heading = formatDayHeading(todayIso)
  const header: TodayHeader = {
    weekNumber: week.weekNumber,
    weekLabel: `Semaine ${String(week.weekNumber).padStart(2, '0')} / ${plan.weeksCount}${paused ? ' · en pause' : ''}`,
    dayName: heading.dayName,
    dayDate: heading.dayDate,
    headerRight: { label: paused ? '0 h 00' : formatDurationMin(week.totalVolumeMin), emphasis: false },
    shares: paused ? [] : computeDisciplineShares(days),
    paused,
    missingWorkoutIds: today.missingWorkoutIds,
  }

  if (paused) {
    const waiting = days
      .filter((day) => day.date >= todayIso)
      .flatMap((day) =>
        day.workouts
          .filter((workout) => workout.status === 'planned')
          .map((workout, index) => toUpcoming(workout, day.date, todayIso, index)),
      )
    const firstDay = week.days[0]?.date ?? todayIso
    const following = nextWeek(plan, week)

    return {
      ...header,
      kind: 'week_paused',
      reason: week.blockedReason ?? '',
      sinceLabel: `depuis ${DAY_LABELS[weekdayIndex(firstDay)]}`,
      // Ce que fait réellement « Reprendre le plan » : le blocage tombe, rien n'est décalé.
      // Aucune promesse de replanification n'est affichée, faute de moteur pour la tenir.
      resumeLines: [
        `les ${plan.weeksCount} semaines restent, la course ne bouge pas`,
        `reprise sans décaler, semaine ${String(week.weekNumber).padStart(2, '0')} sautée`,
      ],
      firstWaiting: waiting[0] ?? null,
      otherWaitingCount: Math.max(waiting.length - 1, 0),
      canBlockMore: following !== undefined && !following.blockedReason,
    }
  }

  if (activeWorkouts.length === 0) {
    const restWorkout = dayWorkouts[0]
    return {
      ...header,
      kind: 'rest_day',
      restLabel: restWorkout
        ? `${restWorkout.title} · ${formatDurationMin(restWorkout.durationMin)}`
        : 'Repos · prévu au plan',
      prepares: upcoming.slice(0, 2),
      rest: upcoming,
    }
  }

  if (activeWorkouts.every((workout) => workout.status === 'completed')) {
    return {
      ...header,
      kind: 'all_done',
      done: activeWorkouts.map((workout) => ({
        workout,
        contextLabel: sessionContextLabel(workout),
        meta: sessionMeta(workout),
        sinceLabel: workout.completedAt ? formatRelativeSince(workout.completedAt, now) : null,
        stats: buildDoneStats(workout),
      })),
      next: upcoming,
    }
  }

  const total = activeWorkouts.length
  const brick = activeWorkouts.find((workout) => workout.isBrick)

  return {
    ...header,
    kind: 'sessions',
    headerRight:
      total > 1 ? { label: `${total} séances`, emphasis: true } : header.headerRight,
    cards: activeWorkouts.map((workout, index) => ({
      workout,
      positionLabel: total > 1 ? positionLabel(index, total) : null,
      roleLabel: total > 1 ? roleLabel(workout, index) : null,
      contextLabel: sessionContextLabel(workout),
      meta: sessionMeta(workout),
      bars: buildTimelineBars(workout.blocks),
      why: workout.why ?? null,
    })),
    totalLabel:
      total > 1
        ? `${formatDurationMin(activeWorkouts.reduce((sum, workout) => sum + workout.durationMin, 0))} cumulées`
        : null,
    // « 45 min entre les deux » du canevas n'est pas dérivable : le modèle ne porte pas d'heure
    // de séance. On garde la seule information vraie — l'ordre du jour est imposé.
    brickNote: brick ? 'enchaînement · ordre imposé' : null,
    brickWhy: brick?.why ?? null,
    rest: upcoming,
  }
}
