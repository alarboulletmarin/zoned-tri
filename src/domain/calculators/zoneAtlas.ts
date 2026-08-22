import type { Zone } from '../types'
import { formatPaceMinSec } from './paceFormat'
import { heartRateZones, type HeartRateZoneBound } from './heartRateZones'
import { ftpPowerZones, type PowerZoneBound } from './powerZones'
import { runPaceZonesFromThreshold, type RunPaceZoneBound } from './runPaceZones'
import { evidenceResult, type CalculatorResult } from './types'

export interface SwimZoneBound {
  zone: Zone
  fastPaceMinPer100m: string | null
  slowPaceMinPer100m: string | null
}

// Joe Friel, The Triathlete's Training Bible — zones natation par % d'allure seuil (CSS).
// Friel numerote ses propres 6 zones natation dans l'ordre inverse de ses zones velo/course :
// sa zone qui contient l'allure seuil (T-pace, 100%) est sa zone 3, pas sa zone 4. Zoned Tri
// decale l'assignation d'un cran (ajoute un palier "recuperation" en Z1, fusionne les deux
// zones les plus rapides de Friel en Z6) pour que Z4 "Seuil" contienne bien l'allure seuil
// mesuree, coherent avec la convention deja utilisee pour les zones velo (Z4 contient FTP a
// 100%) et course (Z4 contient l'allure seuil a 100%). Adaptation assumee de la structure,
// pas de la source elle-meme — voir 2026-08-21-calculators-spec.md pour le detail.
// % applique directement a l'allure (pas a une vitesse) : plus lent = %>100, sens inverse
// des zones velo/course (qui raisonnent en % de vitesse/puissance, plus rapide = %>100).
const CSS_PCT_BOUNDS: Record<Zone, [number | null, number | null]> = {
  Z1: [120, null],
  Z2: [112, 120],
  Z3: [105, 111],
  Z4: [98, 104],
  Z5: [92, 97],
  Z6: [null, 92],
}

const ZONES: Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']

function paceAtPct(cssPaceSecPer100m: number, pct: number): string {
  return formatPaceMinSec(cssPaceSecPer100m * (pct / 100))
}

export function swimZonesFromCss(cssPaceSecPer100m: number): CalculatorResult<SwimZoneBound[]> {
  const bounds: SwimZoneBound[] = ZONES.map((zone) => {
    const [pctLow, pctHigh] = CSS_PCT_BOUNDS[zone]
    return {
      zone,
      fastPaceMinPer100m: pctLow === null ? null : paceAtPct(cssPaceSecPer100m, pctLow),
      slowPaceMinPer100m: pctHigh === null ? null : paceAtPct(cssPaceSecPer100m, pctHigh),
    }
  })

  return evidenceResult(bounds, 'moderate', "Joe Friel, The Triathlete's Training Bible")
}

export interface ZoneAtlasRow {
  zone: Zone
  swim: Omit<SwimZoneBound, 'zone'>
  bike: Omit<PowerZoneBound, 'zone'>
  run: Omit<RunPaceZoneBound, 'zone'>
  heartRate: Omit<HeartRateZoneBound, 'zone'>
}

export interface ZoneAtlasInput {
  cssPaceSecPer100m: number
  ftpWatts: number
  thresholdPaceSecPerKm: number
  maxHeartRateBpm: number
}

// Agregat des sorties des calculateurs 03/12 (velo), 09/12 (via CSS), 11/12 (course) et
// 12/12 (FC) — pas de nouvelle formule physiologique, juste la mise en tableau commune
// que montre l'ecran 21 (atlas des zones).
export function buildZoneAtlas(input: ZoneAtlasInput): ZoneAtlasRow[] {
  const swim = swimZonesFromCss(input.cssPaceSecPer100m).value
  const bike = ftpPowerZones(input.ftpWatts).value
  const run = runPaceZonesFromThreshold(input.thresholdPaceSecPerKm).value
  const heartRate = heartRateZones(input.maxHeartRateBpm).value

  return ZONES.map((zone, i) => ({
    zone,
    swim: { fastPaceMinPer100m: swim[i].fastPaceMinPer100m, slowPaceMinPer100m: swim[i].slowPaceMinPer100m },
    bike: { minWatts: bike[i].minWatts, maxWatts: bike[i].maxWatts },
    run: { fastPaceMinPerKm: run[i].fastPaceMinPerKm, slowPaceMinPerKm: run[i].slowPaceMinPerKm },
    heartRate: { minBpm: heartRate[i].minBpm, maxBpm: heartRate[i].maxBpm },
  }))
}
