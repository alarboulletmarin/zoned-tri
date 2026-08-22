// Catalogue des 4 formats de triathlon proposés à l'étape G1 du générateur.
// Les distances et les durées minimales de préparation sont celles écrites dans le canevas
// (écran G1) — aucune n'est inventée ici.

import type { PlanFormat, RaceDistances } from '../types'

export interface RaceFormatDefinition {
  format: PlanFormat
  distances: RaceDistances
  /** Plancher de préparation annoncé par le canevas (« 16 sem. min. » pour un 70.3). */
  minWeeks: number
  /** « 1,9 km · 90 km · 21,1 km » — sous-titre de la ligne de format. */
  distancesLabel: string
  /** « 1,9 km · 90 km · 21,1 km · 16 sem. min. » — ligne complète du canevas G1. */
  metaLabel: string
}

function meta(distancesLabel: string, minWeeks: number): string {
  return `${distancesLabel} · ${minWeeks} sem. min.`
}

export const RACE_FORMATS: RaceFormatDefinition[] = [
  {
    format: 'Sprint',
    distances: { swimM: 750, bikeKm: 20, runKm: 5 },
    minWeeks: 8,
    distancesLabel: '750 m · 20 km · 5 km',
    metaLabel: meta('750 m · 20 km · 5 km', 8),
  },
  {
    format: 'Olympique',
    distances: { swimM: 1500, bikeKm: 40, runKm: 10 },
    minWeeks: 11,
    distancesLabel: '1,5 km · 40 km · 10 km',
    metaLabel: meta('1,5 km · 40 km · 10 km', 11),
  },
  {
    format: '70.3',
    distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
    minWeeks: 16,
    distancesLabel: '1,9 km · 90 km · 21,1 km',
    metaLabel: meta('1,9 km · 90 km · 21,1 km', 16),
  },
  {
    format: 'Ironman',
    distances: { swimM: 3800, bikeKm: 180, runKm: 42.2 },
    minWeeks: 24,
    distancesLabel: '3,8 km · 180 km · 42,2 km',
    metaLabel: meta('3,8 km · 180 km · 42,2 km', 24),
  },
]

const BY_FORMAT = new Map(RACE_FORMATS.map((definition) => [definition.format, definition]))

export function raceFormat(format: PlanFormat): RaceFormatDefinition {
  const definition = BY_FORMAT.get(format)
  // Le type `PlanFormat` n'a que ces 4 valeurs : une absence signale une table désynchronisée,
  // pas une entrée utilisateur — on échoue tout de suite plutôt que de rendre un écran vide.
  if (!definition) throw new Error(`Format de course inconnu : ${format}`)
  return definition
}

/**
 * Format le plus exigeant qui tient dans `weeks` semaines de préparation, ou `undefined` quand
 * même le plus court (Sprint) ne tient pas. Sert au repli proposé par l'écran 06 · Simulation.
 */
export function largestFormatWithin(weeks: number): RaceFormatDefinition | undefined {
  return [...RACE_FORMATS].reverse().find((definition) => definition.minWeeks <= weeks)
}
