import { describe, expect, it } from 'vitest'
import type { Workout } from './types'
import { SEED_WORKOUTS } from './seedWorkouts'
import {
  EMPTY_FILTERS,
  applyWorkoutFilters,
  buildActiveFilterChips,
  buildFilterCascade,
  countActiveFilterCategories,
  findNearestWorkouts,
  mostRestrictiveCategory,
  sortWorkouts,
  type WorkoutFilters,
} from './workoutFilters'

const workouts: Workout[] = [
  { id: 'n1', title: 'Natation Z2', discipline: 'N', zone: 'Z2', durationMin: 40, location: 'pool_25m', blocks: [], status: 'planned' },
  { id: 'n2', title: 'Natation Z4', discipline: 'N', zone: 'Z4', durationMin: 60, location: 'open_water', blocks: [], status: 'planned' },
  { id: 'v1', title: 'Vélo Z4', discipline: 'V', zone: 'Z4', durationMin: 75, location: 'home_trainer', blocks: [], status: 'planned' },
  { id: 'c1', title: 'Course brick', discipline: 'C', zone: 'Z2', isBrick: true, durationMin: 18, location: 'road', blocks: [], status: 'planned' },
]

describe('applyWorkoutFilters', () => {
  it('returns every workout when no filter is active', () => {
    expect(applyWorkoutFilters(workouts, EMPTY_FILTERS)).toHaveLength(4)
  })

  it('filters by discipline', () => {
    const result = applyWorkoutFilters(workouts, { ...EMPTY_FILTERS, disciplines: ['N'] })
    expect(result.map((w) => w.id)).toEqual(['n1', 'n2'])
  })

  it('filters by zone', () => {
    const result = applyWorkoutFilters(workouts, { ...EMPTY_FILTERS, zones: ['Z4'] })
    expect(result.map((w) => w.id)).toEqual(['n2', 'v1'])
  })

  it('filters by duration range', () => {
    const result = applyWorkoutFilters(workouts, { ...EMPTY_FILTERS, duration: { min: 45, max: 60 } })
    expect(result.map((w) => w.id)).toEqual(['n2'])
  })

  it('filters by location', () => {
    const result = applyWorkoutFilters(workouts, { ...EMPTY_FILTERS, locations: ['home_trainer'] })
    expect(result.map((w) => w.id)).toEqual(['v1'])
  })

  it('filters by brick flag independently of discipline selection', () => {
    const result = applyWorkoutFilters(workouts, { ...EMPTY_FILTERS, brickOnly: true })
    expect(result.map((w) => w.id)).toEqual(['c1'])
  })

  it('combines several categories with AND semantics', () => {
    const result = applyWorkoutFilters(workouts, { ...EMPTY_FILTERS, disciplines: ['N'], zones: ['Z4'] })
    expect(result.map((w) => w.id)).toEqual(['n2'])
  })
})

describe('countActiveFilterCategories', () => {
  it('is zero for empty filters', () => {
    expect(countActiveFilterCategories(EMPTY_FILTERS)).toBe(0)
  })

  it('counts categories, not individual values', () => {
    const filters: WorkoutFilters = { ...EMPTY_FILTERS, disciplines: ['N'], zones: ['Z2', 'Z4'], duration: { min: 45, max: 60 } }
    expect(countActiveFilterCategories(filters)).toBe(3)
  })
})

describe('buildActiveFilterChips', () => {
  it('builds one chip per category with a readable label', () => {
    const chips = buildActiveFilterChips({ ...EMPTY_FILTERS, disciplines: ['N'], zones: ['Z2', 'Z4'], duration: { min: 45, max: 60 } })
    expect(chips).toEqual([
      { category: 'discipline', label: 'Natation' },
      { category: 'zone', label: 'Z2 · Z4' },
      { category: 'duration', label: '45–60 min' },
    ])
  })

  it('appends Brick to the discipline chip when brickOnly is set', () => {
    const chips = buildActiveFilterChips({ ...EMPTY_FILTERS, brickOnly: true })
    expect(chips).toEqual([{ category: 'discipline', label: 'Brick' }])
  })
})

