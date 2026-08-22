/**
 * Chemins des trois écrans de réglages du plan (artboards 37, 38, 39). Les routes elles-mêmes sont
 * déclarées dans `src/App.tsx` ; ce module ne porte que leur construction, pour qu'aucun écran
 * n'écrive une URL à la main — même patron que `toolsRoutes.ts`, `systemRoutes.ts` et
 * `exportsRoutes.ts`.
 *
 * Ils vivaient jusqu'ici dans `PlanSettingsRoutes.tsx`, un module d'écrans : y lire une adresse
 * obligeait un appelant à importer trois composants et leurs dépendances pour une chaîne.
 */

/** Artboard 37 · les six réglages du plan, réouvrables après acceptation. */
export const PLAN_SETTINGS_PATH = '/plan/reglages'

/** Artboard 39 · le journal des changements, qui garde tout. */
export const PLAN_JOURNAL_PATH = '/plan/journal'

/** Artboard 38 · l'avant / après d'un réglage. */
export function planSettingPath(setting: string): string {
  return `${PLAN_SETTINGS_PATH}/${setting}`
}
