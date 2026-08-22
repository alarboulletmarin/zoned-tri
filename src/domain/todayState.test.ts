import { describe, expect, it } from 'vitest'
import {
  buildTodayView,
  formatDayHeading,
  formatRelativeDay,
  formatRelativeSince,
  sessionContextLabel,
  sessionMeta,
} from './todayState'
import { demoBikeWorkout, demoBrickRunWorkout, demoPlan, demoSwimWorkout, demoWorkouts } from './demoData'
import type { TrainingPlan, Workout } from './types'

// Semaine 07 du plan de démonstration : lundi 15 → dimanche 21 juin 2026.
// Lun natation · Mar vélo · Mer course · Jeu repos (R) · Ven vide · Sam vélo + enchaînement · Dim course.
const NOW = new Date('2026-06-16T18:00:00.000Z')

function planWith(overrides: Partial<TrainingPlan['weeks'][number]>): TrainingPlan {
  return { ...demoPlan, weeks: [{ ...demoPlan.weeks[0], ...overrides }] }
}

function completed(workout: Workout, completedAt: string): Workout {
  return { ...workout, status: 'completed', completedAt }
}

describe('formatDayHeading', () => {
  it('splits the day into its French name and its day-of-month', () => {
    expect(formatDayHeading('2026-06-16')).toEqual({ dayName: 'Mardi', dayDate: '16 juin' })
  })

  it('drops the leading zero of the day number', () => {
    expect(formatDayHeading('2026-08-05').dayDate).toBe('5 août')
  })
})

describe('formatRelativeDay', () => {
  it('names the next two days instead of counting them', () => {
    expect(formatRelativeDay('2026-06-16', '2026-06-17')).toBe('demain')
    expect(formatRelativeDay('2026-06-16', '2026-06-18')).toBe('après-demain')
  })

  it('counts the days beyond', () => {
    expect(formatRelativeDay('2026-06-16', '2026-06-20')).toBe('dans 4 jours')
  })
})

describe('formatRelativeSince', () => {
  it('stays in minutes below the hour', () => {
    expect(formatRelativeSince('2026-06-16T17:25:00.000Z', NOW)).toBe('il y a 35 min')
  })

  it('switches to hours, as in the canvas', () => {
    expect(formatRelativeSince('2026-06-16T16:00:00.000Z', NOW)).toBe('il y a 2 h')
  })

  it('switches to days past two days', () => {
    expect(formatRelativeSince('2026-06-13T18:00:00.000Z', NOW)).toBe('il y a 3 j')
  })
})

describe('sessionMeta', () => {
  it('keeps swimming in metres and appends the target of the main block', () => {
    expect(sessionMeta(demoSwimWorkout)).toBe('2 400 m · 55 min · 1:34/100m')
  })

  it('omits the distance when the workout does not carry one', () => {
    expect(sessionMeta(demoBikeWorkout)).toBe('1 h 05 · 96 % FTP')
  })

  it('names the zone and the location, and nothing else', () => {
    expect(sessionContextLabel(demoSwimWorkout)).toBe('Seuil · Bassin 25 m')
    expect(sessionContextLabel(demoBrickRunWorkout)).toBe('Endurance · Route')
  })
})

describe('buildTodayView · en-tête commun', () => {
  it('numbers the week and formats the planned weekly volume', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-16', NOW)
    expect(view.kind).toBe('sessions')
    if (view.kind === 'out_of_range') throw new Error('unexpected')
    expect(view.weekLabel).toBe('Semaine 07 / 18')
    expect(view.headerRight.label).toBe('8 h 10')
    expect(view.dayName).toBe('Mardi')
    expect(view.dayDate).toBe('16 juin')
    expect(view.shares.map((share) => share.discipline)).toEqual(['N', 'V', 'C', 'R'])
  })

  it('reports plan ids missing from the catalogue instead of dropping them', () => {
    const view = buildTodayView(demoPlan, [], '2026-06-16', NOW)
    if (view.kind === 'out_of_range') throw new Error('unexpected')
    expect(view.missingWorkoutIds).toEqual([demoBikeWorkout.id])
  })
})

describe('buildTodayView · hors plan', () => {
  it('returns out_of_range when today is not a day of the plan', () => {
    expect(buildTodayView(demoPlan, demoWorkouts, '2026-07-01', NOW)).toEqual({ kind: 'out_of_range' })
  })
})

