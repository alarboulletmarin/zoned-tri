import { evidenceResult, type CalculatorResult } from './types'

// Jeukendrup, A. (2014), Nutrition Reviews — cite nommement dans le mockup (ecran 14).
// Repere : jusqu'a 90 g/h atteignables avec un melange glucose:fructose ~2:1
// (deux transporteurs intestinaux distincts), sous reserve d'entrainement digestif prealable.
export function carbsForDuration(carbsGPerH: number, durationHours: number): CalculatorResult<number> {
  return evidenceResult(carbsGPerH * durationHours, 'solid', 'Jeukendrup, A. (2014), Nutrition Reviews')
}
