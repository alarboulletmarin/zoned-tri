import { CALCULATORS, calculatorCounter } from '../pages/tools/calculators/registry'
import { calculatorPath, IMPORT_EXPORT_PATH, CALCULATORS_PATH, TOOLS_PATH } from '../pages/tools/toolsRoutes'
import { racePath, RACES_PATH } from '../pages/races/routes'
import { PLAN_JOURNAL_PATH, PLAN_SETTINGS_PATH } from '../pages/planSettings/planSettingsRoutes'
import { EXPORTS_PATH } from '../pages/exports/exportsRoutes'
import {
  GENERATOR_PATH,
  PLANS_PATH,
  PLAN_MACRO_PATH,
  PLAN_MONTH_PATH,
  PLAN_PATH,
  WEEK_PATH,
  WORKOUTS_PATH,
  workoutPath,
} from '../navigation'
import { findTextMatch, type TextMatch } from './searchWorkouts'
import type { Race, Workout } from './types'

/**
 * Ce que la loupe sait trouver.
 *
 * L'artboard 25 dessine trois natures — « Séances », « Calculateurs », « Dans mon plan » — et le
 * produit n'en servait que deux. Chercher « Vichy », « import », « journal » ou « nutrition » ne
 * rendait rien : ni les courses enregistrées, ni les écrans du produit n'étaient cherchables. Sur
 * une application dont l'utilisateur dit lui-même avoir « du mal à naviguer et explorer », la
 * recherche était le raccourci qui aurait dû réparer ça, et elle ne portait que le catalogue.
 *
 * ÉCART ASSUMÉ au canevas : deux natures s'ajoutent aux trois dessinées — « Courses » et
 * « Écrans ». Elles n'inventent aucune donnée (règle nº 4) : une course vient de la base, un écran
 * est une route qui existe et son intitulé est celui de son bandeau.
 */
export type SearchNature = 'workout' | 'calculator' | 'race' | 'screen'

export interface SearchEntry {
  id: string
  nature: SearchNature
  /** L'intitulé cherché ET surligné : c'est le nom que l'écran porte, jamais une reformulation. */
  title: string
  /** Ligne mono de droite : le compteur d'un calculateur, la date d'une course, le fil d'un écran. */
  meta: string
  to: string
  /**
   * Mots par lesquels on cherche cet écran sans en connaître le nom — « sauvegarde » pour
   * l'import-export, « FTP » pour les réglages. Ils font TROUVER, jamais surligner : rien ne les
   * écrit à l'écran, et surligner un mot absent du titre serait un mensonge d'affichage.
   */
  keywords?: string[]
}

export interface SearchHit {
  entry: SearchEntry
  /** `null` quand la correspondance vient d'un mot-clé et non de l'intitulé : rien à surligner. */
  match: TextMatch | null
}

/**
 * Les écrans du produit, tels qu'ils s'appellent dans leur bandeau.
 *
 * Ne figurent ici que les destinations qu'on peut atteindre sans contexte : pas les sous-écrans
 * d'une course (ils dépendent de la course), pas les fiches de séance (elles sont déjà la nature
 * « Séances »), pas les aperçus d'atelier.
 */
