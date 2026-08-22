import { definitionResult, type CalculatorResult } from './types'

// Conversions pures entre allure /100m, vitesse km/h, vitesse m/s, et temps sur une
// distance donnee. Arithmetique simple, aucune source necessaire.
const CONVERTER_SOURCE = 'Conversion arithmetique (allure <-> vitesse), aucune source necessaire'

export interface SwimPaceConversions {
  paceSecPer100m: number
  speedMs: number
  speedKmh: number
}

export function swimPaceConversions(paceSecPer100m: number): CalculatorResult<SwimPaceConversions> {
  const speedMs = 100 / paceSecPer100m
  return definitionResult({ paceSecPer100m, speedMs, speedKmh: speedMs * 3.6 }, CONVERTER_SOURCE)
}

export function swimTimeForDistance(paceSecPer100m: number, distanceM: number): CalculatorResult<number> {
  return definitionResult(paceSecPer100m * (distanceM / 100), CONVERTER_SOURCE)
}

export function swimPaceFromTimeAndDistance(timeSec: number, distanceM: number): CalculatorResult<number> {
  return definitionResult(timeSec / (distanceM / 100), CONVERTER_SOURCE)
}
