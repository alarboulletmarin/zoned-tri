// Chemins de la section Courses. Un seul endroit les écrit : les écrans naviguent par ces
// fonctions, jamais par des littéraux dispersés.

export const RACES_PATH = '/races'

export type RaceSubScreen = 'pacing' | 'nutrition' | 'jour-j' | 'checklist'

export function racePath(raceId: string, sub?: RaceSubScreen): string {
  return sub ? `${RACES_PATH}/${raceId}/${sub}` : `${RACES_PATH}/${raceId}`
}

/**
 * Créer et modifier une course. Ces deux adresses n'existaient pas : une course n'entrait que par
 * le générateur, et rien ne permettait de la corriger ni de la supprimer.
 */
export const NEW_RACE_PATH = `${RACES_PATH}/nouvelle`

export function raceEditPath(raceId: string): string {
  return `${RACES_PATH}/${raceId}/modifier`
}
