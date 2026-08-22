// Recherche locale dans le catalogue de séances (écran 25 · Recherche en place).
// L'artboard groupe ses résultats par nature — « Séances · 41 », « Calculateurs · 2 »,
// « Dans mon plan · 5 ». Une seule mécanique de correspondance sert les trois : `findTextMatch`.
// Le regroupement, lui, appartient à l'écran, qui seul connaît les corpus disponibles.

import type { Workout } from './types'

export interface TextMatch {
  start: number
  end: number
}

/**
 * Position du terme dans un intitulé, ou `null`. Insensible à la casse, sensible aux accents :
 * le canevas surligne le terme EXACT tel qu'il est écrit dans le titre (25 l. 2903), et un
 * dépliage d'accents surlignerait des lettres que l'utilisateur n'a pas tapées.
 */
export function findTextMatch(text: string, query: string): TextMatch | null {
  const needle = query.trim().toLowerCase()
  if (!needle) return null
  const start = text.toLowerCase().indexOf(needle)
  return start === -1 ? null : { start, end: start + needle.length }
}

export interface WorkoutSearchMatch {
  workout: Workout
  matchStart: number
  matchEnd: number
}

export function searchWorkouts(workouts: Workout[], query: string): WorkoutSearchMatch[] {
  const matches: WorkoutSearchMatch[] = []
  for (const workout of workouts) {
    const match = findTextMatch(workout.title, query)
    if (match) matches.push({ workout, matchStart: match.start, matchEnd: match.end })
  }
  return matches
}
