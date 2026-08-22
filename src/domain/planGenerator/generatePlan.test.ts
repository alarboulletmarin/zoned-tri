import { describe, expect, it } from 'vitest'
import type { Discipline, TrainingPlan, Workout } from '../types'
import { SEED_WORKOUTS } from '../seedWorkouts'
import { weekdayIndex } from './dates'
import type { GeneratorForm } from './form'
import { createInitialForm } from './form'
import { generatePlan } from './generatePlan'
import type { GeneratedPlan } from './summary'

const TODAY = '2026-08-21' // un vendredi

function formOf(overrides: Partial<GeneratorForm> = {}): GeneratorForm {
  return { ...createInitialForm(undefined, TODAY), ...overrides }
}

function generate(overrides: Partial<GeneratorForm> = {}, today = TODAY): GeneratedPlan {
  return generatePlan(formOf(overrides), today, SEED_WORKOUTS, { idPrefix: 'plan-test' })
}

function placedWorkouts({ plan, workouts }: GeneratedPlan): Workout[] {
  const byId = new Map(workouts.map((workout) => [workout.id, workout]))
  return plan.weeks
    .flatMap((week) => week.days)
    .flatMap((day) => day.workoutIds)
    .map((id) => byId.get(id))
    .filter((workout): workout is Workout => workout !== undefined)
}

function weekWorkouts(generated: GeneratedPlan, weekNumber: number): Workout[] {
  const byId = new Map(generated.workouts.map((workout) => [workout.id, workout]))
  const week = generated.plan.weeks.find((candidate) => candidate.weekNumber === weekNumber)
  return (week?.days ?? [])
    .flatMap((day) => day.workoutIds)
    .map((id) => byId.get(id))
    .filter((workout): workout is Workout => workout !== undefined)
}

describe('generatePlan — calendrier', () => {
  it('démarre le lundi de la semaine calendaire du jour courant', () => {
    const { plan } = generate()
    expect(plan.startDate).toBe('2026-08-17')
  })

  it('met le jour courant dans la semaine 1 (sinon « Aujourd’hui » n’a rien à afficher)', () => {
    const { plan } = generate()
    const firstWeek = plan.weeks[0]
    expect(firstWeek.weekNumber).toBe(1)
    expect(firstWeek.days.map((day) => day.date)).toContain(TODAY)
  })

  it('donne 7 jours consécutifs du lundi au dimanche à chaque semaine', () => {
    const { plan } = generate()
    for (const week of plan.weeks) {
      expect(week.days).toHaveLength(7)
      expect(week.days.map((day) => weekdayIndex(day.date))).toEqual([0, 1, 2, 3, 4, 5, 6])
    }
    const allDates = plan.weeks.flatMap((week) => week.days.map((day) => day.date))
    expect(new Set(allDates).size).toBe(allDates.length)
  })

  it('finit le jour de la course quand une course est visée', () => {
    const { plan } = generate({ raceDate: '2026-11-08' })
    expect(plan.endDate).toBe('2026-11-08')
    expect(plan.weeksCount).toBe(12)
    expect(plan.weeks).toHaveLength(12)
  })

  it('sans course, prend le plancher du format et finit un dimanche', () => {
    const { plan } = generate({ noRace: true, format: 'Sprint' })
    expect(plan.weeksCount).toBe(8)
    expect(plan.endDate).toBe('2026-10-11')
    expect(weekdayIndex(plan.endDate)).toBe(6)
  })

  it('recopie les réglages, contraintes et références du formulaire', () => {
    const form = formOf({ raceDate: '2026-11-08' })
    const { plan } = generatePlan(form, TODAY, SEED_WORKOUTS, { idPrefix: 'plan-test' })
    expect(plan.settings.weeklyVolumeTargetMin).toBe(form.weeklyVolumeTargetMin)
    expect(plan.settings.availableDays).toEqual(form.availableDays)
    expect(plan.settings.maxSessionsPerDiscipline).toEqual(form.maxSessionsPerDiscipline)
    expect(plan.constraints.pool).toBe(true)
    expect(plan.referencesSnapshot).toEqual({
      cssPaceMinPer100m: undefined,
      ftpWatts: undefined,
      runThresholdPaceMinPerKm: undefined,
    })
    expect(plan.status).toBe('active')
    expect(plan.raceId).toBeUndefined()
  })
})

