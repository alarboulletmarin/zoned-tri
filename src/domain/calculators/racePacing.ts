import type { RacePacing, RacePacingSegment } from '../types'
import { formatPaceMinSec } from './paceFormat'
import { productRuleResult, type CalculatorResult } from './types'

export interface RacePacingInput {
  distances: { swimM: number; bikeKm: number; runKm: number }
  targetIf: { swim: number; bike: number; run: number }
  references: {
    cssPaceSecPer100m: number
    bikeThresholdSpeedKmh: number
    runThresholdPaceSecPerKm: number
  }
  transitionsSec: { t1: number; t2: number }
}

// Regle produit d'allocation (pas une formule sourcee) : repartit un temps cible par
// segment a partir des references de l'athlete, ponderees par un IF cible par discipline.
// IF = allure_reference / allure_reelle pour la nage et la course (memes conventions que
// intensityFactorTss.ts) ; IF = vitesse_reelle / vitesse_reference pour le velo (grandeur
// "plus grand = plus dur" du power/speed, cf. IF vélo NP/FTP).
export function raceSegmentPacing(input: RacePacingInput): CalculatorResult<RacePacing> {
  const { distances, targetIf, references, transitionsSec } = input

  const swimPaceSecPer100m = references.cssPaceSecPer100m / targetIf.swim
  const swimTimeSec = Math.round(swimPaceSecPer100m * (distances.swimM / 100))

  const bikeSpeedKmh = references.bikeThresholdSpeedKmh * targetIf.bike
  const bikeTimeSec = Math.round((distances.bikeKm / bikeSpeedKmh) * 3600)

  const runPaceSecPerKm = references.runThresholdPaceSecPerKm / targetIf.run
  const runTimeSec = Math.round(runPaceSecPerKm * distances.runKm)

  let cumulativeTimeSec = 0
  const segments: RacePacingSegment[] = []

  const pushSegment = (segment: RacePacingSegment['segment'], durationSec: number, pace: string) => {
    cumulativeTimeSec += durationSec
    segments.push({ segment, pace, cumulativeTimeSec })
  }

  pushSegment('N', swimTimeSec, `${formatPaceMinSec(swimPaceSecPer100m)}/100m`)
  pushSegment('T1', transitionsSec.t1, '')
  pushSegment('V', bikeTimeSec, `${bikeSpeedKmh.toFixed(1)} km/h`)
  pushSegment('T2', transitionsSec.t2, '')
  pushSegment('C', runTimeSec, `${formatPaceMinSec(runPaceSecPerKm)}/km`)

  return productRuleResult(
    { targetTimeSec: cumulativeTimeSec, segments },
    'Répartition calculée depuis tes références, pas une prédiction validée par une étude',
  )
}
