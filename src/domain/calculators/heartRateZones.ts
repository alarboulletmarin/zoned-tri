import type { Zone } from '../types'
import { evidenceResult, type CalculatorResult } from './types'

// %FCmax simple (pas Karvonen/reserve cardiaque, faute de FC de repos dans le profil).
// Convention generaliste type ACSM.
const HR_PCT_BREAKPOINTS = [0.6, 0.7, 0.8, 0.87, 0.93]

export interface HeartRateZoneBound {
  zone: Zone
  minBpm: number | null
  maxBpm: number | null
}

const ZONES: Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']

export function heartRateZones(maxHeartRateBpm: number): CalculatorResult<HeartRateZoneBound[]> {
  const breakpoints = HR_PCT_BREAKPOINTS.map((pct) => Math.round(pct * maxHeartRateBpm))

  const bounds: HeartRateZoneBound[] = ZONES.map((zone, i) => {
    const minBpm = i === 0 ? null : i === 1 ? breakpoints[0] : breakpoints[i - 1] + 1
    const maxBpm = i === ZONES.length - 1 ? null : breakpoints[i]
    return { zone, minBpm, maxBpm }
  })

  return evidenceResult(bounds, 'weak', 'Convention %FCmax generaliste (ex. ACSM) — pas de methode Karvonen (FC de repos non collectee)')
}
