// Filtrage de la bibliothèque de séances (écran 07 · Bibliothèque + écran 40 · Feuille de filtres).
// Pur, sans dépendance UI : consommé par WorkoutsScreen et FilterSheet.

import type { Discipline, Workout, WorkoutLocation, Zone } from './types'
import { DISCIPLINE_LABELS, LOCATION_LABELS } from './workoutFormat'

export interface DurationRange {
  min: number
  max: number
}

export interface WorkoutFilters {
  disciplines: Discipline[]
  brickOnly: boolean
  zones: Zone[]
  duration: DurationRange | null
  locations: WorkoutLocation[]
}

export const EMPTY_FILTERS: WorkoutFilters = {
  disciplines: [],
  brickOnly: false,
  zones: [],
  duration: null,
  locations: [],
}

export type FilterCategory = 'discipline' | 'zone' | 'duration' | 'location'

/**
 * Ordre des catégories — celui de la feuille de filtres (artboard 40 : Discipline, Zone, Durée,
 * puis Matériel / Lieu). Les jetons de la liste (07, S5), la cascade de coûts (26) et la feuille
 * s'énumèrent donc tous dans le même ordre : l'utilisateur lit trois fois la même suite.
 */
const CATEGORY_ORDER: FilterCategory[] = ['discipline', 'zone', 'duration', 'location']

/**
 * Un prédicat PAR catégorie, et non un unique `matchesFilters` monolithique : l'artboard 26 demande
 * de savoir ce que coûte CHAQUE filtre pris séparément (« 84 → 7 → 3 → 0 ») et quelles séances
 * échouent sur une seule catégorie (« Les plus proches »). Sans découpage, ces deux réponses
 * exigeraient de refaire le filtrage à la main ailleurs.
 *
 * `brickOnly` vit dans `discipline` parce que « Brick » est une étiquette transverse posée sur des
 * séances déjà comptées en N/V/C, jamais une cinquième discipline (artboard 40 : le jeton est dans
 * la rangée Discipline ; aucune ligne de liste ne le porte).
 */
const CATEGORY_MATCHERS: Record<FilterCategory, (workout: Workout, filters: WorkoutFilters) => boolean> = {
  discipline: (workout, filters) => {
    if (filters.disciplines.length > 0 && !filters.disciplines.includes(workout.discipline)) return false
    if (filters.brickOnly && !workout.isBrick) return false
    return true
  },
  zone: (workout, filters) =>
    filters.zones.length === 0 || (Boolean(workout.zone) && filters.zones.includes(workout.zone!)),
  duration: (workout, filters) =>
    !filters.duration ||
    (workout.durationMin >= filters.duration.min && workout.durationMin <= filters.duration.max),
  location: (workout, filters) =>
    filters.locations.length === 0 ||
    (Boolean(workout.location) && filters.locations.includes(workout.location!)),
}

function matchesFilters(workout: Workout, filters: WorkoutFilters): boolean {
  return CATEGORY_ORDER.every((category) => CATEGORY_MATCHERS[category](workout, filters))
}

export function applyWorkoutFilters(workouts: Workout[], filters: WorkoutFilters): Workout[] {
  return workouts.filter((workout) => matchesFilters(workout, filters))
}

export function activeFilterCategories(filters: WorkoutFilters): FilterCategory[] {
  const categories: FilterCategory[] = []
  if (filters.disciplines.length > 0 || filters.brickOnly) categories.push('discipline')
  if (filters.zones.length > 0) categories.push('zone')
  if (filters.duration) categories.push('duration')
  if (filters.locations.length > 0) categories.push('location')
  return categories
}

export function countActiveFilterCategories(filters: WorkoutFilters): number {
  return activeFilterCategories(filters).length
}

export function relaxFilterCategory(filters: WorkoutFilters, category: FilterCategory): WorkoutFilters {
  switch (category) {
    case 'discipline':
      return { ...filters, disciplines: [], brickOnly: false }
    case 'zone':
      return { ...filters, zones: [] }
    case 'duration':
      return { ...filters, duration: null }
    case 'location':
      return { ...filters, locations: [] }
  }
}

export interface FilterChip {
  category: FilterCategory
  label: string
}

