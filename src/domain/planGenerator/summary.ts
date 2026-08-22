// Ce que le moteur rend, et comment on le résume à l'écran.
//
// `GeneratedPlan` est le contrat de sortie du moteur : un plan et les séances qu'il référence.
// `summarizePlan` en dérive les compteurs de l'écran 06 · Simulation (SÉANCES / H PAR SEM /
// AFFÛTAGE, barre de disciplines, barre d'intensité) — dérivés des séances réellement placées,
// jamais recopiés depuis les intentions du formulaire.

import type { Discipline, PlanIntensityDistribution, TrainingPlan, Workout, Zone } from '../types'
import { DISCIPLINE_ORDER } from '../planWeek'

export interface GeneratedPlan {
  plan: TrainingPlan
  /**
   * Séances instanciées, une par créneau du plan (identifiants propres au plan, pas ceux de la
   * bibliothèque) : marquer « fait » modifie une séance de ce plan, pas le gabarit partagé.
   */
  workouts: Workout[]
}

export interface DisciplineSummaryShare {
  discipline: Discipline
  minutes: number
  percent: number
}

export interface PlanSummary {
  sessionsCount: number
  totalMinutes: number
  /** Moyenne hebdomadaire, en heures (2 décimales max — le canevas affiche « 7,4 »). */
  hoursPerWeek: number
  taperWeeks: number
  disciplineShares: DisciplineSummaryShare[]
  intensity: PlanIntensityDistribution
}

const EASY_ZONES: Zone[] = ['Z1', 'Z2']
const MODERATE_ZONES: Zone[] = ['Z3']

function roundPercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

/**
 * Compteurs de l'écran 06 à partir d'un plan généré.
 *
 * Les séances de récupération (discipline « R ») comptent dans le volume et dans la barre de
 * disciplines — elles occupent une case du calendrier — mais leur zone est nulle : elles ne
 * pèsent donc pas dans la répartition d'intensité, qui ne porte que sur le travail zoné.
 */
export function summarizePlan({ plan, workouts }: GeneratedPlan): PlanSummary {
  const byId = new Map(workouts.map((workout) => [workout.id, workout]))
  const placed: Workout[] = []

  for (const week of plan.weeks) {
    for (const day of week.days) {
      for (const id of day.workoutIds) {
        const workout = byId.get(id)
        if (workout) placed.push(workout)
      }
    }
  }

  const totalMinutes = placed.reduce((sum, workout) => sum + workout.durationMin, 0)

  const minutesByDiscipline = new Map<Discipline, number>()
  for (const workout of placed) {
    minutesByDiscipline.set(
      workout.discipline,
      (minutesByDiscipline.get(workout.discipline) ?? 0) + workout.durationMin,
    )
  }

  const disciplineShares = DISCIPLINE_ORDER.filter((discipline) => minutesByDiscipline.has(discipline)).map(
    (discipline) => {
      const minutes = minutesByDiscipline.get(discipline) ?? 0
      return { discipline, minutes, percent: roundPercent(minutes, totalMinutes) }
    },
  )

  const zoned = placed.filter((workout): workout is Workout & { zone: Zone } => workout.zone !== null)
  const zonedMinutes = zoned.reduce((sum, workout) => sum + workout.durationMin, 0)
  const minutesInZones = (zones: Zone[]) =>
    zoned.filter((workout) => zones.includes(workout.zone)).reduce((sum, w) => sum + w.durationMin, 0)

  const z1z2Percent = roundPercent(minutesInZones(EASY_ZONES), zonedMinutes)
  const z3Percent = roundPercent(minutesInZones(MODERATE_ZONES), zonedMinutes)

  return {
    sessionsCount: placed.filter((workout) => workout.discipline !== 'R').length,
    totalMinutes,
    hoursPerWeek: plan.weeksCount > 0 ? Math.round((totalMinutes / plan.weeksCount / 60) * 10) / 10 : 0,
    taperWeeks: plan.phases.find((phase) => phase.name === 'Taper')?.weeksCount ?? 0,
    disciplineShares,
    // Les trois parts sont bornées à 100 en attribuant le reliquat d'arrondi au Z4+, qui est la
    // part la plus petite : mieux vaut un reste visible sur la barre que trois arrondis qui ne
    // totalisent pas 100 %. Sans une seule minute zonée, il n'y a pas de répartition à annoncer —
    // trois zéros, pas un « 100 % de Z4+ » que le reliquat produirait mécaniquement.
    intensity:
      zonedMinutes > 0
        ? { z1z2Percent, z3Percent, z4PlusPercent: Math.max(0, 100 - z1z2Percent - z3Percent) }
        : { z1z2Percent: 0, z3Percent: 0, z4PlusPercent: 0 },
  }
}
