import type { Workout, WorkoutBlock } from '../../../domain/types'
import {
  formatDistanceM,
  formatDurationCompact,
  formatDurationMin,
  formatShortDuration,
} from '../../../domain/workoutFormat'

export interface RunBlockRow {
  key: string
  label: string
  pace: string
  time: string
  emphasis: boolean
}

function phaseLabel(block: Extract<WorkoutBlock, { kind: 'segment' }>): string {
  if (block.phase === 'warmup') return `Échauffement ${formatDurationCompact(block.durationMin)}`
  if (block.phase === 'cooldown') return `Retour au calme ${formatDurationCompact(block.durationMin)}`
  if (block.effort === 'recovery') return `Récup. ${formatDurationCompact(block.durationMin)}`
  return formatDurationCompact(block.durationMin)
}

export function buildRunBlockRows(blocks: WorkoutBlock[]): RunBlockRow[] {
  return blocks.map((block, index) => {
    if (block.kind === 'segment') {
      return {
        key: `run-block-${index}`,
        label: phaseLabel(block),
        pace: block.target?.pace ?? '—',
        time: formatDurationCompact(block.durationMin),
        emphasis: block.phase === 'main' && block.effort === 'effort',
      }
    }
    const [effortStep, recoveryStep] = block.steps
    const recoveryLabel = recoveryStep ? ` · récup ${formatShortDuration(recoveryStep.durationMin)}` : ''
    return {
      key: `run-block-${index}`,
      label: `${block.count} × ${formatDurationCompact(effortStep.durationMin)}${recoveryLabel}`,
      pace: effortStep.target?.pace ?? '—',
      time: formatDurationCompact(effortStep.durationMin),
      emphasis: true,
    }
  })
}

function totalBlocksDistanceM(blocks: WorkoutBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.kind === 'segment') return sum + (block.distanceM ?? 0)
    return sum + block.steps.reduce((stepSum, step) => stepSum + (step.distanceM ?? 0), 0) * block.count
  }, 0)
}

function mainTargetPace(workout: Workout): string | null {
  for (const block of workout.blocks) {
    if (block.kind === 'segment' && block.phase === 'main' && block.effort === 'effort' && block.target?.pace) {
      return block.target.pace
    }
    if (block.kind === 'repeat') {
      const effortStep = block.steps[0]
      if (effortStep?.effort === 'effort' && effortStep.target?.pace) return effortStep.target.pace
    }
  }
  return null
}

export interface RunStat {
  label: string
  value: string
}

/** Statistiques d'en-tête course : le volume n'apparaît que si les blocs portent une distance
 * réelle, l'allure seulement si une cible existe — aucune valeur n'est déduite d'un seuil non
 * configuré. */
export function runStatBlocks(workout: Workout): RunStat[] {
  const stats: RunStat[] = []
  const totalDistance = totalBlocksDistanceM(workout.blocks) || workout.distanceM || 0
  if (totalDistance > 0) stats.push({ label: 'VOLUME', value: formatDistanceM(totalDistance) })
  const pace = mainTargetPace(workout)
  if (pace) stats.push({ label: 'ALLURE', value: pace })
  stats.push({ label: 'DURÉE', value: formatDurationMin(workout.durationMin) })
  return stats
}
