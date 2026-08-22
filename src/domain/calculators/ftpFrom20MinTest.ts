import { evidenceResult, type CalculatorResult } from './types'

// Protocole de terrain Allen & Coggan : FTP ~= 0,95 x puissance moyenne sur 20 min.
// Qualifie d'"heuristique de terrain, pas un protocole validé" par le mockup (ecran 12, note 7).
export function ftpFrom20MinTest(averagePower20MinWatts: number): CalculatorResult<number> {
  const ftpWatts = Math.round(0.95 * averagePower20MinWatts)
  return evidenceResult(
    ftpWatts,
    'weak',
    'Protocole de terrain Allen & Coggan — heuristique de terrain, pas un protocole validé',
  )
}
