import { describe, expect, it } from 'vitest'
import type { PlanDay, PlanWeek, TrainingPlan, Workout } from '../types'
import { SEED_WORKOUTS } from '../seedWorkouts'
import { createInitialForm } from './form'
import { generatePlan } from './generatePlan'
import { summarizePlan, type GeneratedPlan } from './summary'

// --- Fixtures minimales -----------------------------------------------------------------

function workout(id: string, overrides: Partial<Workout> = {}): Workout {
  return {
    id,
    title: id,
    discipline: 'V',
    zone: 'Z2',
    durationMin: 60,
    blocks: [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 60 }],
    status: 'planned',
    ...overrides,
  }
}

function week(weekNumber: number, idsByDay: string[][]): PlanWeek {
  const days: PlanDay[] = idsByDay.map((workoutIds, index) => ({
    date: `2026-08-${String(17 + (weekNumber - 1) * 7 + index).padStart(2, '0')}`,
    workoutIds,
  }))
  return {
    weekNumber,
    phase: 'Base',
    totalVolumeMin: 0,
    volumeByDiscipline: {},
    days,
    easyPercent: 0,
    hardPercent: 0,
  }
}

function planOf(weeks: PlanWeek[], taperWeeks = 2): TrainingPlan {
  return {
    id: 'plan-fixture',
    format: '70.3',
    startDate: '2026-08-17',
    endDate: '2026-08-30',
    weeksCount: weeks.length,
    status: 'active',
    settings: {
      weeklyVolumeTargetMin: 450,
      availableDays: [true, true, true, true, true, true, true],
      maxSessionsPerDiscipline: {},
    },
    constraints: { blockedWeeks: [] },
    referencesSnapshot: {},
    phases: [{ name: 'Taper', weeksCount: taperWeeks, status: 'upcoming' }],
    intensityDistribution: { z1z2Percent: 0, z3Percent: 0, z4PlusPercent: 0 },
    weeks,
  }
}

// --- Tests -----------------------------------------------------------------------------

describe('summarizePlan — compteurs', () => {
  it('compte les séances réellement placées, pas le catalogue fourni', () => {
    const workouts = [workout('a'), workout('b'), workout('orpheline')]
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['a'], [], ['b'], [], [], [], []])]),
      workouts,
    }
    const summary = summarizePlan(generated)
    expect(summary.sessionsCount).toBe(2)
    expect(summary.totalMinutes).toBe(120)
  })

  it('ignore un identifiant du plan absent du catalogue plutôt que de compter du vide', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['a'], ['fantome'], [], [], [], [], []])]),
      workouts: [workout('a')],
    }
    expect(summarizePlan(generated).sessionsCount).toBe(1)
  })

  it('compte une séance autant de fois qu’elle est placée', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['a'], ['a'], [], [], [], [], []])]),
      workouts: [workout('a')],
    }
    expect(summarizePlan(generated).sessionsCount).toBe(2)
    expect(summarizePlan(generated).totalMinutes).toBe(120)
  })

  it('donne la moyenne hebdomadaire en heures, à une décimale', () => {
    const generated: GeneratedPlan = {
      plan: planOf([
        week(1, [['a'], ['b'], [], [], [], [], []]),
        week(2, [['c'], [], [], [], [], [], []]),
      ]),
      workouts: [workout('a'), workout('b'), workout('c', { durationMin: 105 })],
    }
    // 60 + 60 + 105 = 225 min sur 2 semaines = 1,875 h/sem → 1,9.
    expect(summarizePlan(generated).hoursPerWeek).toBe(1.9)
  })

  it('reprend l’affûtage depuis les phases du plan', () => {
    const generated: GeneratedPlan = { plan: planOf([week(1, [[], [], [], [], [], [], []])], 3), workouts: [] }
    expect(summarizePlan(generated).taperWeeks).toBe(3)
  })
})

