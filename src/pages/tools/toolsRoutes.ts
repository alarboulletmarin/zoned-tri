/**
 * Chemins de la section Outils. Les routes elles-mêmes sont déclarées dans `src/App.tsx` (voir le
 * rapport de reprise) ; ce module ne porte que leur construction, pour qu'aucun écran n'écrive une
 * URL à la main.
 */
export const TOOLS_PATH = '/tools'
export const CALCULATORS_PATH = '/tools/calculateurs'
export const IMPORT_EXPORT_PATH = '/import-export'

/**
 * L'écran d'écriture des références (`/tools/references`). Il n'était pas dans le canevas : celui-ci
 * dessine un bouton « Enregistrer une référence » et aucun écran derrière. Sans lui, les douze
 * calculateurs trouvent une FTP que rien ne sait retenir.
 */
export const REFERENCES_PATH = '/tools/references'

/** `?ref=ftp&valeur=248` — le report d'un résultat de calculateur dans le champ qui l'attend. */
export function referencesPath(report?: { ref: string; value: string }): string {
  if (!report) return REFERENCES_PATH
  return `${REFERENCES_PATH}?ref=${report.ref}&valeur=${encodeURIComponent(report.value)}`
}

export function calculatorPath(id: string): string {
  return `${CALCULATORS_PATH}/${id}`
}
