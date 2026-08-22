import { definitionResult, type CalculatorResult } from './types'

// Definitions mathematiques (pas d'affirmation scientifique) -> proofLevel 'definition',
// jamais de ProofBadge SOLIDE/MODEREE/FAIBLE affiche dessus (cf. spec calculateurs, §IF/TSS).

const DEFINITION_SOURCE_BIKE = 'Definition standard Coggan/TrainingPeaks : IF = puissance normalisee / FTP'
const DEFINITION_SOURCE_RUN = 'Equivalent course de la definition Coggan : IF = allure seuil / allure reelle'
const DEFINITION_SOURCE_SWIM =
  'Equivalent natation, inverse par rapport au velo/course : IF = allure CSS / allure reelle'
const DEFINITION_SOURCE_TSS = 'Coggan (2003), etendue aux autres disciplines par Skiba (2008) : TSS = heures x IF^2 x 100'

export function intensityFactorBike(normalizedPowerWatts: number, ftpWatts: number): CalculatorResult<number> {
  return definitionResult(normalizedPowerWatts / ftpWatts, DEFINITION_SOURCE_BIKE)
}

// Allures en secondes (meme unite), issues du profil (paceMinPerKm). Plus rapide = valeur
// plus petite : IF = allure_seuil / allure_reelle augmente quand l'allure reelle diminue.
export function intensityFactorRun(thresholdPaceSecPerKm: number, actualPaceSecPerKm: number): CalculatorResult<number> {
  return definitionResult(thresholdPaceSecPerKm / actualPaceSecPerKm, DEFINITION_SOURCE_RUN)
}

// CSS et allure reelle exprimees en secondes/100m (memes unites que CssReference.paceMinPer100m).
// Inversion documentee dans la spec : IF = CSS / allure_reelle (et non l'inverse).
export function intensityFactorSwim(cssPaceSecPer100m: number, actualPaceSecPer100m: number): CalculatorResult<number> {
  return definitionResult(cssPaceSecPer100m / actualPaceSecPer100m, DEFINITION_SOURCE_SWIM)
}

export function tssFromDurationAndIf(durationHours: number, intensityFactor: number): CalculatorResult<number> {
  return definitionResult(durationHours * intensityFactor * intensityFactor * 100, DEFINITION_SOURCE_TSS)
}
