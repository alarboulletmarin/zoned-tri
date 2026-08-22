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

/**
 * Contexte d'une feuille d'export, porté par l'URL.
 *
 * La feuille annonce ce que contient chaque fichier avant de l'écrire (règle nº 2) : elle doit donc
 * savoir CE QU'ON EXPORTE. Depuis la Semaine on veut la semaine regardée, pas la semaine en cours ;
 * depuis une fiche, cette séance. Le contexte vit dans l'URL et non dans l'état de navigation :
 * une adresse d'export se partage, se met en favori et survit à un rafraîchissement — et
 * `ExportSheetRoute` n'a rien à deviner.
 */
export interface ExportSheetContext {
  /** Rang de la semaine à exporter dans le plan. Absent = la semaine en cours. */
  week?: number
  /** Séance visée par les formats `.FIT` et `.ZWO`. Absente = la séance du jour. */
  workoutId?: string
}

export function exportSheetPath(context: ExportSheetContext = {}): string {
  const params = new URLSearchParams()
  if (context.week !== undefined && Number.isFinite(context.week)) params.set('semaine', String(context.week))
  if (context.workoutId) params.set('seance', context.workoutId)
  const query = params.toString()
  return query ? `${EXPORTS_PATH}?${query}` : EXPORTS_PATH
}
