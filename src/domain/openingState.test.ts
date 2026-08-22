import { describe, expect, it } from 'vitest'
import { formatDayMonth, selectOpeningState } from './openingState'
import type { AthleteProfile, Race, TrainingPlan, Workout } from './types'

function makeWorkout(overrides: Partial<Workout> & Pick<Workout, 'id'>): Workout {
  return {
    title: 'Séance',
    discipline: 'N',
    zone: 'Z4',
    durationMin: 55,
    blocks: [],
    status: 'planned',
    ...overrides,
  }
}

function makePlan(overrides: Partial<TrainingPlan> & Pick<TrainingPlan, 'id'>): TrainingPlan {
  return {
    format: '70.3',
    startDate: '2026-05-04',
    endDate: '2026-08-30',
    weeksCount: 18,
    status: 'active',
    settings: {
      weeklyVolumeTargetMin: 450,
      availableDays: [true, true, true, true, true, true, true],
      maxSessionsPerDiscipline: {},
    },
    constraints: { blockedWeeks: [] },
    referencesSnapshot: {},
    phases: [],
    intensityDistribution: { z1z2Percent: 80, z3Percent: 8, z4PlusPercent: 12 },
    weeks: [],
    ...overrides,
  }
}

const vichy: Race = {
  id: 'race-vichy',
  name: '70.3 Vichy',
  date: '2026-08-30',
  format: '70.3',
  role: 'primary_goal',
  distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
}

const profile: AthleteProfile = {
  id: 'singleton',
  weightKg: 72.5,
  sweatRateLPerH: 1.1,
  maxHeartRateBpm: 186,
  ftp: { watts: 268, measuredAt: '2026-08-30' },
  runThreshold: { paceMinPerKm: '4:05', measuredAt: '2026-08-30' },
  language: 'fr',
  theme: 'light',
}

describe('formatDayMonth', () => {
  it('formats an ISO day in French', () => {
    expect(formatDayMonth('2026-08-30')).toBe('30 août')
    expect(formatDayMonth('2026-05-18')).toBe('18 mai')
  })

  it('returns the raw value rather than inventing a date when the input is malformed', () => {
    expect(formatDayMonth('pas-une-date')).toBe('pas-une-date')
  })
})

