import type { Zone } from '../types'
import { evidenceResult, type CalculatorResult } from './types'

// Allen & Coggan, Training and Racing with a Power Meter, 3e ed. (2019).
// Modele Coggan a 7 zones, fusionne en 6 (Z6+Z7 -> "Neuro") pour l'atlas unifie de l'app.
const FTP_PCT_BREAKPOINTS = [0.55, 0.75, 0.9, 1.05, 1.2]

export interface PowerZoneBound {
  zone: Zone
  minWatts: number | null
  maxWatts: number | null
}

const ZONES: Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']

export function ftpPowerZones(ftpWatts: number): CalculatorResult<PowerZoneBound[]> {
  const breakpoints = FTP_PCT_BREAKPOINTS.map((pct) => Math.round(pct * ftpWatts))

  const bounds: PowerZoneBound[] = ZONES.map((zone, i) => {
    const minWatts = i === 0 ? null : i === 1 ? breakpoints[0] : breakpoints[i - 1] + 1
    const maxWatts = i === ZONES.length - 1 ? null : breakpoints[i]
    return { zone, minWatts, maxWatts }
  })

  return evidenceResult(bounds, 'moderate', 'Allen & Coggan, Training and Racing with a Power Meter, 3e ed. (2019)')
}