export const SEARCHABLE_SCREENS: SearchEntry[] = [
  { id: 'screen-plan', nature: 'screen', title: 'Aujourd’hui', meta: 'Plan', to: PLAN_PATH },
  { id: 'screen-semaine', nature: 'screen', title: 'Semaine', meta: 'Plan / Semaine', to: WEEK_PATH },
  { id: 'screen-mois', nature: 'screen', title: 'Mois', meta: 'Plan / Mois', to: PLAN_MONTH_PATH },
  { id: 'screen-saison', nature: 'screen', title: 'Saison', meta: 'Plan / Saison', to: PLAN_MACRO_PATH },
  {
    id: 'screen-generateur',
    nature: 'screen',
    title: 'Générer un plan',
    meta: 'Plan / Générer',
    to: GENERATOR_PATH,
    keywords: ['nouveau plan', 'créer', 'questions'],
  },
  { id: 'screen-plans', nature: 'screen', title: 'Mes plans', meta: 'Plan', to: PLANS_PATH, keywords: ['archive', 'archivés', 'reprendre'] },
  {
    id: 'screen-reglages-plan',
    nature: 'screen',
    title: 'Réglages du plan',
    meta: 'Plan / Réglages',
    to: PLAN_SETTINGS_PATH,
    keywords: ['volume', 'jours', 'matériel', 'semaines allégées'],
  },
  {
    id: 'screen-journal',
    nature: 'screen',
    title: 'Journal du plan',
    meta: 'Plan / Réglages / Journal',
    to: PLAN_JOURNAL_PATH,
    keywords: ['historique', 'changements'],
  },
  { id: 'screen-workouts', nature: 'screen', title: 'Bibliothèque', meta: 'Séances', to: WORKOUTS_PATH },
  { id: 'screen-races', nature: 'screen', title: 'Mes courses', meta: 'Courses', to: RACES_PATH },
  { id: 'screen-tools', nature: 'screen', title: 'Mes références', meta: 'Outils', to: TOOLS_PATH, keywords: ['profil', 'FTP', 'CSS', 'VMA', 'seuil'] },
  { id: 'screen-calculateurs', nature: 'screen', title: 'Calculateurs', meta: 'Outils / Calculateurs', to: CALCULATORS_PATH },
  {
    id: 'screen-import-export',
    nature: 'screen',
    title: 'Import / export',
    meta: 'Outils / Import-export',
    to: IMPORT_EXPORT_PATH,
    keywords: ['sauvegarde', 'json', 'restaurer', 'synchro'],
  },
  {
    id: 'screen-exports',
    nature: 'screen',
    title: 'Exporter',
    meta: 'Plan / Exporter',
    to: EXPORTS_PATH,
    keywords: ['fit', 'zwo', 'ics', 'pdf', 'calendrier', 'montre'],
  },
]

const CALCULATOR_ENTRIES: SearchEntry[] = CALCULATORS.map((definition) => ({
  id: `calculator-${definition.id}`,
  nature: 'calculator' as const,
  title: definition.cardTitle,
  meta: calculatorCounter(definition),
  to: calculatorPath(definition.id),
  keywords: [definition.cardDescription],
}))

function workoutEntry(workout: Workout): SearchEntry {
  return {
    id: `workout-${workout.id}`,
    nature: 'workout',
    title: workout.title,
    meta: `${workout.durationMin} min`,
    to: workoutPath(workout.id),
  }
}

function raceEntry(race: Race): SearchEntry {
  return {
    id: `race-${race.id}`,
    nature: 'race',
    title: race.name,
    meta: `${race.format} · ${race.date}`,
    to: racePath(race.id),
    keywords: [race.format],
  }
}

/** Le corpus complet, dans l'ordre où les natures s'affichent. */
export function buildSearchCorpus(input: { workouts: Workout[]; races: Race[] }): SearchEntry[] {
  return [
    ...input.workouts.map(workoutEntry),
    ...CALCULATOR_ENTRIES,
    ...input.races.map(raceEntry),
    ...SEARCHABLE_SCREENS,
  ]
}

/**
 * Les résultats, intitulé d'abord.
 *
 * Une correspondance dans l'intitulé passe avant une correspondance de mot-clé : chercher
 * « nutrition » doit ouvrir le calculateur qui porte ce nom avant l'écran qu'un mot-clé rattache
 * au même terme.
 */
export function searchCorpus(entries: SearchEntry[], query: string): SearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const byTitle: SearchHit[] = []
  const byKeyword: SearchHit[] = []

  for (const entry of entries) {
    const match = findTextMatch(entry.title, trimmed)
    if (match) {
      byTitle.push({ entry, match })
      continue
    }
    if (entry.keywords?.some((keyword) => findTextMatch(keyword, trimmed))) {
      byKeyword.push({ entry, match: null })
    }
  }

  return [...byTitle, ...byKeyword]
}

/** Le libellé de groupe de l'artboard 25 : la nature, puis son compte. */
export const NATURE_LABEL: Record<SearchNature, string> = {
  workout: 'Séances',
  calculator: 'Calculateurs',
  race: 'Courses',
  screen: 'Écrans',
}

/** Ordre d'affichage des groupes — celui du canevas, les deux natures ajoutées à la suite. */
export const NATURE_ORDER: SearchNature[] = ['workout', 'calculator', 'race', 'screen']
