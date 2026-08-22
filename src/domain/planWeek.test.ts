import { describe, expect, it } from 'vitest'
import {
  TRIATHLON_DISCIPLINES,
  alignWeekToWeekOf,
  buildWeekDays,
  computeDisciplineShares,
  computeWeekListCounts,
  computeWeekTotals,
  dominantDiscipline,
  findCurrentWeek,
  workoutSubDetail,
} from './planWeek'
import { demoPlan, demoRunWorkout, demoSwimWorkout, demoWorkouts } from './demoData'

const week = demoPlan.weeks[0]

describe('buildWeekDays', () => {
  it('resolves seven columns labelled monday through sunday', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    expect(days).toHaveLength(7)
    expect(days.map((day) => day.label)).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'])
    expect(days[0].dayNumber).toBe('15')
  })

  it('marks only the day matching today', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    expect(days.filter((day) => day.isToday).map((day) => day.label)).toEqual(['Mar'])
  })

  it('marks a day without workouts as free', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    expect(days[4].isFree).toBe(true)
    expect(days[4].totalMin).toBe(0)
  })

  it('stacks several workouts on the same day and sums their duration', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    expect(days[5].workouts).toHaveLength(2)
    expect(days[5].totalMin).toBe(days[5].workouts[0].durationMin + days[5].workouts[1].durationMin)
  })

  it('reports unresolved workout ids instead of dropping them silently', () => {
    const days = buildWeekDays(week, [], '2026-06-16')
    expect(days[0].missingWorkoutIds).toEqual([demoSwimWorkout.id])
    expect(days[0].isFree).toBe(false)
  })
})

describe('computeWeekTotals', () => {
  it('sums the resolved workouts, not the declared week volume', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    const totals = computeWeekTotals(days)
    const expected = days.flatMap((day) => day.workouts).reduce((sum, workout) => sum + workout.durationMin, 0)
    expect(totals.totalMin).toBe(expected)
    expect(totals.sessionCount).toBe(7)
    expect(totals.remainingCount).toBe(7)
  })

  it('counts only planned workouts as remaining', () => {
    const days = buildWeekDays(
      week,
      demoWorkouts.map((workout) =>
        workout.id === demoSwimWorkout.id ? { ...workout, status: 'completed' as const } : workout,
      ),
      '2026-06-16',
    )
    expect(computeWeekTotals(days).remainingCount).toBe(6)
  })
})

describe('computeDisciplineShares', () => {
  it('returns disciplines present in the week, ordered N/V/C/R, summing to 100 %', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    const shares = computeDisciplineShares(days)
    expect(shares.map((share) => share.discipline)).toEqual(['N', 'V', 'C', 'R'])
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(100)
  })

  it('returns nothing when the week holds no resolved workout', () => {
    expect(computeDisciplineShares(buildWeekDays(week, [], '2026-06-16'))).toEqual([])
  })
})

describe('workoutSubDetail', () => {
  it('keeps swim distances in metres, never in kilometres', () => {
    expect(workoutSubDetail(demoSwimWorkout)).toBe('2 400 m · 1:34/100m')
  })

  it('falls back to the location when nothing else is known', () => {
    expect(workoutSubDetail({ ...demoSwimWorkout, distanceM: undefined, blocks: [] })).toBe('Bassin 25 m')
  })

  it('pairs distance with the main block target when there is one', () => {
    expect(workoutSubDetail(demoRunWorkout)).toBe('13 km · 4:12/km')
  })

  it('stays empty rather than inventing a detail', () => {
    expect(workoutSubDetail({ ...demoRunWorkout, distanceM: undefined, blocks: [], location: undefined })).toBe('')
  })
})

describe('findCurrentWeek', () => {
  it('falls back to the first week when today is outside the plan', () => {
    expect(findCurrentWeek(demoPlan, '2030-01-01')?.weekNumber).toBe(week.weekNumber)
  })
})

describe('alignWeekToWeekOf', () => {
  it('moves the seven days onto the calendar week holding the reference day', () => {
    const aligned = alignWeekToWeekOf(week, '2026-08-21')
    expect(aligned.days.map((day) => day.date)).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
    expect(aligned.days.map((day) => day.workoutIds)).toEqual(week.days.map((day) => day.workoutIds))
  })
})

describe('computeDisciplineShares · sous-ensemble de disciplines', () => {
  it('leaves the strengthening session out of the bar and renormalises the percentages', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    const shares = computeDisciplineShares(days, TRIATHLON_DISCIPLINES)
    expect(shares.map((share) => share.discipline)).toEqual(['N', 'V', 'C'])
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(100, 5)
    // Le renforcement (30 min) reste compté dans les totaux, mais pas dans la barre.
    expect(shares.reduce((sum, share) => sum + share.totalMin, 0)).toBe(
      computeWeekTotals(days).totalMin - 30,
    )
  })
})

describe('dominantDiscipline', () => {
  it('picks the discipline that weighs the most minutes in the day', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    // Samedi : 65 min de vélo puis 25 min d'enchaînement course.
    expect(dominantDiscipline(days[5])).toBe('V')
    expect(dominantDiscipline(days[0])).toBe('N')
  })

  it('returns null on a day without any resolved workout', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    expect(dominantDiscipline(days[4])).toBeNull()
  })
})

describe('computeWeekListCounts', () => {
  it('counts sessions, days that carry one, and days that carry two', () => {
    const days = buildWeekDays(week, demoWorkouts, '2026-06-16')
    // Six jours occupés, dont le samedi qui porte vélo + enchaînement.
    expect(computeWeekListCounts(days)).toEqual({
      sessionCount: 7,
      activeDayCount: 6,
      doubledDayCount: 1,
    })
  })

  it('counts an unresolved plan id as a session — le plan la prévoit, la ligne le dit', () => {
    const broken = { ...week, days: week.days.map((day, index) => (index === 4 ? { ...day, workoutIds: ['inconnu'] } : day)) }
    const counts = computeWeekListCounts(buildWeekDays(broken, demoWorkouts, '2026-06-16'))
    expect(counts.sessionCount).toBe(8)
    expect(counts.activeDayCount).toBe(7)
  })

  it('reports an empty week without any doubled day', () => {
    const empty = { ...week, days: week.days.map((day) => ({ ...day, workoutIds: [] })) }
    expect(computeWeekListCounts(buildWeekDays(empty, demoWorkouts, '2026-06-16'))).toEqual({
      sessionCount: 0,
      activeDayCount: 0,
      doubledDayCount: 0,
    })
  })
})
