// Chemins de la section Courses. Un seul endroit les écrit : les écrans naviguent par ces
// fonctions, jamais par des littéraux dispersés.

export const RACES_PATH = '/races'

export type RaceSubScreen = 'pacing' | 'nutrition' | 'jour-j' | 'checklist'

export function racePath(raceId: string, sub?: RaceSubScreen): string {
  return sub ? `${RACES_PATH}/${raceId}/${sub}` : `${RACES_PATH}/${raceId}`
}
