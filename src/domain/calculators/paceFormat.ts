// Helpers de conversion partages par les calculateurs de vitesse/allure.
// Arithmetique pure, aucune source necessaire (definitions/conversions d'unites).

export function formatPaceMinSec(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds)
  const minutes = Math.floor(rounded / 60)
  const seconds = rounded % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function speedKmhToPaceSecPerKm(speedKmh: number): number {
  return 3600 / speedKmh
}

export function paceSecToSpeedKmh(paceSecPerKm: number): number {
  return 3600 / paceSecPerKm
}

export function secPerKmToSecPer100m(paceSecPerKm: number): number {
  return paceSecPerKm / 10
}
