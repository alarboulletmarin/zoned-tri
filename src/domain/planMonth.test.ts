import { describe, expect, it } from 'vitest'
import { buildPlanMonthView } from './planMonth'
import type { PlanWeek, Race, TrainingPlan, Workout } from './types'

/** Août 2026 : le mois de l'artboard 04m. Le 1er tombe un samedi, le mois fait 31 jours. */
const TODAY = '2026-08-25'

function workout(id: string, discipline: Workout['discipline'], durationMin: number): Workout {
  return { id, title: id, discipline, zone: 'Z2', durationMin, blocks: [], status: 'planned' }
}

const CATALOGUE: Workout[] = [
  workout('swim', 'N', 55),
  workout('bike', 'V', 150),
  workout('run', 'C', 60),
  workout('rest', 'R', 25),
]

function week(weekNumber: number, monday: string, ids: string[][], overrides: Partial<PlanWeek> = {}): PlanWeek {
  const days = ids.map((workoutIds, index) => ({
    date: shift(monday, index),
    workoutIds,
  }))
  const total = days
    .flatMap((day) => day.workoutIds)
    .reduce((sum, id) => sum + (CATALOGUE.find((item) => item.id === id)?.durationMin ?? 0), 0)

  return {
    weekNumber,
    phase: 'Build',
    totalVolumeMin: total,
    volumeByDiscipline: {},
    days,
    easyPercent: 80,
    hardPercent: 20,
    ...overrides,
  }
}

function shift(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const EMPTY = [[], [], [], [], [], [], []] as string[][]

const PLAN: TrainingPlan = {
  id: 'plan',
  format: '70.3',
  startDate: '2026-07-27',
  endDate: '2026-09-06',
  weeksCount: 6,
  status: 'active',
  settings: { weeklyVolumeTargetMin: 450, availableDays: [true, true, true, true, false, true, true], maxSessionsPerDiscipline: { N: 2, V: 3, C: 3 } },
  constraints: { pool: true, openWater: false, homeTrainer: true, powerMeter: false, timeTrialBike: false, blockedWeeks: [] },
  referencesSnapshot: {},
  phases: [],
  intensityDistribution: { z1z2Percent: 80, z3Percent: 5, z4PlusPercent: 15 },
  weeks: [
    week(3, '2026-07-27', [['swim'], [], ['bike'], [], [], ['run'], []]),
    week(4, '2026-08-03', [['swim'], ['bike'], [], [], [], [], []], { blockedReason: 'Déplacement pro' }),
    week(5, '2026-08-10', [['bike'], ['run'], ['swim'], [], [], ['bike', 'run'], []]),
    week(6, '2026-08-17', EMPTY.map(() => [])),
    week(7, '2026-08-24', [['swim'], ['bike'], [], ['run'], [], [], []]),
    week(8, '2026-08-31', [['bike'], [], [], [], [], [], []]),
  ],
}

const RACES: Race[] = [
  { id: 'goal', name: '70.3 Vichy', date: '2026-11-09', format: '70.3', role: 'primary_goal', distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 } },
]

function view(overrides: Partial<Parameters<typeof buildPlanMonthView>[0]> = {}) {
  return buildPlanMonthView({ plan: PLAN, catalogue: CATALOGUE, today: TODAY, races: RACES, ...overrides })
}

