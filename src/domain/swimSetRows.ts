// Tableau « Bloc / Cible / Repos » de la colonne principale de S4 (l. 1599-1607) et de la fiche S5
// (l. 1754-1762). Le canevas écrit « libre » dans la colonne Cible du retour au calme : le domaine ne
// stocke aucune cible pour ce bloc, on affiche donc le tiret des données absentes plutôt que d'écrire
// à sa place.

import type { Workout, WorkoutBlock, WorkoutTarget } from './types'
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
  /**
   * Seconde ligne du bloc, sous son intitulé — le nouvel artboard 02 en écrit une par bloc
   * (« puis 4 × 50 m éducatifs · 12′ », « 2:21 par 150 · 6 longueurs · 32′ »).
   *
   * Elle ne dit QUE ce que le modèle porte : la zone du bloc et sa durée totale. Le canevas y
   * met des précisions que le domaine n'a pas — un temps par répétition, un nombre de longueurs,
   * un intitulé d'éducatif — et rien ne serait inventé à leur place.
   */
  detail: string
  /** Le corps de séance : ni échauffement ni retour au calme. L'artboard le passe en inverse. */
  emphasis: boolean
}

const NO_DATA = '—'

function measure(workout: Workout, distanceM: number | undefined, durationMin: number): string {
  return distanceM ? formatWorkoutDistance(workout.discipline, distanceM) : formatDurationMin(durationMin)
}

function segmentLabel(workout: Workout, block: Extract<WorkoutBlock, { kind: 'segment' }>): string {
  const size = measure(workout, block.distanceM, block.durationMin)
  if (block.phase === 'warmup') return `Éch. ${size}`
  if (block.phase === 'cooldown') return `RAC ${size}`
  // Le canevas nomme le corps de séance (« Corps · 8 × 150 m ») ; un bloc principal qui n'est pas
  // une série chiffrée s'annonce donc de la même façon, et non par sa seule durée.
  return `Corps · ${size}`
}

/**
 * Ce que le bloc vise, quelle que soit la discipline.
 *
 * Le tableau ne lisait que `pace` : toute séance de vélo — dont les cibles sont en pourcentage de
 * FTP — n'affichait donc que des tirets, colonne « Allure » comprise, alors que la donnée est bien
 * là. On lit les trois formes que le modèle porte, dans l'ordre où elles disent le mieux l'effort.
 */
function formatTarget(target: WorkoutTarget | undefined): string {
  if (!target) return NO_DATA
  if (target.pace) return target.pace
  if (target.powerPercentFtp) return `${target.powerPercentFtp} % FTP`
  if (target.cadenceRpm) return `${target.cadenceRpm} rpm`
  return NO_DATA
}

export function buildSwimSetRows(workout: Workout): SwimSetRow[] {
  return workout.blocks.map((block, index) => {
    if (block.kind === 'segment') {
      return {
        key: `set-${index}`,
        block: segmentLabel(workout, block),
        target: formatTarget(block.target),
        rest: NO_DATA,
        detail: detailLine(block.zone, block.durationMin),
        emphasis: block.phase === 'main',
      }
    }
    const [effortStep, recoveryStep] = block.steps
    const totalMin = block.count * block.steps.reduce((sum, step) => sum + step.durationMin, 0)
    return {
      key: `set-${index}`,
      block: `${block.count} × ${measure(workout, effortStep.distanceM, effortStep.durationMin)}`,
      target: formatTarget(effortStep.target),
      rest: recoveryStep ? formatShortDuration(recoveryStep.durationMin) : NO_DATA,
      detail: detailLine(effortStep.zone, totalMin),
      // Une répétition est toujours le corps de la séance : le canevas ne place jamais de série
      // chiffrée en échauffement ni en retour au calme.
      emphasis: true,
    }
  })
}

/** « Z4 · 32 min » — la zone quand le bloc en porte une, sa durée toujours. */
function detailLine(zone: string | undefined, durationMin: number): string {
  const duration = formatDurationMin(durationMin)
  return zone ? `${zone} · ${duration}` : duration
}

/**
 * Ligne de méta de S4 (l. 1591) : « 2 400 m · 55 min · 1:34/100 ». Chaque part n'apparaît que si la
 * donnée existe — pas de distance pour une séance qui n'en porte pas, pas d'allure sans cible.
 */
export function buildDetailMetaLine(workout: Workout): string {
  const parts: string[] = []
  if (workout.distanceM) parts.push(formatWorkoutDistance(workout.discipline, workout.distanceM))
  parts.push(formatDurationMin(workout.durationMin))
  const target = mainTargetOf(workout)
  if (target) parts.push(target)
  return parts.join(' · ')
}

/**
 * Cible du corps de séance — celle qui dit ce que la séance vise, et non celle de l'échauffement.
 * À défaut de bloc principal chiffré, la première cible trouvée : mieux vaut celle-là que rien.
 */
export function mainTargetOf(workout: Workout): string | null {
  const rows = buildSwimSetRows(workout)
  const main = rows.find((row) => row.emphasis && row.target !== NO_DATA)
  return (main ?? rows.find((row) => row.target !== NO_DATA))?.target ?? null
}