describe('summarizePlan — disciplines', () => {
  it('range les parts dans l’ordre N / V / C / R et exclut les disciplines absentes', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['run'], ['swim'], ['bike'], [], [], [], []])]),
      workouts: [
        workout('run', { discipline: 'C', durationMin: 30 }),
        workout('swim', { discipline: 'N', durationMin: 30 }),
        workout('bike', { discipline: 'V', durationMin: 60 }),
      ],
    }
    const shares = summarizePlan(generated).disciplineShares
    expect(shares.map((share) => share.discipline)).toEqual(['N', 'V', 'C'])
    expect(shares.map((share) => share.percent)).toEqual([25, 50, 25])
  })

  it('compte la récupération dans le volume mais pas dans le nombre de séances', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['bike'], ['rest'], [], [], [], [], []])]),
      workouts: [workout('bike'), workout('rest', { discipline: 'R', zone: null, durationMin: 40 })],
    }
    const summary = summarizePlan(generated)
    expect(summary.sessionsCount).toBe(1)
    expect(summary.totalMinutes).toBe(100)
    expect(summary.disciplineShares.map((share) => share.discipline)).toEqual(['V', 'R'])
  })
})

describe('summarizePlan — intensité', () => {
  it('ne pèse que le travail zoné : une séance sans zone ne compte pas dans la répartition', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['easy'], ['hard'], ['rest'], [], [], [], []])]),
      workouts: [
        workout('easy', { zone: 'Z2', durationMin: 80 }),
        workout('hard', { zone: 'Z4', durationMin: 20 }),
        workout('rest', { discipline: 'R', zone: null, durationMin: 500 }),
      ],
    }
    expect(summarizePlan(generated).intensity).toEqual({ z1z2Percent: 80, z3Percent: 0, z4PlusPercent: 20 })
  })

  it('classe Z1 et Z2 en facile, Z3 en modéré, Z4 à Z6 en dur', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['z1'], ['z2'], ['z3'], ['z4'], ['z5'], ['z6'], []])]),
      workouts: [
        workout('z1', { zone: 'Z1', durationMin: 20 }),
        workout('z2', { zone: 'Z2', durationMin: 40 }),
        workout('z3', { zone: 'Z3', durationMin: 20 }),
        workout('z4', { zone: 'Z4', durationMin: 10 }),
        workout('z5', { zone: 'Z5', durationMin: 5 }),
        workout('z6', { zone: 'Z6', durationMin: 5 }),
      ],
    }
    expect(summarizePlan(generated).intensity).toEqual({ z1z2Percent: 60, z3Percent: 20, z4PlusPercent: 20 })
  })

  it('rend toujours trois parts qui totalisent 100', () => {
    const generated: GeneratedPlan = {
      plan: planOf([week(1, [['a'], ['b'], ['c'], [], [], [], []])]),
      workouts: [
        workout('a', { zone: 'Z2', durationMin: 33 }),
        workout('b', { zone: 'Z3', durationMin: 33 }),
        workout('c', { zone: 'Z4', durationMin: 34 }),
      ],
    }
    const { z1z2Percent, z3Percent, z4PlusPercent } = summarizePlan(generated).intensity
    expect(z1z2Percent + z3Percent + z4PlusPercent).toBe(100)
  })

  it("n'annonce aucune répartition quand le plan ne contient pas une minute zonée", () => {
    // Le reliquat d'arrondi part au Z4+ ; sans minute zonée il vaudrait 100, ce qui ferait
    // afficher « 100 % de Z4+ » à un plan vide (course déjà passée, aucun jour coché). On rend
    // trois zéros : rien à répartir n'est pas la même chose que tout en Z4+.
    const generated: GeneratedPlan = { plan: planOf([week(1, [[], [], [], [], [], [], []])]), workouts: [] }
    expect(summarizePlan(generated).intensity).toEqual({ z1z2Percent: 0, z3Percent: 0, z4PlusPercent: 0 })
  })
})

describe('summarizePlan — sur un plan réellement généré', () => {
  it('recoupe la répartition portée par le plan et le nombre de séances instanciées', () => {
    const today = '2026-08-21'
    const generated = generatePlan(
      { ...createInitialForm(undefined, today), raceDate: '2026-12-06' },
      today,
      SEED_WORKOUTS,
      { idPrefix: 'plan-test' },
    )
    const summary = summarizePlan(generated)

    expect(summary.intensity).toEqual(generated.plan.intensityDistribution)
    expect(summary.taperWeeks).toBe(2)
    expect(summary.sessionsCount).toBe(generated.workouts.length)
    expect(summary.hoursPerWeek).toBeGreaterThan(3)
    expect(summary.disciplineShares.reduce((total, share) => total + share.minutes, 0)).toBe(
      summary.totalMinutes,
    )
  })
})
