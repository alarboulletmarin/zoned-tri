import { describe, expect, it } from 'vitest'
import {
  applySettingToPlan,
  availableDaysLabel,
  blockedWeeksLabel,
  compareWeeks,
  engineDecisions,
  formFromPlan,
  gearCountLabel,
  planDisciplineShares,
  planSettingRows,
  settingJournalEntry,
  settingScopes,
  settingValueOfForm,
  weekHasCompletedWork,
  weeklyVolumeDelta,
} from './planSettings'
import { createInitialForm } from './planGenerator/form'
import { generatePlan } from './planGenerator/generatePlan'
import { SEED_WORKOUTS } from './seedWorkouts'
import type { PlanWeek, Race, TrainingPlan } from './types'

const TODAY = '2026-06-15'

function buildPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  const form = {
    ...createInitialForm(undefined, TODAY),
    raceName: 'Vichy',
    weeklyVolumeTargetMin: 450,
    constraints: {
      pool: true,
      openWater: false,
      homeTrainer: true,
      powerMeter: false,
      timeTrialBike: false,
      blockedWeeks: [
        { weekNumber: 4, reason: 'déplacement pro' },
        { weekNumber: 5, reason: 'déplacement pro' },
      ],
    },
  }
  const { plan } = generatePlan(form, TODAY, SEED_WORKOUTS, { idPrefix: 'plan-test' })
  return { ...plan, ...overrides }
}

/**
 * La course tombe exactement au bout du plan : c'est le cas du produit, où `generatePlan` écrit la
 * fiche de course depuis la même date que le plan. Une course PLUS PROCHE donnerait un plan candidat
 * plus court que le plan enregistré — cas couvert plus bas.
 */
const RACE: Race = {
  id: 'race-test',
  name: 'Vichy',
  date: '2026-10-04',
  format: '70.3',
  role: 'primary_goal',
  distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
}

describe('libellés de valeur', () => {
  it('nomme les jours libres plutôt que de compter seulement', () => {
    expect(availableDaysLabel([true, true, true, true, false, true, true])).toBe('6 · sauf ven.')
    expect(availableDaysLabel([true, true, true, true, true, true, true])).toBe('7 · tous')
    expect(availableDaysLabel([false, false, false, false, false, false, false])).toBe('aucun jour')
  })

  it('écrit les semaines réduites sur deux chiffres, comme le canevas', () => {
    expect(blockedWeeksLabel([4, 5])).toBe('04 et 05')
    expect(blockedWeeksLabel([9, 4, 5])).toBe('04, 05 et 09')
    expect(blockedWeeksLabel([])).toBe('aucune')
  })

  it('compte le matériel sur cinq', () => {
    const form = createInitialForm(undefined, TODAY)
    expect(gearCountLabel(form.constraints)).toBe('2 sur 5')
  })
})

describe('planSettingRows', () => {
  it('rend les six lignes du canevas, dans son ordre et avec leur portée', () => {
    const rows = planSettingRows(buildPlan(), RACE)

    expect(rows.map((row) => row.key)).toEqual([
      'race_format',
      'date',
      'volume',
      'days',
      'gear',
      'reduced_weeks',
    ])
    expect(rows.map((row) => row.impact)).toEqual([
      'whole_plan',
      'whole_plan',
      'upcoming',
      'upcoming',
      'sessions',
      'upcoming',
    ])
  })

  it('nomme la course quand il y en a une, et le dit quand il n’y en a pas', () => {
    expect(planSettingRows(buildPlan(), RACE)[0].value).toBe('70.3 Vichy')
    expect(planSettingRows(buildPlan())[0].value).toBe('70.3 · aucune course')
  })

  it('n’ouvre en avant / après que les réglages que le moteur sait rejouer', () => {
    const rows = planSettingRows(buildPlan(), RACE)
    expect(rows.filter((row) => row.reopenable).map((row) => row.key)).toEqual([
      'volume',
      'days',
      'gear',
      'reduced_weeks',
    ])
  })
})

describe('planDisciplineShares', () => {
  it('somme le registre du plan, et rend des parts qui totalisent 100 %', () => {
    const shares = planDisciplineShares(buildPlan())
    expect(shares.length).toBeGreaterThan(0)
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeGreaterThanOrEqual(99)
  })

  it('ne rend rien quand le plan ne porte aucun volume', () => {
    expect(planDisciplineShares(buildPlan({ weeks: [] }))).toEqual([])
  })
})

