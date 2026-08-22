// Découpage d'un plan en 4 phases (Base / Build / Specific / Taper).
//
// Deux chiffres seulement sont posés ici, et les deux viennent du canevas G6 :
//   - « Placer 4 phases et un affûtage de 2 semaines » (note 2 : Bosquet et al. 2007, méta-analyse
//     sur l'affûtage — 2 semaines est la durée qui maximise le gain de performance) ;
//   - le reste du plan se répartit Base ≈ 40 %, Build ≈ 40 %, Specific ≈ 20 %.
// Aucune phase ne peut valoir 0 semaine, et la somme des phases vaut toujours exactement le
// nombre de semaines du plan : un récapitulatif qui ne totalise pas serait un mensonge à l'écran.

import type { PlanPhase, PlanPhaseName, PlanPhaseStatus } from '../types'

export const PHASE_ORDER: readonly PlanPhaseName[] = ['Base', 'Build', 'Specific', 'Taper'] as const

/** Durée d'affûtage de référence, en semaines (canevas G6, note 2 : Bosquet et al. 2007). */
export const TAPER_WEEKS = 2

/** En deçà, un affûtage de 2 semaines mangerait la moitié du plan : on le ramène à 1 semaine. */
export const SHORT_PLAN_WEEKS = 6

/** Poids des phases hors affûtage, dans l'ordre Base / Build / Specific. */
const REMAINDER_WEIGHTS = [0.4, 0.4, 0.2] as const

const PHASE_DESCRIPTIONS: Record<PlanPhaseName, string> = {
  Base: 'Volume en endurance fondamentale, peu d’intensité.',
  Build: 'Montée en charge : le travail au seuil s’installe.',
  Specific: 'Allures de course et enchaînements, volume au plus haut.',
  Taper: 'Volume réduit, intensité conservée, fraîcheur retrouvée.',
}

export interface PhaseAllocation {
  name: PlanPhaseName
  weeksCount: number
}

/** Nombre de semaines d'affûtage d'un plan de `weeksCount` semaines — jamais 0. */
export function taperWeeksFor(weeksCount: number): number {
  if (weeksCount <= 0) return 0
  return weeksCount < SHORT_PLAN_WEEKS ? 1 : TAPER_WEEKS
}

/**
 * Répartit `total` selon `weights` en entiers dont la somme vaut exactement `total`, chaque part
 * valant au moins 1 (méthode du plus fort reste, puis rééquilibrage depuis la plus grosse part).
 * `total` doit être au moins égal au nombre de poids.
 */
function splitWithMinimumOne(total: number, weights: readonly number[]): number[] {
  const exact = weights.map((weight) => total * weight)
  const parts = exact.map((value) => Math.floor(value))
  let left = total - parts.reduce((sum, value) => sum + value, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - parts[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (let step = 0; left > 0; step += 1) {
    parts[byRemainder[step % byRemainder.length].index] += 1
    left -= 1
  }

  for (let index = 0; index < parts.length; index += 1) {
    while (parts[index] < 1) {
      let donor = 0
      for (let other = 1; other < parts.length; other += 1) {
        if (parts[other] > parts[donor]) donor = other
      }
      parts[donor] -= 1
      parts[index] += 1
    }
  }

  return parts
}

/**
 * Longueur de chaque phase d'un plan de `weeksCount` semaines.
 *
 * Sous 4 semaines, on ne peut pas donner une semaine à chacune des 4 phases : on garde alors les
 * phases les plus proches de la course (Taper, puis Specific, puis Build) plutôt que d'annoncer
 * une phase vide.
 */
export function allocatePhaseWeeks(weeksCount: number): PhaseAllocation[] {
  if (weeksCount <= 0) return []

  if (weeksCount < PHASE_ORDER.length) {
    return PHASE_ORDER.slice(PHASE_ORDER.length - weeksCount).map((name) => ({ name, weeksCount: 1 }))
  }

  const taper = taperWeeksFor(weeksCount)
  const [base, build, specific] = splitWithMinimumOne(weeksCount - taper, REMAINDER_WEIGHTS)

  return [
    { name: 'Base', weeksCount: base },
    { name: 'Build', weeksCount: build },
    { name: 'Specific', weeksCount: specific },
    { name: 'Taper', weeksCount: taper },
  ]
}

/** Phase de chaque semaine du plan, index 0 = semaine 1. */
export function phaseNameByWeek(weeksCount: number): PlanPhaseName[] {
  const names: PlanPhaseName[] = []
  for (const phase of allocatePhaseWeeks(weeksCount)) {
    for (let index = 0; index < phase.weeksCount; index += 1) names.push(phase.name)
  }
  return names
}

function phaseStatus(startWeek: number, endWeek: number, currentWeekNumber: number): PlanPhaseStatus {
  if (endWeek < currentWeekNumber) return 'done'
  if (startWeek <= currentWeekNumber) return 'active'
  return 'upcoming'
}

/**
 * Phases prêtes pour le modèle, statut compris. `currentWeekNumber` est la semaine du plan qui
 * contient le jour courant (1-indexée) ; 0 quand le plan n'a pas commencé.
 */
export function buildPhases(weeksCount: number, currentWeekNumber: number): PlanPhase[] {
  let startWeek = 1

  return allocatePhaseWeeks(weeksCount).map((phase) => {
    const endWeek = startWeek + phase.weeksCount - 1
    const built: PlanPhase = {
      name: phase.name,
      weeksCount: phase.weeksCount,
      description: PHASE_DESCRIPTIONS[phase.name],
      status: phaseStatus(startWeek, endWeek, currentWeekNumber),
    }
    startWeek = endWeek + 1
    return built
  })
}
