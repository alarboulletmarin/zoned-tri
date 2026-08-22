import { buildWeekDays } from './planWeek'
import { currentWeekOf } from './todayState'
import type { TrainingPlan, Workout } from './types'

/**
 * Ce qu'une séance cochée change, dit en une phrase.
 *
 * Cocher « faite » écrivait en base sans que rien ne bouge à l'écran ni ne propose de revenir en
 * arrière — et la case, avec son `checked={false}` en dur, ne montrait jamais l'état qu'elle venait
 * d'écrire. La règle nº 2 du produit demande qu'une écriture montre son effet et se défasse.
 *
 * ÉCART ASSUMÉ à la lettre de la règle : elle impose une `ConfirmSheet` AVANT l'écriture pour
 * « toute action qui modifie le plan ». Cocher une séance ne modifie pas le plan — ni son volume,
 * ni ses jours, ni sa forme : c'est un état de séance, fréquent, immédiatement visible et
 * réversible d'un geste. Une feuille de confirmation à chaque case rendrait le geste le plus
 * courant du produit le plus coûteux. On garde donc la seconde moitié de la règle, celle qui
 * protège vraiment : l'effet est annoncé, et le bandeau de 6 s le défait.
 */
export interface MarkDoneEffect {
  /** Ce que la journée devient : « plus rien aujourd'hui », ou ce qu'il y reste. */
  dayLine: string
  /** Ce que la semaine devient — le décompte que porte aussi le bandeau de la coquille. */
  weekLine: string
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`
}

/**
 * `null` quand la séance n'appartient pas à la semaine en cours du plan : il n'y a alors rien à
 * annoncer, et on n'invente pas un décompte que l'écran ne montre pas.
 */
export function buildMarkDoneEffect(input: {
  plan?: TrainingPlan
  catalogue: Workout[]
  workoutId: string
  today: string
}): MarkDoneEffect | null {
  const { plan, catalogue, workoutId, today } = input
  if (!plan) return null

  const week = currentWeekOf(plan, today)
  if (!week) return null

  const days = buildWeekDays(week, catalogue, today)
  const day = days.find((candidate) => candidate.workouts.some((workout) => workout.id === workoutId))
  if (!day) return null

  // On compte ce que la séance cochée LAISSE : les séances encore à faire, elle exclue.
  const remainingToday = day.workouts.filter(
    (workout) => workout.id !== workoutId && workout.status !== 'completed',
  ).length

  const remainingWeek = days
    .flatMap((candidate) => candidate.workouts)
    .filter((workout) => workout.id !== workoutId && workout.status !== 'completed').length

  return {
    dayLine:
      remainingToday === 0
        ? 'Plus rien n’est prévu aujourd’hui.'
        : `Il reste ${plural(remainingToday, 'séance')} aujourd’hui.`,
    weekLine:
      remainingWeek === 0
        ? 'La semaine est complète.'
        : `${plural(remainingWeek, 'séance')} restante${remainingWeek > 1 ? 's' : ''} cette semaine.`,
  }
}

/** Le message du bandeau d'annulation, qui nomme la séance et ce qu'elle laisse derrière elle. */
export function markDoneMessage(workout: Workout, effect: MarkDoneEffect | null): string {
  const head = `« ${workout.title} » est marquée faite`
  return effect ? `${head} · ${effect.weekLine}` : head
}
