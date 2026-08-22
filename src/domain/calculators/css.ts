import { formatPaceMinSec } from './paceFormat'
import { evidenceResult, type CalculatorResult } from './types'

export interface CssResult {
  speedMs: number
  pacePer100m: string
}

// Wakayoshi et al. (1992) — concept de vitesse critique en natation (cite par le mockup, ecran 12 note 1).
// Formule arithmetique a 2 distances (400m/200m) : Ginn (1993).
export function cssFrom400And200(time400Sec: number, time200Sec: number): CalculatorResult<CssResult> {
  const speedMs = (400 - 200) / (time400Sec - time200Sec)
  const pacePer100mSec = 100 / speedMs

  return evidenceResult(
    { speedMs, pacePer100m: formatPaceMinSec(pacePer100mSec) },
    'moderate',
    'Wakayoshi et al. 1992 (concept de vitesse critique) ; formule Ginn 1993',
  )
}
