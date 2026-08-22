// Dérivation de la vue « semaine » du plan (écran S6 · desktop : sept colonnes, une par jour).
// Pures fonctions : la vue ne calcule rien elle-même et n'invente aucune donnée absente du modèle.

import type { Discipline, PlanWeek, TrainingPlan, Workout } from './types'
import { DISCIPLINE_LABELS, LOCATION_LABELS, formatDistanceM, formatMeters } from './workoutFormat'

/** Étiquettes courtes des colonnes, index 0 = lundi (les dates du plan sont des jours ISO `YYYY-MM-DD`). */
export const DAY_SHORT_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

/** Ordre d'affichage des disciplines dans la barre de proportion et la légende du pied de page. */
export const DISCIPLINE_ORDER: Discipline[] = ['N', 'V', 'C', 'R']

/**
 * Disciplines portées par la barre de répartition de la semaine.
 *
 * Le canevas est explicite et concordant sur ses deux artboards Semaine : la barre de 03
 * (l. 426) comme celle de S6 (l. 1811) comptent exactement TROIS segments — natation, vélo,
 * course — alors que les deux semaines dessinées contiennent chacune une séance de renforcement
 * (03 l. 469 « Renforcement 25 min · optionnel », S6 l. 1936 « Renfo · postérieure »), et la
 * légende du pied de S6 (l. 1949-1951) ne nomme elle aussi que ces trois-là. Le renforcement
 * reste donc visible partout ailleurs (colonne, ligne de jour, histogramme, totaux) mais ne
 * découpe pas la barre : elle dit la répartition du triathlon, pas du volume total.
 */
export const TRIATHLON_DISCIPLINES: Discipline[] = ['N', 'V', 'C']

/**
 * Nom de phase du moteur → la formule que le canevas écrit à côté d'une plage de semaines
 * (« 24 → 30 août · bloc construction » sur 03, « Semaines 03 → 07 · bloc construction » sur 04m).
 * Un seul endroit pour les quatre : le Mois et la Semaine ne peuvent pas les nommer autrement.
 */
export const PHASE_LABELS: Record<string, string> = {
  Base: 'bloc fondation',
  Build: 'bloc construction',
  Specific: 'bloc spécifique',
  Taper: 'affûtage',
}

/**
 * Jour courant en ISO `YYYY-MM-DD`, lu sur le fuseau local et non en UTC :
 * la colonne « aujourd'hui » suit le calendrier de l'utilisateur.
 */