describe('generatePlan — phases', () => {
  it('somme des semaines de phases = semaines du plan', () => {
    for (const raceDate of ['2026-09-27', '2026-11-08', '2027-02-14', '2027-06-06']) {
      const { plan } = generate({ raceDate })
      const sum = plan.phases.reduce((total, phase) => total + phase.weeksCount, 0)
      expect(sum).toBe(plan.weeksCount)
    }
  })

  it('la phase contenant la semaine 1 est active, les suivantes à venir', () => {
    const { plan } = generate({ raceDate: '2026-12-06' })
    expect(plan.phases[0].status).toBe('active')
    expect(plan.phases.slice(1).every((phase) => phase.status === 'upcoming')).toBe(true)
  })

  it('affûte sur 2 semaines et étiquette chaque semaine avec sa phase', () => {
    const { plan } = generate({ raceDate: '2026-12-06' })
    expect(plan.phases.at(-1)).toMatchObject({ name: 'Taper', weeksCount: 2 })
    expect(plan.weeks.at(-1)?.phase).toBe('Taper')
    expect(plan.weeks[0].phase).toBe('Base')
  })
})

describe('generatePlan — placement des séances', () => {
  it('ne place aucune séance sur un jour non coché, et le marque indisponible', () => {
    const availableDays: GeneratorForm['availableDays'] = [true, true, true, true, false, true, true]
    const { plan } = generate({ availableDays, raceDate: '2026-11-08' })
    for (const week of plan.weeks) {
      for (const day of week.days) {
        const index = weekdayIndex(day.date)
        if (!availableDays[index]) {
          expect(day.workoutIds).toEqual([])
          expect(day.unavailable).toBe(true)
        } else {
          expect(day.unavailable).toBeUndefined()
        }
      }
    }
  })

  it('respecte le plafond de séances par discipline, semaine par semaine', () => {
    const maxSessionsPerDiscipline = { N: 1, V: 2, C: 2 }
    const generated = generate({ maxSessionsPerDiscipline, raceDate: '2026-11-08' })
    for (const week of generated.plan.weeks) {
      const counts = new Map<Discipline, number>()
      for (const workout of weekWorkouts(generated, week.weekNumber)) {
        counts.set(workout.discipline, (counts.get(workout.discipline) ?? 0) + 1)
      }
      expect(counts.get('N') ?? 0).toBeLessThanOrEqual(1)
      expect(counts.get('V') ?? 0).toBeLessThanOrEqual(2)
      expect(counts.get('C') ?? 0).toBeLessThanOrEqual(2)
    }
  })

  it('cale la sortie longue vélo sur le samedi et la sortie longue course sur le dimanche', () => {
    const generated = generate({ raceDate: '2026-11-08' })
    const byId = new Map(generated.workouts.map((workout) => [workout.id, workout]))

    /** Plus longue séance d'endurance (hors enchaînement) d'une discipline, un jour donné. */
    function longestEasy(week: (typeof generated.plan.weeks)[number], discipline: Discipline, onDay: boolean, dayIndex: number) {
      return Math.max(
        0,
        ...week.days
          .filter((day) => (weekdayIndex(day.date) === dayIndex) === onDay)
          .flatMap((day) => day.workoutIds.map((id) => byId.get(id)))
          .filter(
            (workout) =>
              workout?.discipline === discipline &&
              workout.isBrick !== true &&
              (workout.zone === 'Z1' || workout.zone === 'Z2'),
          )
          .map((workout) => workout?.durationMin ?? 0),
      )
    }

    for (const week of generated.plan.weeks) {
      // Le jour de course ne porte pas de séance : la sortie longue se replie ailleurs.
      if (week.days[5].date < generated.plan.endDate) {
        expect(longestEasy(week, 'V', true, 5)).toBeGreaterThanOrEqual(longestEasy(week, 'V', false, 5))
      }
      if (week.days[6].date < generated.plan.endDate) {
        expect(longestEasy(week, 'C', true, 6)).toBeGreaterThanOrEqual(longestEasy(week, 'C', false, 6))
      }
    }
  })

  it('ne place aucune séance le jour de la course ni après', () => {
    // Course un mercredi : la fin de la dernière semaine tombe après la course.
    const generated = generate({ raceDate: '2026-11-04' })
    const lastWeek = generated.plan.weeks.at(-1)
    expect(lastWeek?.days.filter((day) => day.date >= '2026-11-04').every((day) => day.workoutIds.length === 0)).toBe(
      true,
    )
    expect(lastWeek?.days.some((day) => day.workoutIds.length > 0)).toBe(true)
  })

  it('place un enchaînement (deux séances le même jour) en phase Build et Specific', () => {
    const generated = generate({ raceDate: '2027-01-10' })
    const byId = new Map(generated.workouts.map((workout) => [workout.id, workout]))
    const buildWeeks = generated.plan.weeks.filter(
      (week) => week.phase === 'Build' || week.phase === 'Specific',
    )
    expect(buildWeeks.length).toBeGreaterThan(0)

    for (const week of buildWeeks) {
      if (week.blockedReason) continue
      const brickDays = week.days.filter(
        (day) => day.workoutIds.map((id) => byId.get(id)).filter((workout) => workout?.isBrick).length >= 2,
      )
      expect(brickDays.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('n’ouvre aucune journée quand aucun jour n’est coché', () => {
    const availableDays: GeneratorForm['availableDays'] = [false, false, false, false, false, false, false]
    const generated = generate({ availableDays, raceDate: '2026-11-08' })
    expect(generated.workouts).toEqual([])
    expect(generated.plan.weeks.every((week) => week.totalVolumeMin === 0)).toBe(true)
  })
})

describe('generatePlan — volume', () => {
  it('reste dans l’ordre de grandeur du volume visé et allège l’affûtage', () => {
    const { plan } = generate({ raceDate: '2026-12-06' })
    const build = plan.weeks.find((week) => week.phase === 'Build' && !week.blockedReason)
    const taper = plan.weeks.at(-1)
    expect(build?.totalVolumeMin).toBeGreaterThan(300)
    expect(build?.totalVolumeMin).toBeLessThan(600)
    expect(taper?.totalVolumeMin ?? 0).toBeLessThan(build?.totalVolumeMin ?? 0)
  })

  it('allège une semaine sur quatre (cycle de charge 3:1)', () => {
    const { plan } = generate({ raceDate: '2027-01-10' })
    const week3 = plan.weeks.find((week) => week.weekNumber === 3)
    const week4 = plan.weeks.find((week) => week.weekNumber === 4)
    expect(week4?.totalVolumeMin ?? 0).toBeLessThan(week3?.totalVolumeMin ?? 0)
  })

  it('réduit une semaine bloquée, lui retire la sortie longue et porte le motif saisi', () => {
    const reason = 'déplacement pro : volume réduit, pas de longue sortie'
    const generated = generate({
      raceDate: '2027-01-10',
      constraints: { ...formOf().constraints, blockedWeeks: [{ weekNumber: 3, reason }] },
    })
    const blocked = generated.plan.weeks.find((week) => week.weekNumber === 3)
    const normal = generated.plan.weeks.find((week) => week.weekNumber === 2)

    expect(blocked?.blockedReason).toBe(reason)
    expect(blocked?.totalVolumeMin ?? 0).toBeLessThan((normal?.totalVolumeMin ?? 0) * 0.8)

    const longest = Math.max(0, ...weekWorkouts(generated, 3).map((workout) => workout.durationMin))
    const normalLongest = Math.max(0, ...weekWorkouts(generated, 2).map((workout) => workout.durationMin))
    expect(longest).toBeLessThan(normalLongest)
  })

  it('dérive volume total et volume par discipline des séances réellement placées', () => {
    const generated = generate({ raceDate: '2026-11-08' })
    for (const week of generated.plan.weeks) {
      const workouts = weekWorkouts(generated, week.weekNumber)
      const byDiscipline = new Map<Discipline, number>()
      for (const workout of workouts) {
        byDiscipline.set(workout.discipline, (byDiscipline.get(workout.discipline) ?? 0) + workout.durationMin)
      }
      for (const [discipline, minutes] of byDiscipline) {
        expect(week.volumeByDiscipline[discipline]).toBe(Math.round(minutes))
      }
      const sum = Object.values(week.volumeByDiscipline).reduce((total, value) => total + (value ?? 0), 0)
      expect(week.totalVolumeMin).toBe(sum)
    }
  })
})

describe('generatePlan — contraintes matérielles', () => {
  it('sans piscine, aucune séance en bassin', () => {
    const generated = generate({
      raceDate: '2026-11-08',
      constraints: { ...formOf().constraints, pool: false },
    })
    for (const workout of placedWorkouts(generated)) {
      expect(workout.location).not.toBe('pool_25m')
      expect(workout.location).not.toBe('pool_50m')
    }
  })

  it('sans eau libre, aucune séance en eau libre', () => {
    const generated = generate({
      raceDate: '2026-11-08',
      constraints: { ...formOf().constraints, openWater: false },
    })
    expect(placedWorkouts(generated).some((workout) => workout.location === 'open_water')).toBe(false)
  })

  it('sans home-trainer, aucune séance sur home-trainer', () => {
    const generated = generate({
      raceDate: '2026-11-08',
      constraints: { ...formOf().constraints, homeTrainer: false },
    })
    expect(placedWorkouts(generated).some((workout) => workout.location === 'home_trainer')).toBe(false)
  })

  it('sans piscine ni eau libre, le plan ne contient simplement pas de natation', () => {
    const generated = generate({
      raceDate: '2026-11-08',
      constraints: { ...formOf().constraints, pool: false, openWater: false },
    })
    expect(placedWorkouts(generated).some((workout) => workout.discipline === 'N')).toBe(false)
    expect(placedWorkouts(generated).length).toBeGreaterThan(0)
  })
})

describe('generatePlan — tests de référence', () => {
  it('place le test demandé en semaine 1, une seule fois dans tout le plan', () => {
    const generated = generate({
      raceDate: '2026-11-08',
      testSessions: { N: true, V: true, C: true },
    })
    const firstWeekTitles = weekWorkouts(generated, 1).map((workout) => workout.title)
    expect(firstWeekTitles).toContain('Test FTP 20 minutes')
    expect(firstWeekTitles).toContain('30 min contre-la-montre')
    expect(firstWeekTitles).toContain('Test CSS 400 m / 200 m')

    const allTitles = placedWorkouts(generated).map((workout) => workout.title)
    expect(allTitles.filter((title) => title === '30 min contre-la-montre')).toHaveLength(1)
  })

  it('ne place aucun test quand aucun n’est demandé', () => {
    const generated = generate({
      raceDate: '2026-11-08',
      testSessions: { N: false, V: false, C: false },
    })
    const titles = placedWorkouts(generated).map((workout) => workout.title)
    expect(titles).not.toContain('30 min contre-la-montre')
    expect(titles).not.toContain('Test CSS 400 m / 200 m')
  })
})

describe('generatePlan — répartition d’intensité', () => {
  it('approche la cible pyramidale 78 / 8 / 14 sur l’ensemble du plan', () => {
    const { plan } = generate({ raceDate: '2027-01-10' })
    const { z1z2Percent, z3Percent, z4PlusPercent } = plan.intensityDistribution
    expect(z1z2Percent).toBeGreaterThanOrEqual(68)
    expect(z1z2Percent).toBeLessThanOrEqual(88)
    expect(z3Percent).toBeLessThanOrEqual(18)
    expect(z4PlusPercent).toBeGreaterThanOrEqual(4)
    expect(z4PlusPercent).toBeLessThanOrEqual(24)
    expect(z1z2Percent + z3Percent + z4PlusPercent).toBe(100)
  })

  it('porte la répartition obtenue et non la cible théorique', () => {
    const generated = generate({ raceDate: '2026-11-08' })
    const zoned = placedWorkouts(generated).filter((workout) => workout.zone !== null)
    const zonedMinutes = zoned.reduce((total, workout) => total + workout.durationMin, 0)
    const easy = zoned
      .filter((workout) => workout.zone === 'Z1' || workout.zone === 'Z2')
      .reduce((total, workout) => total + workout.durationMin, 0)
    expect(generated.plan.intensityDistribution.z1z2Percent).toBe(Math.round((easy / zonedMinutes) * 100))
  })

  it('donne easyPercent / hardPercent par semaine, dérivés des séances placées', () => {
    const generated = generate({ raceDate: '2026-11-08' })
    for (const week of generated.plan.weeks) {
      const zoned = weekWorkouts(generated, week.weekNumber).filter((workout) => workout.zone !== null)
      if (zoned.length === 0) continue
      const zonedMinutes = zoned.reduce((total, workout) => total + workout.durationMin, 0)
      const hard = zoned
        .filter((workout) => workout.zone === 'Z4' || workout.zone === 'Z5' || workout.zone === 'Z6')
        .reduce((total, workout) => total + workout.durationMin, 0)
      expect(week.hardPercent).toBe(Math.round((hard / zonedMinutes) * 100))
      expect(week.easyPercent + week.hardPercent).toBeLessThanOrEqual(100)
    }
  })
})

describe('generatePlan — séances instanciées', () => {
  it('donne un identifiant unique et déterministe à chaque séance, tous résolus par le plan', () => {
    const generated = generate({ raceDate: '2026-11-08' })
    const ids = generated.workouts.map((workout) => workout.id)
    expect(new Set(ids).size).toBe(ids.length)

    const referenced = generated.plan.weeks
      .flatMap((week) => week.days)
      .flatMap((day) => day.workoutIds)
    expect(new Set(referenced).size).toBe(referenced.length)
    expect(referenced.sort()).toEqual([...ids].sort())
    expect(ids.every((id) => /^plan-test-w\d{2}-d[0-6]-\d+$/.test(id))).toBe(true)
  })

  it('copie les gabarits sans jamais les partager ni les modifier', () => {
    const before = JSON.stringify(SEED_WORKOUTS)
    const generated = generate({ raceDate: '2026-11-08' })
    expect(JSON.stringify(SEED_WORKOUTS)).toBe(before)

    for (const workout of generated.workouts) {
      expect(workout.status).toBe('planned')
      expect(workout.completedAt).toBeUndefined()
      expect(SEED_WORKOUTS.some((template) => template.blocks === workout.blocks)).toBe(false)
    }
  })

  it('dérive un identifiant de plan du format et de la date quand aucun préfixe n’est fourni', () => {
    const plan: TrainingPlan = generatePlan(formOf({ raceDate: '2026-11-08' }), TODAY, SEED_WORKOUTS).plan
    expect(plan.id).toBe('plan-70.3-2026-11-08')
  })
})

describe('generatePlan — déterminisme', () => {
  it('rend exactement le même plan pour les mêmes entrées', () => {
    const first = generate({ raceDate: '2026-11-08' })
    const second = generate({ raceDate: '2026-11-08' })
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })

  it('ne dépend ni de l’horloge ni du hasard pour deux formats différents', () => {
    const sprint = generate({ format: 'Sprint', noRace: true })
    const ironman = generate({ format: 'Ironman', noRace: true })
    expect(sprint.plan.weeksCount).toBe(8)
    expect(ironman.plan.weeksCount).toBe(24)
    expect(JSON.stringify(generate({ format: 'Sprint', noRace: true }))).toBe(JSON.stringify(sprint))
  })
})
