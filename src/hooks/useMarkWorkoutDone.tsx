import { useCallback, useState, type ReactNode } from 'react'
import { UndoToast } from '../components/ui/UndoToast/UndoToast'
import { useWorkouts } from '../context/AppDataContext'
import { buildMarkDoneEffect, markDoneMessage } from '../domain/markDone'
import type { TrainingPlan, Workout } from '../domain/types'

/**
 * Cocher et décocher une séance, avec ce que ça change et de quoi revenir en arrière.
 *
 * Avant : la case écrivait en base sans un mot, son `checked` valait `false` en dur — elle ne
 * montrait donc jamais l'état qu'elle venait d'écrire, et sur une journée à deux séances elle
 * semblait se décocher toute seule — et rien ne permettait de se dédire. La règle nº 2 du produit
 * veut qu'une écriture annonce son effet et se défasse : le bandeau de 6 s le fait, en nommant la
 * séance et ce qu'elle laisse dans la semaine.
 *
 * Décocher ne repasse pas par le bandeau : c'est déjà le geste inverse, et un bandeau pour défaire
 * un « défaire » n'annonce rien de neuf.
 */
export interface MarkWorkoutDone {
  /** Bascule l'état d'une séance : faite ↔ prévue. */
  toggle: (workout: Workout) => void
  /** Le bandeau d'annulation, à rendre au niveau de l'écran. `null` la plupart du temps. */
  overlay: ReactNode
}

export interface MarkWorkoutDoneContext {
  plan?: TrainingPlan
  /** Catalogue résolu de l'écran : il sert à compter ce que la séance cochée laisse. */
  catalogue: Workout[]
  today: string
}

export function useMarkWorkoutDone({ plan, catalogue, today }: MarkWorkoutDoneContext): MarkWorkoutDone {
  const { saveWorkout } = useWorkouts()
  const [undo, setUndo] = useState<{ message: string; workout: Workout } | null>(null)

  const toggle = useCallback(
    (workout: Workout) => {
      if (workout.status === 'completed') {
        const restored: Workout = { ...workout, status: 'planned' }
        delete restored.completedAt
        setUndo(null)
        void saveWorkout(restored)
        return
      }

      // L'effet se calcule AVANT l'écriture : après, la séance compte déjà parmi les faites et le
      // décompte annoncé ne serait plus celui que le geste a produit.
      const effect = buildMarkDoneEffect({ plan, catalogue, workoutId: workout.id, today })
      void saveWorkout({ ...workout, status: 'completed', completedAt: new Date().toISOString() })
      setUndo({ message: markDoneMessage(workout, effect), workout })
    },
    [catalogue, plan, saveWorkout, today],
  )

  const applyUndo = useCallback(() => {
    if (!undo) return
    const restored: Workout = { ...undo.workout, status: 'planned' }
    delete restored.completedAt
    void saveWorkout(restored)
    setUndo(null)
  }, [saveWorkout, undo])

  return {
    toggle,
    overlay: undo ? (
      <UndoToast message={undo.message} onUndo={applyUndo} onExpire={() => setUndo(null)} />
    ) : null,
  }
}