describe('selectOpeningState', () => {
  it('reports the first visit when nothing is stored on the device', () => {
    const state = selectOpeningState({ plans: [], races: [], workouts: [], today: '2026-06-15' })

    expect(state.kind).toBe('first_visit')
    expect(state.summaryLabel).toBe('aucun plan')
    expect(state.activePlan).toBeUndefined()
    expect(state.finishedPlan).toBeUndefined()
    expect(state.archivedPlans).toEqual([])
    expect(state.references).toEqual([])
  })

  it('describes the active plan, its week, its countdown and its next session', () => {
    const swim = makeWorkout({ id: 'w-swim', discipline: 'N', zone: 'Z4', distanceM: 2400 })
    const plan = makePlan({
      id: 'plan-active',
      raceId: vichy.id,
      weeks: [
        {
          weekNumber: 7,
          phase: 'Build',
          totalVolumeMin: 490,
          volumeByDiscipline: {},
          easyPercent: 81,
          hardPercent: 19,
          days: [
            { date: '2026-06-15', workoutIds: [] },
            { date: '2026-06-16', workoutIds: [swim.id] },
          ],
        },
      ],
    })

    const state = selectOpeningState({
      plans: [plan],
      races: [vichy],
      workouts: [swim],
      profile,
      today: '2026-06-15',
    })

    expect(state.kind).toBe('plan_in_progress')
    expect(state.summaryLabel).toBe('1 en cours · 0 archivé')
    expect(state.activePlan).toMatchObject({
      title: '70.3 Vichy',
      countdownLabel: 'J-76',
      weekLabel: 'Semaine 07 / 18',
      progressPercent: 39,
    })
    expect(state.activePlan?.nextSession).toEqual({ dayLabel: 'mardi', detail: 'seuil 2 400 m' })
  })

  it('skips sessions already done or cancelled when looking for the next one', () => {
    const done = makeWorkout({ id: 'w-done', status: 'completed', distanceM: 2400 })
    const upcoming = makeWorkout({ id: 'w-next', discipline: 'C', zone: 'Z2', distanceM: 12_000 })
    const plan = makePlan({
      id: 'plan-active',
      weeks: [
        {
          weekNumber: 1,
          phase: 'Base',
          totalVolumeMin: 200,
          volumeByDiscipline: {},
          easyPercent: 90,
          hardPercent: 10,
          days: [
            { date: '2026-06-15', workoutIds: [done.id] },
            { date: '2026-06-18', workoutIds: [upcoming.id] },
          ],
        },
      ],
    })

    const state = selectOpeningState({
      plans: [plan],
      races: [],
      workouts: [done, upcoming],
      today: '2026-06-15',
    })

    expect(state.activePlan?.nextSession).toEqual({ dayLabel: 'jeudi', detail: 'endurance 12 km' })
    // Aucune course rattachée : pas de compte à rebours inventé.
    expect(state.activePlan?.countdownLabel).toBeUndefined()
  })

  it('lists archived plans next to the active one, most recent first', () => {
    const active = makePlan({ id: 'plan-active', endDate: '2026-08-30' })
    const completed = makePlan({
      id: 'plan-senlis',
      status: 'archived_completed',
      weeksCount: 12,
      endDate: '2026-05-18',
    })
    const abandoned = makePlan({
      id: 'plan-hiver',
      status: 'archived_abandoned',
      weeksCount: 16,
      abandonedAtWeek: 9,
      endDate: '2026-02-10',
    })

    const state = selectOpeningState({
      plans: [abandoned, active, completed],
      races: [],
      workouts: [],
      today: '2026-06-15',
    })

    expect(state.summaryLabel).toBe('1 en cours · 2 archivés')
    expect(state.archivedPlans).toEqual([
      { planId: 'plan-senlis', title: '70.3', detail: '12 sem. · terminé le 18 mai' },
      { planId: 'plan-hiver', title: '70.3', detail: '16 sem. · abandonné sem. 09' },
    ])
  })

  it('switches to the race-done state and reports the result and the reference gaps', () => {
    const doneSwim = makeWorkout({ id: 'w1', status: 'completed' })
    const skipped = makeWorkout({ id: 'w2', status: 'cancelled' })
    const plan = makePlan({
      id: 'plan-vichy',
      raceId: vichy.id,
      status: 'archived_completed',
      referencesSnapshot: { ftpWatts: 257, runThresholdPaceMinPerKm: '4:12' },
      weeks: [
        {
          weekNumber: 18,
          phase: 'Taper',
          totalVolumeMin: 200,
          volumeByDiscipline: {},
          easyPercent: 90,
          hardPercent: 10,
          days: [{ date: '2026-08-25', workoutIds: [doneSwim.id, skipped.id] }],
        },
      ],
    })

    const state = selectOpeningState({
      plans: [plan],
      races: [{ ...vichy, result: { timeSec: 18_720, deltaToTargetSec: -600 } }],
      workouts: [doneSwim, skipped],
      profile,
      today: '2026-09-05',
    })

    expect(state.kind).toBe('race_done')
    expect(state.summaryLabel).toBe('0 en cours · 1 archivé')
    expect(state.finishedPlan).toEqual({
      planId: 'plan-vichy',
      title: '70.3 Vichy',
      isRaceRun: true,
      headline: '5 h 12 · 30 août',
      detail: '18 semaines · 1 séances sur 2',
    })
    expect(state.references).toEqual([
      { discipline: 'V', label: 'FTP 268 W', deltaLabel: '+11 W', improved: true },
      { discipline: 'C', label: 'Seuil 4:05 /km', deltaLabel: '−7 s', improved: true },
    ])
    expect(state.referencesDateLabel).toBe('30 août')
  })

  it('keeps the archived state readable when the plan has no race attached', () => {
    const plan = makePlan({ id: 'plan-orphan', status: 'archived_abandoned', weeksCount: 8, abandonedAtWeek: 3 })

    const state = selectOpeningState({ plans: [plan], races: [], workouts: [], today: '2026-09-05' })

    expect(state.kind).toBe('race_done')
    expect(state.finishedPlan).toMatchObject({
      title: '70.3',
      isRaceRun: false,
      headline: '8 semaines',
      detail: '8 semaines · 0 séances sur 0',
    })
    expect(state.archivedPlans).toEqual([])
  })

  it('shows references without a gap when the archived plan never photographed them', () => {
    const plan = makePlan({ id: 'plan-nosnapshot', status: 'archived_completed', referencesSnapshot: {} })

    const state = selectOpeningState({ plans: [plan], races: [], workouts: [], profile, today: '2026-09-05' })

    expect(state.references).toEqual([
      { discipline: 'V', label: 'FTP 268 W' },
      { discipline: 'C', label: 'Seuil 4:05 /km' },
    ])
  })

  it('omits the gap when a reference has not moved since the plan was generated', () => {
    const plan = makePlan({
      id: 'plan-flat',
      status: 'archived_completed',
      referencesSnapshot: { ftpWatts: 268, runThresholdPaceMinPerKm: '4:05' },
    })

    const state = selectOpeningState({ plans: [plan], races: [], workouts: [], profile, today: '2026-09-05' })

    expect(state.references).toEqual([
      { discipline: 'V', label: 'FTP 268 W' },
      { discipline: 'C', label: 'Seuil 4:05 /km' },
    ])
  })

  it('caps the progress bar when the plan runs past its planned length', () => {
    const plan = makePlan({
      id: 'plan-overrun',
      weeksCount: 4,
      weeks: [
        {
          weekNumber: 6,
          phase: 'Build',
          totalVolumeMin: 300,
          volumeByDiscipline: {},
          easyPercent: 80,
          hardPercent: 20,
          days: [{ date: '2026-06-15', workoutIds: [] }],
        },
      ],
    })

    const state = selectOpeningState({ plans: [plan], races: [], workouts: [], today: '2026-06-15' })

    expect(state.activePlan?.progressPercent).toBe(100)
    expect(state.activePlan?.weekLabel).toBe('Semaine 06 / 4')
  })
})
