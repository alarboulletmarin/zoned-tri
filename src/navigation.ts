/**
 * Écran d'ouverture (mockups 01/01b/01c et S9/S9b/S9c) : porte d'entrée de l'application,
 * avant toute section. Sur desktop le canevas est explicite — « aucun rail, rien n'est encore
 * ouvert » — et la colonne sombre porte elle-même le mot-symbole ; la coquille s'efface donc
 * entièrement. Sur mobile en revanche l'en-tête standard (mot-symbole, recherche, burger) est
 * bien présent dans le canevas : seule la largeur desktop retire le chrome.
 */
export const OPENING_PATH = '/'

/**
 * « Mes plans » (artboard 41) : l'ouverture du produit dès que plusieurs plans coexistent —
 * on reprend, on archive, on en crée un second. C'est l'écran qui porte l'archive des plans, que
 * l'ouverture n'atteignait pas encore.
 */
export const PLANS_PATH = '/plans'

/** Vue macro du plan (artboard 04), atteinte depuis la Semaine. */
export const PLAN_MACRO_PATH = '/plan/macro'

/** 4 sections racines du produit (§8 de la research, écran S1/S4) — partagées entre BurgerMenu et AppShell. */
export interface RootSection {
  to: string
  label: string
}

/** Le compteur affiché à droite de chaque section vient de `buildMenuCounts` (src/domain/menuCounts.ts). */
export const ROOT_SECTIONS: RootSection[] = [
  { to: '/plan', label: 'Plan' },
  { to: '/workouts', label: 'Séances' },
  { to: '/races', label: 'Courses' },
  { to: '/tools', label: 'Outils' },
]

/**
 * Écrans rattachés à une section sans en porter le préfixe d'URL. Le générateur s'intitule
 * « Plan / Générer » dans le canevas : il appartient bien à la section Plan, même si sa route est
 * `/generate-plan`. Sans ce rattachement, l'en-tête desktop retomberait sur le mot-symbole et le
 * dupliquerait avec celui du rail.
 */
const SECTION_ALIASES: Record<string, string> = {
  '/generate-plan': '/plan',
}

/** Section racine à laquelle appartient un chemin, ou `undefined` hors des 4 sections. */
export function sectionForPath(pathname: string): RootSection | undefined {
  const aliased = SECTION_ALIASES[pathname] ?? pathname
  return ROOT_SECTIONS.find((section) => aliased.startsWith(section.to))
}
