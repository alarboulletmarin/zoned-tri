import { useParams } from 'react-router-dom'
import { demoAthleteProfile, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import { addDays } from '../../domain/planGenerator/dates'
import { alignWeekToWeekOf, todayIso, weekdayIndex } from '../../domain/planWeek'
import type { TrainingPlan, Workout } from '../../domain/types'
import { TodayScreen } from './TodayScreen'

/**
 * Atelier d'aperçu — **développement uniquement**, monté par `App` derrière `import.meta.env.DEV`.
 * Il n'existe pas dans l'application livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : l'écran Aujourd'hui a cinq états que le canevas dessine séparément (02, 02a, 02b,
 * 02c, 15), chacun tenant à une combinaison de données — un jour à une séance, un jour de repos, une
 * journée finie, une semaine bloquée, un jour à deux séances. Les atteindre à la main demanderait de
 * générer un plan puis d'attendre le bon jour. Le produit, lui, ne montre jamais de faux plan :
 * c'est la règle de l'artboard 01b, et `PlanRoute` la tient — sans plan actif, retour à l'ouverture.
 * L'aperçu est un outil de recette, pas une porte dérobée.
 */
export const PREVIEW_STATES = ['02', '02a', '02b', '02c', '15'] as const
export type PreviewState = (typeof PREVIEW_STATES)[number]

/** Jour de la semaine de démonstration qui porte chaque état (lundi = 0). */
const DAY_OF_STATE: Record<PreviewState, number> = {
  '02': 0, // lundi · natation seule
  '02a': 3, // jeudi · repos prévu au plan
  '02b': 0, // lundi, mais la séance est marquée faite
  '02c': 2, // mercredi · semaine bloquée
  '15': 5, // samedi · vélo + enchaînement
}

function isPreviewState(value: string | undefined): value is PreviewState {
  return PREVIEW_STATES.includes(value as PreviewState)
}

/** Semaine de démonstration recalée sur la semaine calendaire en cours, comme `PlanWeekRoute`. */
function previewPlan(state: PreviewState, today: string): TrainingPlan {
  const week = alignWeekToWeekOf(demoPlan.weeks[0], today)
  return {
    ...demoPlan,
    weeks: [state === '02c' ? { ...week, blockedReason: 'Déplacement pro' } : week],
  }
}

/**
 * Catalogue de l'aperçu. Pour 02b, SEULES les séances du jour montré passent en « faite » : marquer
 * toute la semaine viderait « Prochaine échéance », qui est justement ce que l'artboard donne à voir.
 */
function previewWorkouts(state: PreviewState, plan: TrainingPlan, day: string, completedAt: string): Workout[] {
  if (state !== '02b') return demoWorkouts
  const ofTheDay = new Set(plan.weeks[0].days.find((d) => d.date === day)?.workoutIds ?? [])
  return demoWorkouts.map((workout) =>
    ofTheDay.has(workout.id) ? { ...workout, status: 'completed' as const, completedAt } : workout,
  )
}

export function TodayPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return (
      <p className="preview-error">
        État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}
      </p>
    )
  }

  const today = todayIso()
  const monday = addDays(today, -weekdayIndex(today))
  const day = addDays(monday, DAY_OF_STATE[state])
  const now = new Date()
  // Deux heures avant l'heure de rendu : c'est le « il y a 2 h » de l'artboard 02b.
  const completedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  const plan = previewPlan(state, today)

  return (
    // Profil et course de démonstration : sans eux, la colonne latérale de S4 perdrait sa note
    // « prochaine référence » et le rail son décompte — deux blocs qu'on veut justement mesurer.
    <TodayScreen
      plan={plan}
      catalogue={previewWorkouts(state, plan, day, completedAt)}
      profile={demoAthleteProfile}
      races={[demoRace]}
      today={day}
      now={now}
    />
  )
}
