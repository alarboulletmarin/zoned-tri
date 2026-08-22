import type { Zone } from '../types'
import { formatPaceMinSec } from './paceFormat'
import { evidenceResult, type CalculatorResult } from './types'

export interface RunPaceZoneBound {
  zone: Zone
  fastPaceMinPerKm: string | null
  slowPaceMinPerKm: string | null
}

// Joe Friel, The Triathlete's Training Bible — zones course a pied par % d'allure seuil,
// paliers 4a/4b fusionnes en Z4 et 5b/5c fusionnes en Z6 pour tenir sur 6 zones au lieu de 8.
// % applique a l'allure (temps), pas a la vitesse : plus lent = %>100 (comme le modele natation).
const THRESHOLD_PCT_BOUNDS: Record<Zone, [number | null, number | null]> = {
  Z1: [129, null],
  Z2: [114, 128],
  Z3: [106, 113],
  Z4: [97, 105],
  Z5: [90, 96],
  Z6: [null, 90],
}

const ZONES: Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']

function paceAtPct(thresholdPaceSecPerKm: number, pct: number): string {
  return formatPaceMinSec(thresholdPaceSecPerKm * (pct / 100))
}

export function runPaceZonesFromThreshold(thresholdPaceSecPerKm: number): CalculatorResult<RunPaceZoneBound[]> {
  const bounds: RunPaceZoneBound[] = ZONES.map((zone) => {
    const [pctLow, pctHigh] = THRESHOLD_PCT_BOUNDS[zone]
    return {
      zone,
      fastPaceMinPerKm: pctLow === null ? null : paceAtPct(thresholdPaceSecPerKm, pctLow),
      slowPaceMinPerKm: pctHigh === null ? null : paceAtPct(thresholdPaceSecPerKm, pctHigh),
    }
  })

  return evidenceResult(bounds, 'moderate', "Joe Friel, The Triathlete's Training Bible")
}