describe('engineDecisions', () => {
  it('donne un motif à chaque décision — jamais une décision opaque', () => {
    for (const decision of engineDecisions(buildPlan())) {
      expect(decision.reason.length).toBeGreaterThan(0)
    }
  })

  it('rend inerte, avec sa raison, toute décision sans réglage derrière elle', () => {
    for (const decision of engineDecisions(buildPlan())) {
      if (decision.setting === undefined) expect(decision.inertReason).toBeTruthy()
      else expect(decision.inertReason).toBeUndefined()
    }
  })
})

describe('formFromPlan', () => {
  it('relit le plan sans rien perdre de ce qui l’a produit', () => {
    const plan = buildPlan()
    const form = formFromPlan(plan, RACE)

    expect(form.format).toBe(plan.format)
    expect(form.raceName).toBe('Vichy')
    expect(form.raceDate).toBe(RACE.date)
    expect(form.weeklyVolumeTargetMin).toBe(plan.settings.weeklyVolumeTargetMin)
    expect(form.availableDays).toEqual(plan.settings.availableDays)
    expect(form.constraints.blockedWeeks).toEqual(plan.constraints.blockedWeeks)
  })

  it('rejoue le plan à l’identique quand rien n’est modifié', () => {
    const plan = buildPlan()
    const again = generatePlan(formFromPlan(plan, RACE), TODAY, SEED_WORKOUTS, { idPrefix: plan.id })

    expect(again.plan.weeks[0].totalVolumeMin).toBe(plan.weeks[0].totalVolumeMin)
    expect(again.plan.weeks[0].days.map((day) => day.workoutIds.length)).toEqual(
      plan.weeks[0].days.map((day) => day.workoutIds.length),
    )
  })
})

describe('settingValueOfForm', () => {
  it('lit la même valeur pour l’avant et pour l’après', () => {
    const form = formFromPlan(buildPlan(), RACE)
    expect(settingValueOfForm('volume', form)).toBe('7 h 30')
    expect(settingValueOfForm('days', form)).toBe('6 · sauf ven.')
    expect(settingValueOfForm('reduced_weeks', form)).toBe('04 et 05')
  })
})

describe('settingScopes', () => {
  it('compte les semaines réellement concernées', () => {
    const plan = buildPlan()
    const scopes = settingScopes(plan, 3)

    expect(scopes.map((scope) => scope.weeks)).toEqual([1, plan.weeksCount - 2, plan.weeksCount])
  })

  it('laisse « refaire tout le plan » inerte, avec sa raison', () => {
    const whole = settingScopes(buildPlan(), 1).find((scope) => scope.scope === 'whole_plan')
    expect(whole?.inertReason).toBeTruthy()
  })
})

describe('compareWeeks', () => {
  const week: PlanWeek = {
    weekNumber: 1,
    phase: 'Base',
    totalVolumeMin: 300,
    volumeByDiscipline: { N: 100, V: 120, C: 80 },
    days: [
      { date: '2026-06-15', workoutIds: ['a'] },
      { date: '2026-06-16', workoutIds: [] },
      { date: '2026-06-17', workoutIds: ['b', 'c'] },
      { date: '2026-06-18', workoutIds: [] },
      { date: '2026-06-19', workoutIds: [] },
      { date: '2026-06-20', workoutIds: ['d'] },
      { date: '2026-06-21', workoutIds: [] },
    ],
    easyPercent: 81,
    hardPercent: 19,
  }

  it('rend les quatre lignes du canevas, dans son ordre', () => {
    expect(compareWeeks(week, week).map((row) => row.label)).toEqual([
      'Séances',
      'Jours doublés',
      'Facile / dur',
      'Jours libres',
    ])
  })

  it('ne marque « changé » que ce qui change réellement', () => {
    const after: PlanWeek = {
      ...week,
      days: week.days.map((day, index) => (index === 1 ? { ...day, workoutIds: ['e'] } : day)),
    }
    const rows = compareWeeks(week, after)

    expect(rows[0]).toMatchObject({ before: '4', after: '5', changed: true })
    expect(rows[1]).toMatchObject({ changed: false })
    expect(rows[2]).toMatchObject({ changed: false })
    expect(rows[3].changed).toBe(true)
  })

  it('mesure l’écart de volume hebdomadaire', () => {
    expect(weeklyVolumeDelta(week, { ...week, totalVolumeMin: 390 })).toBe(90)
  })
})

