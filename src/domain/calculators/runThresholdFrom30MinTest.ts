import { formatPaceMinSec } from './paceFormat'
import { evidenceResult, type CalculatorResult } from './types'

export interface RunThresholdFrom30MinTestResult {
  speedKmh: number
  thresholdPaceMinPerKm: string
  vmaKmh: number
}

// Coefficient 0,83 cale sur l'exemple produit (ecran 33 : 7140m/30min -> VMA 17,2 km/h),
// pas une constante physiologique universelle. Non recoupe par `zoned` (2026-08-21).
const VMA_FROM_THRESHOLD_COEFFICIENT = 0.83

export function runThresholdFrom30MinTest(distanceM: number): CalculatorResult<RunThresholdFrom30MinTestResult> {
  const speedKmh = Math.round((distanceM / 1000 / 0.5) * 10) / 10
  const thresholdPaceSecPerKm = 1800 / (distanceM / 1000)
  const vmaKmh = Math.round((speedKmh / VMA_FROM_THRESHOLD_COEFFICIENT) * 10) / 10

  return evidenceResult(
    {
      speedKmh,
      thresholdPaceMinPerKm: formatPaceMinSec(thresholdPaceSecPerKm),
      vmaKmh,
    },
    'weak',
    'Derivation interne calee sur l\'exemple produit (ecran 33), coefficient 0,83 non sourcé académiquement',
  )
}
