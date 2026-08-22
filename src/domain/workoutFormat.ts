// Formatage d'affichage partagé par la bibliothèque, la recherche et les écrans de détail.
// Pure présentation : aucune donnée inventée, uniquement mise en forme de champs existants.

import type { Discipline, Zone, WorkoutLocation } from './types'

export type ZoneNumber = 1 | 2 | 3 | 4 | 5 | 6

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  N: 'Natation',
  V: 'Vélo',
  C: 'Course',
  R: 'Renfort',
}

export const LOCATION_LABELS: Record<WorkoutLocation, string> = {
  pool_25m: 'Bassin 25 m',
  pool_50m: 'Bassin 50 m',
  open_water: 'Eau libre',
  home_trainer: 'Home-trainer',
  road: 'Route',
  track: 'Piste',
  treadmill: 'Tapis',
  outdoor: 'Extérieur',
}

/**
 * Nom des zones tel qu'employé par les mockups quand la zone tient lieu d'intitulé de séance
 * (« Seuil 2 400 m · 55 min » écran 05, « Endurance 2 h 30 » écran 15, « prochaine séance :
 * mardi · seuil 2 400 m » écran 01). Le canevas ne nomme que Z2 et Z4 : les quatre autres
 * suivent la convention Friel déjà retenue par `zoneAtlas.ts`.
 */
export const ZONE_LABELS: Record<Zone, string> = {
  Z1: 'Récupération',
  Z2: 'Endurance',
  Z3: 'Tempo',
  Z4: 'Seuil',
  Z5: 'VO2max',
  Z6: 'Anaérobie',
}

export function zoneToNumber(zone: Zone): ZoneNumber {
  return Number(zone.slice(1)) as ZoneNumber
}

export function formatDurationMin(durationMin: number): string {
  const totalMinutes = Math.round(durationMin)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`
}

/**
 * Variante compacte pour les cellules denses de la grille hebdomadaire (écran S6) : `48′`, `2 h 30`.
 * `formatDurationMin` reste la forme longue (`48 min`) utilisée par la bibliothèque et les fiches.
 */
export function formatDurationCompact(durationMin: number): string {
  const totalMinutes = Math.round(durationMin)
  if (totalMinutes < 60) return `${totalMinutes}′`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`
}

/**
 * Repos courts : le canevas écrit « r 20 s » sous la minute (05 l. 595) et « r 4′ » au-delà
 * (28 l. 3089). `formatDurationMin` arrondissait 20 s à « 0 min ».
 */
export function formatShortDuration(durationMin: number): string {
  if (durationMin <= 0) return '—'
  if (durationMin < 1) return `${Math.round(durationMin * 60)} s`
  return formatDurationCompact(durationMin)
}

/**
 * Distance en mètres, milliers séparés : « 2 400 m » (canevas 05 l. 577, S4 l. 1591, S5 l. 1745).
 * Le canevas écrit une espace ordinaire, qui autoriserait une coupure entre « 2 » et « 400 » :
 * `toLocaleString('fr-FR')` pose une espace FINE INSÉCABLE (U+202F), même rendu sans le défaut.
 */
export function formatMeters(distanceM: number): string {
  return `${Math.round(distanceM).toLocaleString('fr-FR')} m`
}

export function formatDistanceM(distanceM: number): string {
  if (distanceM < 1000) return `${distanceM} m`
  const km = distanceM / 1000
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`
}

/**
 * Unité par discipline, telle que le canevas la choisit : la natation se compte en mètres
 * (« 2 400 m », 05/S4/S5), le vélo et la course en kilomètres (« 13 km », 29 l. 3130).
 */
export function formatWorkoutDistance(discipline: Discipline, distanceM: number): string {
  return discipline === 'N' ? formatMeters(distanceM) : formatDistanceM(distanceM)
}
