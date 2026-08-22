import { evidenceResult, type CalculatorResult } from './types'

export type SightingFrequency = 'faible' | 'moyenne' | 'elevee'

export interface OpenWaterConversionInput {
  poolPaceSecPer100m: number
  poolLengthM: 25 | 50
  wetsuit: boolean
  sightingFrequency: SightingFrequency
}

export interface OpenWaterConversionResult {
  lowPaceSecPer100m: number
  centralPaceSecPer100m: number
  highPaceSecPer100m: number
}

// Aucune formule numerique n'existe dans le mockup ("trois effets mal quantifies") — on
// formalise les 3 facteurs qu'il cite en additionnant des ajustements en secondes/100m,
// chacun un dire d'expert non issu d'une etude controlee (cf. spec calculateurs, §04/12).
// Choix d'implementation documente : la fourchette globale citee par facteur (perte de
// virages 0-2s, flottaison combinaison -4 a -2s, cout du sighting 1-3s) est repartie en
// sous-fourchette selon l'input declare (longueur de bassin / port de combinaison /
// frequence de sighting), puis sommee terme a terme (bas avec bas, haut avec haut).
const TURNS_RANGE_SEC: Record<25 | 50, [number, number]> = {
  25: [1, 2],
  50: [0, 1],
}

const WETSUIT_RANGE_SEC: [number, number] = [-4, -2]
const NO_WETSUIT_RANGE_SEC: [number, number] = [0, 0]

const SIGHTING_RANGE_SEC: Record<SightingFrequency, [number, number]> = {
  faible: [1, 1.5],
  moyenne: [1.5, 2.5],
  elevee: [2.5, 3],
}

export function openWaterPaceFromPool(input: OpenWaterConversionInput): CalculatorResult<OpenWaterConversionResult> {
  const [turnsLow, turnsHigh] = TURNS_RANGE_SEC[input.poolLengthM]
  const [wetsuitLow, wetsuitHigh] = input.wetsuit ? WETSUIT_RANGE_SEC : NO_WETSUIT_RANGE_SEC
  const [sightingLow, sightingHigh] = SIGHTING_RANGE_SEC[input.sightingFrequency]

  const lowDelta = turnsLow + wetsuitLow + sightingLow
  const highDelta = turnsHigh + wetsuitHigh + sightingHigh

  const lowPaceSecPer100m = input.poolPaceSecPer100m + lowDelta
  const highPaceSecPer100m = input.poolPaceSecPer100m + highDelta

  return evidenceResult(
    {
      lowPaceSecPer100m,
      centralPaceSecPer100m: (lowPaceSecPer100m + highPaceSecPer100m) / 2,
      highPaceSecPer100m,
    },
    'weak',
    'estimation par règle empirique, pas une formule validée (mockup écran 13)',
  )
}