describe('buildTodayView · séances', () => {
  it('describes the single session of the day without ordering it', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'sessions') throw new Error('expected sessions')
    expect(view.cards).toHaveLength(1)
    expect(view.cards[0].workout.id).toBe(demoBikeWorkout.id)
    expect(view.cards[0].positionLabel).toBeNull()
    expect(view.cards[0].roleLabel).toBeNull()
    expect(view.cards[0].bars.length).toBeGreaterThan(0)
    expect(view.totalLabel).toBeNull()
    expect(view.brickNote).toBeNull()
  })

  it('carries the evidence note of the workout, when it has one', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'sessions') throw new Error('expected sessions')
    expect(view.cards[0].why).toEqual(demoBikeWorkout.why)
  })

  it('lists what remains this week with three-letter day labels', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'sessions') throw new Error('expected sessions')
    expect(view.rest.map((session) => session.dayLabel)).toEqual(['MER', 'JEU', 'SAM', 'SAM', 'DIM'])
    expect(view.rest[0].subline).toContain('demain')
  })

  it('stacks and numbers the two sessions of saturday and sums them', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-20', NOW)
    if (view.kind !== 'sessions') throw new Error('expected sessions')
    expect(view.cards.map((card) => card.positionLabel)).toEqual(['1 / 2 · première', '2 / 2 · seconde'])
    expect(view.cards.map((card) => card.roleLabel)).toEqual(['Séance clé', 'Enchaînement'])
    expect(view.totalLabel).toBe('1 h 30 cumulées')
    expect(view.headerRight).toEqual({ label: '2 séances', emphasis: true })
  })

  it('mentions the brick and exposes its evidence note', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-20', NOW)
    if (view.kind !== 'sessions') throw new Error('expected sessions')
    expect(view.brickNote).toContain('enchaînement')
    expect(view.brickWhy).toEqual(demoBrickRunWorkout.why)
  })

  it('still asks for the day when only part of it is done', () => {
    const catalogue = demoWorkouts.map((workout) =>
      workout.id === demoBikeWorkout.id ? completed(workout, '2026-06-20T09:00:00.000Z') : workout,
    )
    const view = buildTodayView(demoPlan, catalogue, '2026-06-20', NOW)
    expect(view.kind).toBe('sessions')
  })
})

describe('buildTodayView · jour de repos', () => {
  it('answers with rest when the day carries no session at all', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-19', NOW)
    if (view.kind !== 'rest_day') throw new Error('expected rest_day')
    expect(view.restLabel).toBe('Repos · prévu au plan')
  })

  it('answers with rest when the day only carries a recovery session', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-18', NOW)
    if (view.kind !== 'rest_day') throw new Error('expected rest_day')
    expect(view.restLabel).toBe('Repos actif · 30 min')
  })

  it('previews at most the two next sessions of the week', () => {
    const view = buildTodayView(demoPlan, demoWorkouts, '2026-06-18', NOW)
    if (view.kind !== 'rest_day') throw new Error('expected rest_day')
    expect(view.prepares).toHaveLength(2)
    expect(view.prepares[0].subline).toContain('demain')
    expect(view.rest.length).toBeGreaterThan(view.prepares.length)
  })
})

describe('buildTodayView · séance faite', () => {
  it('switches to all_done once every session of the day is completed', () => {
    const catalogue = demoWorkouts.map((workout) =>
      workout.id === demoBikeWorkout.id ? completed(workout, '2026-06-16T16:00:00.000Z') : workout,
    )
    const view = buildTodayView(demoPlan, catalogue, '2026-06-16', NOW)
    if (view.kind !== 'all_done') throw new Error('expected all_done')
    expect(view.done).toHaveLength(1)
    expect(view.done[0].sinceLabel).toBe('il y a 2 h')
    // La séance vélo est aussi celle du samedi : marquée faite, elle sort des échéances à venir.
    expect(view.next.map((session) => session.dayLabel)).toEqual(['MER', 'JEU', 'SAM', 'DIM'])
  })

  it('shows dashes for every realised stat, because the model holds none', () => {
    const catalogue = demoWorkouts.map((workout) =>
      workout.id === demoBikeWorkout.id ? completed(workout, '2026-06-16T16:00:00.000Z') : workout,
    )
    const view = buildTodayView(demoPlan, catalogue, '2026-06-16', NOW)
    if (view.kind !== 'all_done') throw new Error('expected all_done')
    expect(view.done[0].stats.map((stat) => stat.value)).toEqual(['—', '—', '—'])
    expect(view.done[0].stats[0].label).toBe('puissance moyenne')
  })
})

describe('buildTodayView · semaine bloquée', () => {
  const pausedPlan = planWith({ blockedReason: 'Déplacement pro' })

  it('takes precedence over the sessions of the day', () => {
    const view = buildTodayView(pausedPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'week_paused') throw new Error('expected week_paused')
    expect(view.weekLabel).toBe('Semaine 07 / 18 · en pause')
    expect(view.headerRight.label).toBe('0 h 00')
    expect(view.shares).toEqual([])
    expect(view.reason).toBe('Déplacement pro')
  })

  it('dates the pause from the first day of the blocked week', () => {
    const view = buildTodayView(pausedPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'week_paused') throw new Error('expected week_paused')
    expect(view.sinceLabel).toBe('depuis lundi')
  })

  it('keeps today’s session among those waiting, and counts the others', () => {
    const view = buildTodayView(pausedPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'week_paused') throw new Error('expected week_paused')
    expect(view.firstWaiting?.dayLabel).toBe('MAR')
    expect(view.otherWaitingCount).toBe(5)
  })

  it('cannot block one more week when the plan holds no following week', () => {
    const view = buildTodayView(pausedPlan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'week_paused') throw new Error('expected week_paused')
    expect(view.canBlockMore).toBe(false)
  })

  it('can block one more week when the next one exists and is not blocked yet', () => {
    const plan: TrainingPlan = {
      ...pausedPlan,
      weeks: [
        pausedPlan.weeks[0],
        {
          ...demoPlan.weeks[0],
          weekNumber: 8,
          days: demoPlan.weeks[0].days.map((day) => ({ ...day, date: `2026-06-2${day.date.slice(9)}` })),
        },
      ],
    }
    const view = buildTodayView(plan, demoWorkouts, '2026-06-16', NOW)
    if (view.kind !== 'week_paused') throw new Error('expected week_paused')
    expect(view.canBlockMore).toBe(true)
  })
})