export function todayIso(reference: Date = new Date()): string {
  const year = reference.getFullYear()
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  const day = String(reference.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Index 0 = lundi. */
export function weekdayIndex(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay()
  return (day + 6) % 7
}

function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export interface WeekDay {
  date: string
  /** `Lun` … `Dim`. */
  label: string
  /** Quantième du mois, tel qu'affiché en tête de colonne. */
  dayNumber: string
  isToday: boolean
  workouts: Workout[]
  /** Identifiants du plan absents du catalogue : signalés, jamais masqués. */
  missingWorkoutIds: string[]
  totalMin: number
  /** Aucune séance prévue ce jour-là → colonne en pointillés. */
  isFree: boolean
}

/**
 * Résout les jours d'une semaine du plan contre un catalogue de séances.
 * `todayIso` est injecté pour garder la fonction pure et testable.
 */
export function buildWeekDays(week: PlanWeek, catalogue: Workout[], todayIso: string): WeekDay[] {
  const byId = new Map(catalogue.map((workout) => [workout.id, workout]))

  return week.days.map((day) => {
    const workouts: Workout[] = []
    const missingWorkoutIds: string[] = []

    for (const id of day.workoutIds) {
      const workout = byId.get(id)
      if (workout) workouts.push(workout)
      else missingWorkoutIds.push(id)
    }

    return {
      date: day.date,
      label: DAY_SHORT_LABELS[weekdayIndex(day.date)],
      dayNumber: day.date.slice(8, 10).replace(/^0/, ''),
      isToday: day.date === todayIso,
      workouts,
      missingWorkoutIds,
      totalMin: workouts.reduce((sum, workout) => sum + workout.durationMin, 0),
      isFree: day.workoutIds.length === 0,
    }
  })
}

export interface WeekTotals {
  totalMin: number
  sessionCount: number
  /** Séances encore au statut `planned` (ni faites, ni annulées). */
  remainingCount: number
}

/**
 * Totaux dérivés des séances réellement résolues, et non de `PlanWeek.volumeByDiscipline` :
 * un seul chiffre pour l'écran, impossible de contredire ce que la grille affiche.
 */
export function computeWeekTotals(days: WeekDay[]): WeekTotals {
  const workouts = days.flatMap((day) => day.workouts)
  return {
    totalMin: workouts.reduce((sum, workout) => sum + workout.durationMin, 0),
    sessionCount: workouts.length,
    remainingCount: workouts.filter((workout) => workout.status === 'planned').length,
  }
}

export interface WeekListCounts {
  sessionCount: number
  /** Jours qui portent au moins une séance — « 6 jours » du canevas 16. */
  activeDayCount: number
  /** Jours qui en portent plus d'une — « 3 jours doublés » du canevas 16. */
  doubledDayCount: number
}

/**
 * Décompte de la liste des jours, tel que l'artboard 16 l'écrit sous la barre de répartition :
 * « 10 séances · 6 jours » à gauche, « 3 jours doublés » à droite.
 *
 * Les identifiants introuvables comptent comme des séances : le plan les prévoit, la ligne le dit.
 * Ce décompte est aussi ce qui fait basculer l'écran de l'artboard 03 (une séance par jour) à
 * l'artboard 16 (jours doublés) — `doubledDayCount > 0`.
 */
export function computeWeekListCounts(days: WeekDay[]): WeekListCounts {
  const perDay = days.map((day) => day.workouts.length + day.missingWorkoutIds.length)
  return {
    sessionCount: perDay.reduce((sum, count) => sum + count, 0),
    activeDayCount: perDay.filter((count) => count > 0).length,
    doubledDayCount: perDay.filter((count) => count > 1).length,
  }
}

export interface DisciplineShare {
  discipline: Discipline
  label: string
  totalMin: number
  percent: number
}

/**
 * Volume par discipline, dans l'ordre N/V/C/R, disciplines absentes exclues.
 *
 * `disciplines` restreint le décompte — et donc le dénominateur des pourcentages — à un
 * sous-ensemble : la Semaine y passe `TRIATHLON_DISCIPLINES` pour sa barre de répartition.
 */
export function computeDisciplineShares(
  days: WeekDay[],
  disciplines: Discipline[] = DISCIPLINE_ORDER,
): DisciplineShare[] {
  const workouts = days
    .flatMap((day) => day.workouts)
    .filter((workout) => disciplines.includes(workout.discipline))
  const total = workouts.reduce((sum, workout) => sum + workout.durationMin, 0)
  if (total === 0) return []

  return disciplines.map((discipline) => {
    const totalMin = workouts
      .filter((workout) => workout.discipline === discipline)
      .reduce((sum, workout) => sum + workout.durationMin, 0)
    return { discipline, label: DISCIPLINE_LABELS[discipline], totalMin, percent: (totalMin / total) * 100 }
  }).filter((share) => share.totalMin > 0)
}

/**
 * Discipline qui pèse le plus de minutes dans la journée — couleur de la barre du jour dans
 * l'histogramme de l'artboard 03 (l. 431-439 : le samedi 90′ de vélo + 20′ de course y est bleu).
 * `null` quand la journée ne porte aucune séance résolue : pas de barre plutôt qu'une barre grise.
 */
export function dominantDiscipline(day: WeekDay): Discipline | null {
  let best: Discipline | null = null
  let bestMin = 0

  for (const discipline of DISCIPLINE_ORDER) {
    const total = day.workouts
      .filter((workout) => workout.discipline === discipline)
      .reduce((sum, workout) => sum + workout.durationMin, 0)
    if (total > bestMin) {
      best = discipline
      bestMin = total
    }
  }

  return best
}

/** Cible du premier bloc principal (allure ou % FTP), quand elle existe. */
export function firstTargetLabel(workout: Workout): string | null {
  const segments = workout.blocks.flatMap((block) => (block.kind === 'repeat' ? block.steps : [block]))
  const main = segments.find((segment) => segment.phase === 'main' && segment.target)
  const target = main?.target
  if (!target) return null
  if (target.pace) return target.pace
  if (target.powerPercentFtp) return `${target.powerPercentFtp} % FTP`
  return null
}

/**
 * Sous-détail d'une carte de la grille : au plus deux informations, uniquement des champs
 * existants (distance, cible du bloc principal, lieu). Rien n'est inventé quand ils sont absents.
 */
export function workoutSubDetail(workout: Workout): string {
  const parts: string[] = []

  if (workout.distanceM) {
    // La natation se compte en mètres jusqu'au bout, jamais en kilomètres.
    parts.push(workout.discipline === 'N' ? formatMeters(workout.distanceM) : formatDistanceM(workout.distanceM))
  }

  const target = firstTargetLabel(workout)
  if (target) parts.push(target)

  if (parts.length < 2 && workout.location) parts.push(LOCATION_LABELS[workout.location])

  return parts.slice(0, 2).join(' · ')
}

/** Semaine contenant `todayIso`, à défaut la première semaine du plan. */
export function findCurrentWeek(plan: TrainingPlan, todayIso: string): PlanWeek | undefined {
  return plan.weeks.find((week) => week.days.some((day) => day.date === todayIso)) ?? plan.weeks[0]
}

/**
 * Réaligne les dates d'une semaine sur la semaine calendaire (lundi → dimanche) contenant `todayIso`,
 * en conservant l'ordre des jours. Sert uniquement à présenter la semaine de démonstration : un plan
 * réel porte ses propres dates et n'a jamais besoin de cette fonction.
 */
export function alignWeekToWeekOf(week: PlanWeek, todayIso: string): PlanWeek {
  const monday = addDays(todayIso, -weekdayIndex(todayIso))
  return {
    ...week,
    days: week.days.map((day, index) => ({ ...day, date: addDays(monday, index) })),
  }
}
