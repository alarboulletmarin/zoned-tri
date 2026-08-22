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
 * Repli d'un intitulé pour la comparaison : minuscules, accents retirés — mais lettre par lettre,
 * en gardant l'index d'origine de chacune.
 *
 * C'est tout l'enjeu : la recherche doit trouver « seuil velo » dans « Seuil vélo » — personne ne
 * tape ses accents dans un champ de recherche, et le produit est français. Mais le surlignage doit
 * porter sur le texte ORIGINAL, à l'accent près (25 l. 2903). Déplier la chaîne entière décalerait
 * les positions dès le premier accent ; on garde donc, pour chaque caractère replié, l'index du
 * caractère d'origine dont il vient.
 */
function fold(text: string): { folded: string; origin: number[] } {
  let folded = ''
  const origin: number[] = []

  for (let index = 0; index < text.length; index += 1) {
    const stripped = text[index]!.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    for (const character of stripped) {
      folded += character
      origin.push(index)
    }
  }
  // Sentinelle : la fin d'une correspondance qui va jusqu'au bout de la chaîne.
  origin.push(text.length)

  return { folded, origin }
}

/**
 * Position du terme dans un intitulé, ou `null`.
 *
 * Insensible à la casse ET aux accents pour TROUVER ; les bornes rendues sont celles du texte
 * original, pour SURLIGNER exactement ce que le titre écrit.
 */
export function findTextMatch(text: string, query: string): TextMatch | null {
  const needle = fold(query.trim()).folded
  if (!needle) return null

  const { folded, origin } = fold(text)
  const start = folded.indexOf(needle)
  if (start === -1) return null

  return { start: origin[start]!, end: origin[start + needle.length]! }
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
