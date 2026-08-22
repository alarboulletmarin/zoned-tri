import { describe, expect, it } from 'vitest'
import { alignWeekToWeekOf, todayIso } from './planWeek'
import { demoPlan, demoWorkouts } from './demoData'
import type { TrainingPlan, Workout } from './types'
import { buildMarkDoneEffect, markDoneMessage } from './markDone'

/** Le plan de démonstration recalé sur la semaine en cours : « aujourd'hui » y tombe vraiment. */
function planOnThisWeek(today: string): TrainingPlan {
  return { ...demoPlan, weeks: [alignWeekToWeekOf(demoPlan.weeks[0], today)] }
}

function workoutsOfToday(plan: TrainingPlan, today: string): string[] {
  const day = plan.weeks[0].days.find((candidate) => candidate.date === today)
  return day?.workoutIds ?? []
}

describe('buildMarkDoneEffect', () => {
  const today = todayIso()
  const plan = planOnThisWeek(today)

  it('ne dit rien quand il n’y a pas de plan à lire', () => {
    expect(
      buildMarkDoneEffect({ catalogue: demoWorkouts, workoutId: 'peu importe', today }),
    ).toBeNull()
  })

  it('ne dit rien d’une séance qui n’est pas dans la semaine en cours', () => {
    expect(
      buildMarkDoneEffect({ plan, catalogue: demoWorkouts, workoutId: 'inconnue', today }),
    ).toBeNull()
  })

  it('compte ce que la séance cochée LAISSE, elle exclue', () => {
    // Fixture explicite plutôt que le jeu de démonstration : le décompte est tout l'objet du test,
    // il ne doit dépendre ni du nombre de séances du jour ni de leur résolution dans le catalogue.
    const doubled: TrainingPlan = {
      ...plan,
      weeks: [
        {
          ...plan.weeks[0],
          days: plan.weeks[0].days.map((day) =>
            day.date === today ? { ...day, workoutIds: ['a', 'b'] } : { ...day, workoutIds: [] },
          ),
        },
      ],
    }
    const catalogue: Workout[] = ['a', 'b'].map((id) => ({ ...demoWorkouts[0], id, status: 'planned' }))

    const effect = buildMarkDoneEffect({ plan: doubled, catalogue, workoutId: 'a', today })
    expect(effect).toEqual({
      dayLine: 'Il reste 1 séance aujourd’hui.',
      weekLine: '1 séance restante cette semaine.',
    })
  })

  /** Une séance déjà faite ne compte plus dans le reste : c'est tout l'intérêt du décompte. */
  it('ne compte pas les séances déjà faites', () => {
    const ids = workoutsOfToday(plan, today)
    if (ids.length === 0) return

    const catalogue: Workout[] = demoWorkouts.map((workout) =>
      workout.id === ids[0] ? workout : { ...workout, status: 'completed' as const },
    )
    const effect = buildMarkDoneEffect({ plan, catalogue, workoutId: ids[0], today })
    expect(effect!.weekLine).toBe('La semaine est complète.')
  })
})

describe('markDoneMessage', () => {
  it('nomme la séance et ce qu’elle laisse dans la semaine', () => {
    const workout = demoWorkouts[0]
    const message = markDoneMessage(workout, {
      dayLine: 'Plus rien n’est prévu aujourd’hui.',
      weekLine: '3 séances restantes cette semaine.',
    })
    expect(message).toBe(`« ${workout.title} » est marquée faite · 3 séances restantes cette semaine.`)
  })

  it('se contente de nommer la séance quand rien ne peut être compté', () => {
    const workout = demoWorkouts[0]
    expect(markDoneMessage(workout, null)).toBe(`« ${workout.title} » est marquée faite`)
  })
})