describe('applySettingToPlan', () => {
  function candidateWithVolume(plan: TrainingPlan, minutes: number) {
    const form = { ...formFromPlan(plan, RACE), weeklyVolumeTargetMin: minutes }
    return generatePlan(form, TODAY, SEED_WORKOUTS, { idPrefix: plan.id })
  }

  it('ne touche qu’une semaine quand la portée est « cette semaine »', () => {
    const plan = buildPlan()
    const applied = applySettingToPlan(plan, candidateWithVolume(plan, 600), 'this_week', 2, new Set())

    expect(applied.rewrittenWeeks).toEqual([2])
    expect(applied.plan.weeks[0]).toEqual(plan.weeks[0])
  })

  it('réécrit la semaine en cours et toutes les suivantes quand la portée est « à venir »', () => {
    const plan = buildPlan()
    const applied = applySettingToPlan(
      plan,
      candidateWithVolume(plan, 600),
      'upcoming_weeks',
      3,
      new Set(),
    )

    expect(applied.rewrittenWeeks[0]).toBe(3)
    expect(applied.rewrittenWeeks.at(-1)).toBe(plan.weeksCount)
    // Les semaines antérieures sont intactes, à l'identique.
    expect(applied.plan.weeks[0]).toEqual(plan.weeks[0])
    expect(applied.plan.weeks[1]).toEqual(plan.weeks[1])
  })

  it('n’écrase JAMAIS une semaine qui porte une séance faite', () => {
    const plan = buildPlan()
    const doneId = plan.weeks[3].days.flatMap((day) => day.workoutIds)[0]
    const applied = applySettingToPlan(
      plan,
      candidateWithVolume(plan, 600),
      'upcoming_weeks',
      1,
      new Set([doneId]),
    )

    expect(applied.keptWeeks).toContain(4)
    expect(applied.rewrittenWeeks).not.toContain(4)
    expect(applied.plan.weeks[3]).toEqual(plan.weeks[3])
  })

  it('garde le numéro et la phase de la semaine remplacée', () => {
    const plan = buildPlan()
    const applied = applySettingToPlan(plan, candidateWithVolume(plan, 600), 'this_week', 5, new Set())

    expect(applied.plan.weeks[4].weekNumber).toBe(5)
    expect(applied.plan.weeks[4].phase).toBe(plan.weeks[4].phase)
  })

  it('laisse intactes les semaines que le candidat, plus court, ne couvre pas', () => {
    const plan = buildPlan()
    const closerRace: Race = { ...RACE, date: '2026-08-30' }
    const form = { ...formFromPlan(plan, closerRace), weeklyVolumeTargetMin: 600 }
    const candidate = generatePlan(form, TODAY, SEED_WORKOUTS, { idPrefix: plan.id })
    const applied = applySettingToPlan(plan, candidate, 'upcoming_weeks', 1, new Set())

    expect(applied.rewrittenWeeks.length).toBe(candidate.plan.weeksCount)
    expect(applied.rewrittenWeeks.length).toBeLessThan(plan.weeksCount)
    const untouched = plan.weeksCount - 1
    expect(applied.plan.weeks[untouched]).toEqual(plan.weeks[untouched])
  })

  it('rend les séances des seules semaines réécrites', () => {
    const plan = buildPlan()
    const applied = applySettingToPlan(plan, candidateWithVolume(plan, 600), 'this_week', 2, new Set())
    const rewritten = applied.plan.weeks[1].days.flatMap((day) => day.workoutIds)

    expect(applied.workouts.map((workout) => workout.id).sort()).toEqual([...rewritten].sort())
  })
})

describe('weekHasCompletedWork', () => {
  it('repère une semaine qui porte au moins une séance faite', () => {
    const plan = buildPlan()
    const id = plan.weeks[0].days.flatMap((day) => day.workoutIds)[0]

    expect(weekHasCompletedWork(plan.weeks[0], new Set([id]))).toBe(true)
    expect(weekHasCompletedWork(plan.weeks[0], new Set())).toBe(false)
  })
})

describe('settingJournalEntry', () => {
  it('écrit l’avant, l’après, la portée et le nombre de semaines réécrites', () => {
    const entry = settingJournalEntry({
      id: 'journal-1',
      planId: 'plan-test',
      at: '2026-06-15T10:00:00.000Z',
      key: 'volume',
      before: '7 h 30',
      after: '9 h',
      scope: 'upcoming_weeks',
      rewrittenWeeks: [3, 4, 5],
    })

    expect(entry.author).toBe('user')
    expect(entry.description).toBe('Volume hebdo : 7 h 30 → 9 h')
    expect(entry.reason).toBe('les semaines à venir · 3 semaines réécrites')
    expect(entry.undone).toBe(false)
  })

  it('le dit quand rien n’a été réécrit', () => {
    const entry = settingJournalEntry({
      id: 'journal-2',
      planId: 'plan-test',
      at: '2026-06-15T10:00:00.000Z',
      key: 'days',
      before: '6 · sauf ven.',
      after: '5 · sauf ven., mer.',
      scope: 'this_week',
      rewrittenWeeks: [],
    })

    expect(entry.reason).toBe('cette semaine · aucune semaine réécrite')
  })
})
