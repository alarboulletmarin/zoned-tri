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

/**
 * Les quatre niveaux de zoom du plan, dans l'ordre du segment JOUR · SEMAINE · MOIS · SAISON du
 * canevas. Ils forment la section Plan à eux seuls : chacun montre le même plan, de plus ou moins
 * loin, et aucun n'est un cul-de-sac — le segment les relie tous entre eux.
 */
export const PLAN_PATH = '/plan'
export const WEEK_PATH = '/plan/semaine'

/**
 * Adresses de la Bibliothèque et d'une fiche de séance.
 *
 * Elles étaient écrites à la main dans neuf fichiers, sous forme de gabarits — et c'est en partie
 * pour ça que presque rien n'était un lien : construire une adresse dans du JSX coûtait plus cher
 * que d'appeler `navigate()`. Une fonction, et le coût disparaît.
 */
export const WORKOUTS_PATH = '/workouts'

export function workoutPath(id: string): string {
  return `${WORKOUTS_PATH}/${id}`
}

/**
 * La semaine, éventuellement une semaine précise. `PlanWeekRoute` lit déjà `?semaine=N` : c'est ce
 * qui permet aux dix-huit barres de la Saison de mener chacune à SA semaine.
 */
export function weekPath(weekNumber?: number): string {
  return weekNumber === undefined ? WEEK_PATH : `${WEEK_PATH}?semaine=${weekNumber}`
}

/** Mois (artboard 04m) : « le niveau qui manquait entre la semaine et la saison ». */
export const PLAN_MONTH_PATH = '/plan/mois'

/** Vue macro du plan (artboard 04) — le canevas l'intitule désormais « segment SAISON ». */
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
 * Destinations que les deux navigations proposent en plus des quatre sections.
 *
 * Le rail desktop n'en portait AUCUNE et le panneau burger en portait trois : trois destinations du
 * produit — dont la génération d'un plan, qui est la porte d'entrée — n'existaient qu'en dessous de
 * 1024 px. Les deux navigations lisent désormais la même liste, ce qui rend l'écart impossible à
 * réintroduire sans le voir.
 *
 * « Réglages » vit à part : le canevas le pose en pied de rail (S4) et en dernière action du
 * panneau (S1). Même destination, deux placements — la liste ne peut donc pas le porter.
 */
export interface MenuAction {
  to: string
  label: string
}

export const MENU_ACTIONS: MenuAction[] = [
  { to: '/generate-plan', label: 'Générer un plan' },
  { to: PLANS_PATH, label: 'Mes plans' },
  { to: '/import-export', label: 'Import / export' },
]

export const SETTINGS_ACTION: MenuAction = { to: '/settings', label: 'Réglages' }

/**
 * Écrans rattachés à une section sans en porter le préfixe d'URL. Le générateur s'intitule
 * « Plan / Générer » dans le canevas : il appartient bien à la section Plan, même si sa route est
 * `/generate-plan`. Sans ce rattachement, l'en-tête desktop retomberait sur le mot-symbole et le
 * dupliquerait avec celui du rail.
 *
 * L'import-export porte le fil « Outils / Import-export » : il appartient donc aux Outils, et le
 * rail doit y allumer Outils plutôt que de s'éteindre entièrement.
 */
const SECTION_ALIASES: Record<string, string> = {
  '/generate-plan': '/plan',
  '/import-export': '/tools',
  '/import-export/import': '/tools',
}

/** Section racine à laquelle appartient un chemin, ou `undefined` hors des 4 sections. */
export function sectionForPath(pathname: string): RootSection | undefined {
  const aliased = SECTION_ALIASES[pathname] ?? pathname
  return ROOT_SECTIONS.find((section) => aliased.startsWith(section.to))
}

/**
 * Destination des segments du fil d'Ariane, par intitulé.
 *
 * Le canevas écrit le fil « Plan / Semaine », « Courses / 70.3 Vichy / Pacing » : chaque segment
 * nomme un écran qui existe, il doit donc y mener. Un fil qui ne se remonte pas est un cul-de-sac,
 * et la méthode l'interdit. Les intitulés sont peu nombreux et stables — ce sont les sections et
 * leurs écrans intermédiaires ; tout le reste (le nom d'une course, « Introuvable ») n'a pas de
 * destination fixe et reste du texte, ou passe une destination explicite (`{ label, to }`).
 */
const TRAIL_DESTINATIONS: Record<string, string> = {
  Plan: '/plan',
  Semaine: '/plan/semaine',
  Mois: '/plan/mois',
  Saison: PLAN_MACRO_PATH,
  'Mes plans': PLANS_PATH,
  Séances: '/workouts',
  Courses: '/races',
  Outils: '/tools',
  Calculateurs: '/tools/calculateurs',
  Exporter: '/exports',
  'Import-export': '/import-export',
  Réglages: '/settings',
  /* « Réglages » tout court mène aux réglages de l'application. Les écrans du plan écrivent donc
     « Réglages du plan » — le libellé qui mène à `/plan/reglages`. Deux écrans différents ne
     peuvent pas partager un segment : un fil d'Ariane qui ment est pire que pas de fil du tout. */
  'Réglages du plan': '/plan/reglages',
}

/** Un segment de fil : un intitulé seul (destination déduite) ou un couple explicite. */
export type TrailSegment = string | { label: string; to: string }

export function trailLabel(segment: TrailSegment): string {
  return typeof segment === 'string' ? segment : segment.label
}

/** Destination d'un segment, ou `undefined` s'il ne mène nulle part (nom de course, « Introuvable »). */
export function trailDestination(segment: TrailSegment): string | undefined {
  if (typeof segment !== 'string') return segment.to
  return TRAIL_DESTINATIONS[segment]
}

/**
 * Titre de l'onglet du navigateur, construit depuis le fil d'Ariane : « Semaine · Plan · Zoned Tri ».
 *
 * Sans lui, les dix-huit écrans du produit partagent un seul et même titre — l'historique du
 * navigateur, les favoris et les onglets deviennent illisibles, et un lien partagé ne dit pas ce
 * qu'il ouvre. Le fil est déjà la hiérarchie de l'écran : on le lit à l'envers, du courant au
 * parent, comme le fait tout navigateur.
 */
export const APP_NAME = 'Zoned Tri'

export function documentTitleFromTrail(trail: TrailSegment[]): string {
  const labels = trail.map(trailLabel).filter(Boolean)
  if (labels.length === 0) return APP_NAME
  return [...labels].reverse().concat(APP_NAME).join(' · ')
}
