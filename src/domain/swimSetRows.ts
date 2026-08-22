// Tableau « Bloc / Cible / Repos » de la colonne principale de S4 (l. 1599-1607) et de la fiche S5
// (l. 1754-1762). Le canevas écrit « libre » dans la colonne Cible du retour au calme : le domaine ne
// stocke aucune cible pour ce bloc, on affiche donc le tiret des données absentes plutôt que d'écrire
// à sa place.

import type { Workout, WorkoutBlock } from './types'
import {
  formatDurationMin,
  formatShortDuration,
  formatWorkoutDistance,
} from './workoutFormat'

export interface SwimSetRow {
  key: string
  block: string
  target: string
  rest: string
}

const NO_DATA = '—'

function measure(workout: Workout, distanceM: number | undefined, durationMin: number): string {
  return distanceM ? formatWorkoutDistance(workout.discipline, distanceM) : formatDurationMin(durationMin)
}

function segmentLabel(workout: Workout, block: Extract<WorkoutBlock, { kind: 'segment' }>): string {
  const size = measure(workout, block.distanceM, block.durationMin)
  if (block.phase === 'warmup') return `Éch. ${size}`
  if (block.phase === 'cooldown') return `RAC ${size}`
  return size
}

export function buildSwimSetRows(workout: Workout): SwimSetRow[] {
  return workout.blocks.map((block, index) => {
    if (block.kind === 'segment') {
      return {
        key: `set-${index}`,
        block: segmentLabel(workout, block),
        target: block.target?.pace ?? NO_DATA,
        rest: NO_DATA,
      }
    }
    const [effortStep, recoveryStep] = block.steps
    return {
      key: `set-${index}`,
      block: `${block.count} × ${measure(workout, effortStep.distanceM, effortStep.durationMin)}`,
      target: effortStep.target?.pace ?? NO_DATA,
      rest: recoveryStep ? formatShortDuration(recoveryStep.durationMin) : NO_DATA,
    }
  })
}

/**
 * Ligne de méta de S4 (l. 1591) : « 2 400 m · 55 min · 1:34/100 ». Chaque part n'apparaît que si la
 * donnée existe — pas de distance pour une séance qui n'en porte pas, pas d'allure sans cible.
 */
export function buildDetailMetaLine(workout: Workout): string {
  const parts: string[] = []
  if (workout.distanceM) parts.push(formatWorkoutDistance(workout.discipline, workout.distanceM))
  parts.push(formatDurationMin(workout.durationMin))
  const pace = buildSwimSetRows(workout).find((row) => row.target !== NO_DATA)?.target
  if (pace) parts.push(pace)
  return parts.join(' · ')
}