describe('buildPlanMonthView', () => {
  it('names the month and the span of plan weeks it covers', () => {
    const month = view()
    expect(month.monthLabel).toBe('Août 2026')
    expect(month.spanLabel).toBe('Semaines 03 → 08 · bloc construction')
  })

  it('counts only training sessions, never the rest days', () => {
    // 6 semaines touchent août ; les séances d'août seules comptent — pas celles de juillet.
    expect(view().totalsLabel).toMatch(/^6 semaines · \d+ h( \d\d)? · \d+ séances en août$/)
  })

  it('draws whole weeks, from the Monday before the 1st to the Sunday after the last', () => {
    const days = view().days
    expect(days[0].date).toBe('2026-07-27')
    expect(days[days.length - 1].date).toBe('2026-09-06')
    expect(days.length % 7).toBe(0)
  })

  it('marks the days that spill out of the month without dropping them', () => {
    const days = view().days
    expect(days.find((day) => day.date === '2026-07-27')?.outsideMonth).toBe(true)
    expect(days.find((day) => day.date === '2026-08-01')?.outsideMonth).toBe(false)
    expect(days.find((day) => day.date === '2026-09-01')?.outsideMonth).toBe(true)
  })

  it('gives each day the discipline that carries the most minutes, and flags doubled days', () => {
    const days = view().days
    // Samedi 15 août : vélo 150 min et course 60 min — le vélo l'emporte, le jour est doublé.
    const doubled = days.find((day) => day.date === '2026-08-15')
    expect(doubled?.discipline).toBe('V')
    expect(doubled?.doubled).toBe(true)
  })

  it('lists every session of a doubled day, in order, instead of hiding the second', () => {
    const days = view().days
    // Le calendrier sert précisément à voir ce qu'on fait ce jour-là : « V » puis « C ».
    expect(days.find((day) => day.date === '2026-08-15')?.disciplines).toEqual(['V', 'C'])
    expect(days.find((day) => day.date === '2026-08-10')?.disciplines).toEqual(['V'])
    expect(days.find((day) => day.date === '2026-08-06')?.disciplines).toEqual([])
  })

  it('leaves a day without session empty rather than guessing one', () => {
    expect(view().days.find((day) => day.date === '2026-08-06')?.discipline).toBeNull()
  })

  it('marks today, and only today', () => {
    const marked = view().days.filter((day) => day.isToday)
    expect(marked.map((day) => day.date)).toEqual([TODAY])
  })

  it('says which days fall outside the plan', () => {
    const days = view({ plan: { ...PLAN, endDate: '2026-08-30' } }).days
    expect(days.find((day) => day.date === '2026-09-02')?.outsidePlan).toBe(true)
    expect(days.find((day) => day.date === '2026-08-25')?.outsidePlan).toBe(false)
  })

  it('carries the week number of each day, so a tap opens the right week', () => {
    expect(view().days.find((day) => day.date === '2026-08-25')?.weekNumber).toBe(7)
  })

  it('lists one row per plan week touching the month, in order', () => {
    expect(view().weeks.map((row) => row.label)).toEqual(['S03', 'S04', 'S05', 'S06', 'S07', 'S08'])
  })

  it('says where each week stands relative to today', () => {
    const rows = view().weeks
    expect(rows.find((row) => row.label === 'S03')?.statusLabel).toContain('faite')
    expect(rows.find((row) => row.label === 'S07')?.statusLabel).toContain('en cours')
    expect(rows.find((row) => row.label === 'S08')?.statusLabel).toContain('à venir')
  })

  it('names a blocked week as blocked, never as a mere recovery week', () => {
    expect(view().weeks.find((row) => row.label === 'S04')?.statusLabel).toContain('bloquée')
  })

  it('scales each week gauge against the heaviest week of the month', () => {
    const rows = view().weeks
    const heaviest = rows.reduce((max, row) => (row.volumePercent > max.volumePercent ? row : max))
    expect(heaviest.volumePercent).toBe(100)
    expect(rows.every((row) => row.volumePercent >= 0 && row.volumePercent <= 100)).toBe(true)
  })

  it('announces the next race when the month holds none', () => {
    expect(view().raceNote).toBe('aucune course en août · 70.3 Vichy le 9 nov.')
  })

  it('names the races of the month when there are some', () => {
    const withRace = view({
      races: [{ ...RACES[0], date: '2026-08-30' }],
    })
    expect(withRace.raceNote).toBe('70.3 Vichy le 30 août')
  })

  it('offers no arrow towards a month the plan does not reach', () => {
    const month = view({ anchor: '2026-07-15' })
    expect(month.previousMonth).toBeUndefined()
    expect(month.nextMonth).toBe('2026-08-01')
  })

  it('splits the month between the three triathlon disciplines, rest excluded', () => {
    const shares = view().shares
    expect(shares.map((share) => share.discipline).sort()).toEqual(['C', 'N', 'V'])
    expect(Math.round(shares.reduce((sum, share) => sum + share.percent, 0))).toBe(100)
  })
})
