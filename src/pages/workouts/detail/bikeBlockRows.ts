// Lignes du tableau de blocs vélo de l'artboard 28 (colonnes Bloc / Watts / Cadence).
//
// Le domaine ne stocke jamais de watts absolus : un bloc porte un `powerPercentFtp`. Les watts de
// l'artboard s'obtiennent contre la FTP mesurée du profil — c'est exactement ce que dit la ligne
// grise au-dessus du cadre, « cibles en watts et en % de FTP ». Sans FTP mesurée, la colonne
// redevient « % FTP » : on n'estime pas une puissance, on change d'unité.

import type { Workout, WorkoutBlock, WorkoutSegment } from '../../../domain/types'
import { formatDurationCompact, formatShortDuration } from '../../../domain/workoutFormat'

export interface BikeBlockRow {
  key: string
  label: string
  /** Watts quand la FTP est connue, sinon le pourcentage de FTP. Tiret si le bloc ne cible rien. */
  target: string
  cadence: string
  emphasis: boolean
}

/** Le canevas 28 écrit les durées de bloc en minutes primes : « Éch. 12′ », « 3 × 12′ · r 4′ », « RAC 8′ ». */
function phaseLabel(block: Extract<WorkoutBlock, { kind: 'segment' }>): string {
  if (block.phase === 'warmup') return `Éch. ${formatDurationCompact(block.durationMin)}`
  if (block.phase === 'cooldown') return `RAC ${formatDurationCompact(block.durationMin)}`
  return formatDurationCompact(block.durationMin)
}

/** « 238 » contre 248 W de FTP, la valeur au watt près de l'artboard. Un tiret quand rien n'est ciblé. */
function targetLabel(segment: WorkoutSegment | undefined, ftpWatts: number | null): string {
  const percent = segment?.target?.powerPercentFtp
  if (percent === undefined) return '—'
  return ftpWatts === null ? `${percent} %` : `${Math.round((percent * ftpWatts) / 100)}`
}

export function buildBikeBlockRows(blocks: WorkoutBlock[], ftpWatts: number | null = null): BikeBlockRow[] {
  return blocks.map((block, index) => {
    if (block.kind === 'segment') {
      return {
        key: `bike-block-${index}`,
        label: phaseLabel(block),
        target: targetLabel(block, ftpWatts),
        cadence: block.target?.cadenceRpm !== undefined ? `${block.target.cadenceRpm}` : '—',
        emphasis: block.phase === 'main' && block.effort === 'effort',
      }
    }
    const [effortStep, recoveryStep] = block.steps
    const recoveryLabel = recoveryStep ? ` · r ${formatShortDuration(recoveryStep.durationMin)}` : ''
    return {
      key: `bike-block-${index}`,
      label: `${block.count} × ${formatDurationCompact(effortStep.durationMin)}${recoveryLabel}`,
      target: targetLabel(effortStep, ftpWatts),
      cadence: effortStep.target?.cadenceRpm !== undefined ? `${effortStep.target.cadenceRpm}` : '—',
      emphasis: true,
    }
  })
}

/** Intitulé de la colonne de droite du tableau, selon l'unité que les données permettent. */
export function bikeTargetColumnLabel(ftpWatts: number | null): string {
  return ftpWatts === null ? '% FTP' : 'Watts'
}

function flatSegments(blocks: WorkoutBlock[]): WorkoutSegment[] {
  return blocks.flatMap((block) => (block.kind === 'segment' ? [block] : block.steps))
}

export function bikeMainTargetPercent(workout: Workout): number | null {
  const main = flatSegments(workout.blocks).find(
    (segment) => segment.phase === 'main' && segment.effort === 'effort' && segment.target?.powerPercentFtp,
  )
  return main?.target?.powerPercentFtp ?? null
}

export interface BikeFtpScale {
  start: string
  main: string
  end: string
}

/**
 * Les trois repères sous le graphe de 28 (l. 3083) : « 65 % », « 96 % FTP sur les blocs », « 55 % ».
 * Ce sont les cibles du premier bloc, du corps de séance et du dernier bloc — le graphe s'y lit
 * comme une échelle. Rien à afficher si les blocs ne portent aucune cible de puissance.
 */
export function bikeFtpScale(blocks: WorkoutBlock[]): BikeFtpScale | null {
  const segments = flatSegments(blocks)
  const first = segments[0]?.target?.powerPercentFtp
  const last = segments.at(-1)?.target?.powerPercentFtp
  const main = segments.find(
    (segment) => segment.phase === 'main' && segment.effort === 'effort' && segment.target?.powerPercentFtp,
  )?.target?.powerPercentFtp
  if (first === undefined || last === undefined || main === undefined) return null
  return { start: `${first} %`, main: `${main} % FTP sur les blocs`, end: `${last} %` }
}
