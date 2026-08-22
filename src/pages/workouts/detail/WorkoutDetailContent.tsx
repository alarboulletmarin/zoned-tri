import type { AthleteProfile, Workout } from '../../../domain/types'
import type { DetailLayout } from './detailProps'
import { selectDetailTemplate } from '../../../domain/workoutDetailTemplate'
import { SwimWorkoutDetail } from './SwimWorkoutDetail'
import { BikeWorkoutDetail } from './BikeWorkoutDetail'
import { RunWorkoutDetail } from './RunWorkoutDetail'
import { GenericWorkoutDetail } from './GenericWorkoutDetail'

export interface WorkoutDetailContentProps {
  workout: Workout
  layout?: DetailLayout
  /** Références mesurées — elles ne changent que l'unité des cibles (voir `DisciplineDetailProps`). */
  profile?: AthleteProfile
}

/**
 * Sélectionne le bon gabarit (05 natation / 28 vélo / 29 course / repli R), partagé entre la
 * route `/workouts/:id` et le panneau côte à côte de l'écran S5 (desktop). Ne rend QUE le contenu :
 * le bandeau appartient à l'écran hôte, qui seul sait s'il en faut un (route) ou pas (panneau S5).
 */
export function WorkoutDetailContent({ workout, layout, profile }: WorkoutDetailContentProps) {
  switch (selectDetailTemplate(workout.discipline)) {
    case 'swim':
      return <SwimWorkoutDetail workout={workout} layout={layout} profile={profile} />
    case 'bike':
      return <BikeWorkoutDetail workout={workout} layout={layout} profile={profile} />
    case 'run':
      return <RunWorkoutDetail workout={workout} layout={layout} profile={profile} />
    case 'generic':
      return <GenericWorkoutDetail workout={workout} layout={layout} profile={profile} />
  }
}