export function buildActiveFilterChips(filters: WorkoutFilters): FilterChip[] {
  const chips: FilterChip[] = []
  if (filters.disciplines.length > 0 || filters.brickOnly) {
    const labels = filters.disciplines.map((discipline) => DISCIPLINE_LABELS[discipline])
    if (filters.brickOnly) labels.push('Brick')
    chips.push({ category: 'discipline', label: labels.join(' · ') })
  }
  if (filters.zones.length > 0) {
    chips.push({ category: 'zone', label: filters.zones.join(' · ') })
  }
  if (filters.duration) {
    chips.push({ category: 'duration', label: `${filters.duration.min}–${filters.duration.max} min` })
  }
  if (filters.locations.length > 0) {
    chips.push({ category: 'location', label: filters.locations.map((location) => LOCATION_LABELS[location]).join(' · ') })
  }
  return chips
}

/** Catégorie de filtre dont le retrait ferait gagner le plus de résultats — celle qui « coûte » le plus (écran 26). */
export function mostRestrictiveCategory(workouts: Workout[], filters: WorkoutFilters): FilterCategory | null {
  const categories = activeFilterCategories(filters)
  if (categories.length === 0) return null
  const currentCount = applyWorkoutFilters(workouts, filters).length
  let worstCategory: FilterCategory | null = null
  let worstGain = -1
  for (const category of categories) {
    const relaxed = relaxFilterCategory(filters, category)
    const gain = applyWorkoutFilters(workouts, relaxed).length - currentCount
    if (gain > worstGain) {
      worstGain = gain
      worstCategory = category
    }
  }
  return worstCategory
}

/**
 * Cascade de coûts de l'artboard 26 (l. 2963-2966) : « 84 → 7 → 3 → 0 », légendée
 * « natation · + Z6 · + eau libre · + moins de 30′ ». Chaque étape donne ce qu'il RESTE une fois
 * le filtre ajouté aux précédents — c'est ce qui rend le coût de chacun lisible.
 *
 * L'ordre et les libellés sont ceux de `buildActiveFilterChips` : la cascade et la rangée de
 * jetons au-dessus d'elle doivent énumérer la même suite, sinon la lecture ne se recoupe pas.
 * (Le mock intervertit « eau libre » et « moins de 30′ » par rapport à ses propres jetons ; on
 * suit l'ordre des jetons, seul ordre que l'écran puisse tenir pour un filtre quelconque.)
 */
export interface FilterCascadeStep {
  category: FilterCategory
  /** Le libellé du jeton correspondant, tel quel : « Natation », « Z2 · Z4 », « 45–60 min ». */
  label: string
  /** Séances restantes une fois CE filtre ajouté à tous ceux qui le précèdent. */
  count: number
}

export function buildFilterCascade(workouts: Workout[], filters: WorkoutFilters): FilterCascadeStep[] {
  let kept = workouts
  return buildActiveFilterChips(filters).map((chip) => {
    kept = kept.filter((workout) => CATEGORY_MATCHERS[chip.category](workout, filters))
    return { category: chip.category, label: chip.label, count: kept.length }
  })
}

/**
 * « Les plus proches » de l'artboard 26 (l. 2968-2973) : les séances qui échouent sur le moins de
 * catégories possible. Une séance qui n'en satisfait aucune n'est proche de rien et ne compte pas.
 *
 * `missedCategories` sert à dire POURQUOI elle est seulement proche — l'écran ne montre jamais un
 * résultat sans dire ce qui l'en sépare.
 */
export interface NearestWorkout {
  workout: Workout
  missedCategories: FilterCategory[]
}

export function findNearestWorkouts(
  workouts: Workout[],
  filters: WorkoutFilters,
  limit = 2,
): NearestWorkout[] {
  const categories = activeFilterCategories(filters)
  if (categories.length === 0) return []
  return workouts
    .map((workout) => ({
      workout,
      missedCategories: categories.filter((category) => !CATEGORY_MATCHERS[category](workout, filters)),
    }))
    .filter((entry) => entry.missedCategories.length > 0 && entry.missedCategories.length < categories.length)
    .sort((a, b) => a.missedCategories.length - b.missedCategories.length)
    .slice(0, limit)
}

export type SortKey = 'duration_asc' | 'duration_desc'

export function sortWorkouts(workouts: Workout[], sortKey: SortKey): Workout[] {
  const sorted = [...workouts]
  sorted.sort((a, b) => (sortKey === 'duration_asc' ? a.durationMin - b.durationMin : b.durationMin - a.durationMin))
  return sorted
}
