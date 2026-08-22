/**
 * « Ce qui s'en rapproche le plus » de l'artboard 18.
 *
 * L'adresse est introuvable : par définition, rien ne la relie à une séance de la bibliothèque.
 * Le seul lien qui subsiste, c'est ce que l'adresse elle-même écrit — le canevas pointe
 * `/seance/8f2c-pyramide-css-v2`, et les mots de ce fragment (`pyramide`, `css`) sont exactement
 * ce qu'un lecteur reconnaîtrait. On cherche donc ces mots dans les titres, et on ne propose rien
 * quand aucun ne ressort : un rapprochement inventé serait pire qu'un vide nommé.
 */

import { searchWorkouts } from '../../domain/searchWorkouts'
import type { Workout } from '../../domain/types'

/** Trop court pour distinguer quoi que ce soit dans 312 titres. */
const MIN_TERM_LENGTH = 3

/** `8f2c`, `4b1e` : un fragment d'identifiant, pas un mot. */
function isIdentifierFragment(term: string): boolean {
  return /^[0-9a-f]+$/.test(term) || /^v?\d+$/.test(term)
}

/** Mots exploitables du dernier fragment d'une adresse. `/seance/8f2c-pyramide-css-v2` → pyramide, css. */
export function addressTerms(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments.at(-1)
  if (!last) return []

  let decoded = last
  try {
    decoded = decodeURIComponent(last)
  } catch {
    // Une adresse mal encodée reste une adresse : on la lit telle quelle plutôt que d'abandonner.
  }

  return decoded
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((term) => term.length >= MIN_TERM_LENGTH && !isIdentifierFragment(term))
}

/**
 * Les séances dont le titre porte le plus de mots de l'adresse. Liste vide = aucun rapprochement
 * honnête ; l'écran nomme alors le vide au lieu de proposer les deux premières venues.
 */
export function nearestWorkouts(workouts: Workout[], pathname: string, limit = 2): Workout[] {
  const terms = addressTerms(pathname)
  if (terms.length === 0) return []

  const scores = new Map<string, number>()
  for (const term of terms) {
    for (const match of searchWorkouts(workouts, term)) {
      scores.set(match.workout.id, (scores.get(match.workout.id) ?? 0) + 1)
    }
  }

  return workouts
    .filter((workout) => scores.has(workout.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || a.title.localeCompare(b.title, 'fr'))
    .slice(0, limit)
}
