import { evidenceResult, type CalculatorResult } from './types'

export interface HydrationResult {
  fluidLossesL: number
  sodiumMgLow: number
  sodiumMgHigh: number
}

// Repere sodium : 400 a 800 mg/L de sueur perdue (fourchette large, grande variabilite individuelle).
const SODIUM_MG_PER_L_LOW = 400
const SODIUM_MG_PER_L_HIGH = 800

// ACSM, Position Stand on Exercise and Fluid Replacement — fourchette large explicitement
// due a l'heterogeneite inter-individuelle.
export function hydrationForDuration(sweatRateLPerH: number, durationHours: number): CalculatorResult<HydrationResult> {
  const fluidLossesL = sweatRateLPerH * durationHours

  return evidenceResult(
    {
      fluidLossesL,
      sodiumMgLow: fluidLossesL * SODIUM_MG_PER_L_LOW,
      sodiumMgHigh: fluidLossesL * SODIUM_MG_PER_L_HIGH,
    },
    'weak',
    'ACSM, Position Stand on Exercise and Fluid Replacement',
  )
}