describe('sortWorkouts', () => {
  it('sorts by ascending duration', () => {
    const sorted = sortWorkouts(workouts, 'duration_asc')
    expect(sorted.map((w) => w.id)).toEqual(['c1', 'n1', 'n2', 'v1'])
  })

  it('sorts by descending duration without mutating the input', () => {
    const sorted = sortWorkouts(workouts, 'duration_desc')
    expect(sorted.map((w) => w.id)).toEqual(['v1', 'n2', 'n1', 'c1'])
    expect(workouts.map((w) => w.id)).toEqual(['n1', 'n2', 'v1', 'c1'])
  })
})

describe('mostRestrictiveCategory', () => {
  it('returns null when no filter is active', () => {
    expect(mostRestrictiveCategory(workouts, EMPTY_FILTERS)).toBeNull()
  })

  it('names the category whose removal would gain the most results', () => {
    const filters: WorkoutFilters = { ...EMPTY_FILTERS, disciplines: ['N'], duration: { min: 55, max: 60 } }
    expect(mostRestrictiveCategory(workouts, filters)).toBe('duration')
  })
})

describe('buildFilterCascade · artboard 26', () => {
  it('gives what is LEFT after each filter, in the order of the chips', () => {
    const filters: WorkoutFilters = {
      ...EMPTY_FILTERS,
      disciplines: ['N'],
      zones: ['Z4'],
      duration: { min: 55, max: 65 },
      locations: ['pool_25m'],
    }
    expect(buildFilterCascade(workouts, filters)).toEqual([
      { category: 'discipline', label: 'Natation', count: 2 },
      { category: 'zone', label: 'Z4', count: 1 },
      { category: 'duration', label: '55–65 min', count: 1 },
      { category: 'location', label: 'Bassin 25 m', count: 0 },
    ])
  })

  it('is empty without an active filter — there is no cost to name', () => {
    expect(buildFilterCascade(workouts, EMPTY_FILTERS)).toEqual([])
  })

  it('always ends on the number of results actually shown', () => {
    const filters: WorkoutFilters = { ...EMPTY_FILTERS, disciplines: ['N'], zones: ['Z2'] }
    const cascade = buildFilterCascade(SEED_WORKOUTS, filters)
    expect(cascade.at(-1)?.count).toBe(applyWorkoutFilters(SEED_WORKOUTS, filters).length)
  })
})

describe('findNearestWorkouts · artboard 26', () => {
  it('ranks by the number of filters missed, closest first', () => {
    const filters: WorkoutFilters = {
      ...EMPTY_FILTERS,
      disciplines: ['N'],
      zones: ['Z2'],
      duration: { min: 55, max: 65 },
    }
    const nearest = findNearestWorkouts(workouts, filters, 3)
    // n1 : natation Z2, mais 40 min — la durée seule manque. n2 : natation dans la durée, mais Z4.
    // c1 : Z2 seulement — deux filtres manqués, il passe donc derrière.
    expect(nearest.map((entry) => entry.workout.id)).toEqual(['n1', 'n2', 'c1'])
    expect(nearest[0].missedCategories).toEqual(['duration'])
    expect(nearest[1].missedCategories).toEqual(['zone'])
    expect(nearest[2].missedCategories).toEqual(['discipline', 'duration'])
  })

  it('leaves out what satisfies nothing — that is not close, that is unrelated', () => {
    const filters: WorkoutFilters = { ...EMPTY_FILTERS, disciplines: ['N'] }
    expect(findNearestWorkouts(workouts, filters)).toEqual([])
  })

  it('proposes nothing without an active filter', () => {
    expect(findNearestWorkouts(workouts, EMPTY_FILTERS)).toEqual([])
  })

  it('never returns a workout that already passes every filter', () => {
    const filters: WorkoutFilters = { ...EMPTY_FILTERS, disciplines: ['N'], zones: ['Z2'] }
    const passing = new Set(applyWorkoutFilters(SEED_WORKOUTS, filters).map((workout) => workout.id))
    for (const entry of findNearestWorkouts(SEED_WORKOUTS, filters, 10)) {
      expect(passing.has(entry.workout.id)).toBe(false)
    }
  })
})

describe('against the real seed catalogue', () => {
  it('N discipline filter matches only swim workouts', () => {
    const result = applyWorkoutFilters(SEED_WORKOUTS, { ...EMPTY_FILTERS, disciplines: ['N'] })
    expect(result.every((w) => w.discipline === 'N')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})
