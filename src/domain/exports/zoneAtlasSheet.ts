// Contenu du gabarit A4 « Atlas des zones » — artboard 21, « 210 × 297 mm · noir sur blanc,
// une seule encre ».
//
// AUCUN SECOND CALCUL : les six lignes viennent de `buildZoneAtlas` (déjà calculé et testé), les
// trois encadrés de références de `buildToolsReferences`, la cible de répartition de
// `TrainingPlan.intensityDistribution`. Ce module ne fait que METTRE EN FORME, avec les quatre
// notations que l'artboard emploie : `1:52+`, `1:45–1:52`, `< 136`, `> 298`, `max`.
//
// CE QUI MANQUE FAUTE DE DONNÉES : l'atlas exige les quatre références (CSS, FTP, seuil course,
// FC max). Il en manque une et le tableau ne se rend pas — `missing` les nomme, et l'écran pose
// un vide qui se lit. Une colonne remplie de moitié serait pire qu'un vide : elle mentirait sur
// les trois autres.

import { buildZoneAtlas, type ZoneAtlasRow } from '../calculators/zoneAtlas'
import { formatDayMonth } from '../openingState'
import { buildToolsReferences, parsePaceToSeconds, type ReferenceKey } from '../toolsReferences'
import type { AthleteProfile, TrainingPlan, Zone } from '../types'

/** Une cellule du tableau, déjà écrite comme l'artboard l'écrit. */
export interface ZoneAtlasSheetRow {
  zone: Zone
  swim: string
  bike: string
  run: string
  heartRate: string
  /** Ligne du SEUIL, sur aplat `#E4E1D6` (artboard 21) : c'est la ligne qu'on cherche du doigt. */
  emphasis: boolean
}

/** Un des trois encadrés du haut : « CSS · 1:32 /100 m », « FTP · 248 W · 3,4 W/kg ». */
export interface ZoneAtlasSheetReference {
  key: ReferenceKey
  text: string
}

export interface ZoneAtlasDistribution {
  weeksCount: number
  z1z2Percent: number
  z3Percent: number
  z4PlusPercent: number
}

export interface ZoneAtlasSheet {
  /** « Zoned Tri · références du 3 août 2026 ». */
  subtitle: string
  references: ZoneAtlasSheetReference[]
  /** Vide quand une référence manque : voir `missing`. */
  rows: ZoneAtlasSheetRow[]
  /** Références absentes du profil, nommées. Vide = le tableau est complet. */
  missing: string[]
  /** `null` sans plan actif : l'encadré « Cible de répartition » n'a alors rien à dire. */
  distribution: ZoneAtlasDistribution | null
}

/** L'A4 écrit ses étiquettes en casse de phrase, là où l'écran 12 les crie en capitales. */
const SHEET_REFERENCE_LABEL: Record<ReferenceKey, string> = {
  css: 'CSS',
  ftp: 'FTP',
  runThreshold: 'Seuil',
}

/** Ce que le tableau exige, et le nom sous lequel le vide l'appellera. */
const REQUIRED_LABELS = {
  css: 'CSS natation',
  ftp: 'FTP vélo',
  runThreshold: 'Allure seuil course',
  maxHeartRate: 'FC max',
} as const

/**
 * Deux bornes d'ALLURE : la plus rapide d'abord, comme le tableau les range. Une borne ouverte
 * du côté lent s'écrit `1:52+`, une borne ouverte du côté rapide `< 1:26`.
 */
function paceRange(fast: string | null, slow: string | null): string {
  if (fast !== null && slow !== null) return `${fast}–${slow}`
  if (slow === null && fast !== null) return `${fast}+`
  if (fast === null && slow !== null) return `< ${slow}`
  return '—'
}

