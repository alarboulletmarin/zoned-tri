/**
 * Chemins de la section Outils. Les routes elles-mêmes sont déclarées dans `src/App.tsx` (voir le
 * rapport de reprise) ; ce module ne porte que leur construction, pour qu'aucun écran n'écrive une
 * URL à la main.
 */
export const TOOLS_PATH = '/tools'
export const CALCULATORS_PATH = '/tools/calculateurs'
export const IMPORT_EXPORT_PATH = '/import-export'

export function calculatorPath(id: string): string {
  return `${CALCULATORS_PATH}/${id}`
}
