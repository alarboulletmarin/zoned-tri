/**
 * Adresses des sorties fichier — artboards 20 à 24.
 *
 * Elles vivent ici et non dans `App.tsx` pour que les écrans appelants (Aujourd'hui, Semaine,
 * Séance, Courses) s'y réfèrent par une constante et jamais par une chaîne écrite deux fois.
 * Le câblage des `<Route>` reste à faire — voir le rapport de reprise.
 */

/** Artboard 20 · la feuille d'export, appelée depuis n'importe quel écran. */
export const EXPORTS_PATH = '/exports'

/** Artboards 21 + 22 · le document A4, atlas des zones puis plan, prêt à imprimer. */
export const EXPORTS_PRINT_PATH = '/exports/impression'

/** Artboard 23 · la carte de séance, avec son écriture en PNG 1080. */
export const EXPORTS_CARD_PATH = '/exports/carte'

/** `/exports/carte/demo-workout-swim-css-pyramid`. */
export function exportCardPath(workoutId: string): string {
  return `${EXPORTS_CARD_PATH}/${workoutId}`
}