/** Deux bornes de QUANTITÉ croissante (watts) : `< 136`, `136–173`, `> 298`. */
function amountRange(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}–${max}`
  if (min === null && max !== null) return `< ${max}`
  if (min !== null && max === null) return `> ${min}`
  return '—'
}

/** La FC de la zone la plus haute s'écrit `max` sur l'artboard, et non `> 173`. */
function heartRateRange(min: number | null, max: number | null): string {
  if (max === null) return 'max'
  if (min === null) return `< ${max}`
  return `${min}–${max}`
}

function sheetRow(row: ZoneAtlasRow): ZoneAtlasSheetRow {
  return {
    zone: row.zone,
    swim: paceRange(row.swim.fastPaceMinPer100m, row.swim.slowPaceMinPer100m),
    bike: amountRange(row.bike.minWatts, row.bike.maxWatts),
    run: paceRange(row.run.fastPaceMinPerKm, row.run.slowPaceMinPerKm),
    heartRate: heartRateRange(row.heartRate.minBpm, row.heartRate.maxBpm),
    emphasis: row.zone === 'Z4',
  }
}

/** `3 août 2026` — `formatDayMonth` ne porte pas l'année, l'A4 en a besoin. */
export function formatDayMonthYear(isoDate: string): string {
  return `${formatDayMonth(isoDate)} ${isoDate.slice(0, 4)}`
}

export function buildZoneAtlasSheet(
  profile: AthleteProfile | undefined,
  plan: TrainingPlan | undefined,
  today: string,
): ZoneAtlasSheet {
  const view = buildToolsReferences(profile, today)

  // L'artboard n'ajoute une troisième mention qu'à la FTP — « 3,4 W/kg », qui est une seconde
  // lecture de la même mesure. Il n'imprime ni le protocole du CSS (« test 400/200 ») ni la VMA
  // dérivée du seuil : une feuille de poche dit les zones, pas la manière de les avoir obtenues.
  const references: ZoneAtlasSheetReference[] = view.lines.map((line) => ({
    key: line.key,
    text: [
      SHEET_REFERENCE_LABEL[line.key],
      line.value === null ? '—' : `${line.value} ${line.unit}`,
      line.key === 'ftp' ? line.meta : null,
    ]
      .filter((part): part is string => Boolean(part))
      .join(' · '),
  }))

  const cssSec = profile?.css ? parsePaceToSeconds(profile.css.paceMinPer100m) : null
  const runSec = profile?.runThreshold ? parsePaceToSeconds(profile.runThreshold.paceMinPerKm) : null
  const ftpWatts = profile?.ftp?.watts ?? null
  const maxHr = profile && profile.maxHeartRateBpm > 0 ? profile.maxHeartRateBpm : null

  const missing: string[] = []
  if (cssSec === null) missing.push(REQUIRED_LABELS.css)
  if (ftpWatts === null) missing.push(REQUIRED_LABELS.ftp)
  if (runSec === null) missing.push(REQUIRED_LABELS.runThreshold)
  if (maxHr === null) missing.push(REQUIRED_LABELS.maxHeartRate)

  const rows =
    missing.length > 0
      ? []
      : buildZoneAtlas({
          cssPaceSecPer100m: cssSec!,
          ftpWatts: ftpWatts!,
          thresholdPaceSecPerKm: runSec!,
          maxHeartRateBpm: maxHr!,
        }).map(sheetRow)

  return {
    subtitle: view.lastTestLabel
      ? `Zoned Tri · références du ${formatDayMonthYear(lastTestIso(view.lines))}`
      : 'Zoned Tri · aucune référence mesurée',
    references,
    rows,
    missing,
    distribution: plan
      ? {
          weeksCount: plan.weeksCount,
          z1z2Percent: plan.intensityDistribution.z1z2Percent,
          z3Percent: plan.intensityDistribution.z3Percent,
          z4PlusPercent: plan.intensityDistribution.z4PlusPercent,
        }
      : null,
  }
}

/** Date de la mesure la plus récente. Appelée seulement quand `lastTestLabel` existe. */
function lastTestIso(lines: { measuredAt: string | null }[]): string {
  const dates = lines.map((line) => line.measuredAt).filter((date): date is string => date !== null)
  return dates.slice().sort().at(-1)!
}
