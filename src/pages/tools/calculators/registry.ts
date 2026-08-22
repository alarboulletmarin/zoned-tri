// Les douze calculateurs, décrits sous la forme que l'artboard 13 leur donne : un titre, des
// champs de saisie, un résultat, et la source qui justifie la formule.
//
// Ce fichier ne contient AUCUNE formule : chaque `run` appelle le calculateur correspondant de
// `src/domain/calculators/` et se contente de mettre en forme ce qu'il retourne — y compris son
// `proofLevel` et son `source`, qui viennent du domaine et jamais de l'écran.
//
// Numérotation : les indices 03, 04, 07, 08, 09, 11 et 12 sont fixés par le canevas et la
// spécification (`thoughts/shared/research/2026-08-21-calculators-spec.md`). Les cinq
// calculateurs utilitaires se partagent les indices restants — 01, 02, 05, 06, 10 — dont la
// spécification dit explicitement que l'ordre est libre.

import { cssFrom400And200 } from '../../../domain/calculators/css'
import { carbsForDuration } from '../../../domain/calculators/carbs'
import { ftpFrom20MinTest } from '../../../domain/calculators/ftpFrom20MinTest'
import { heartRateZones } from '../../../domain/calculators/heartRateZones'
import { hydrationForDuration } from '../../../domain/calculators/hydration'
import {
  intensityFactorBike,
  intensityFactorRun,
  intensityFactorSwim,
  tssFromDurationAndIf,
} from '../../../domain/calculators/intensityFactorTss'
import { openWaterPaceFromPool, type SightingFrequency } from '../../../domain/calculators/openWaterConversion'
import { formatPaceMinSec } from '../../../domain/calculators/paceFormat'
import { ftpPowerZones } from '../../../domain/calculators/powerZones'
import { raceSegmentPacing } from '../../../domain/calculators/racePacing'
import { runPaceZonesFromThreshold } from '../../../domain/calculators/runPaceZones'
import { runThresholdFrom30MinTest } from '../../../domain/calculators/runThresholdFrom30MinTest'
import { swimPaceConversions, swimTimeForDistance } from '../../../domain/calculators/swimPaceConverter'
import type { CalculatorProofLevel } from '../../../domain/calculators/types'
import { formatDecimalFr, parsePaceToSeconds } from '../../../domain/toolsReferences'
import type { AthleteProfile, PlanFormat, RaceSegment } from '../../../domain/types'
import type { ZoneNumber } from '../../../components/ui/Badge/Badge'

export type CalculatorValues = Record<string, string>

export interface ChoiceOption {
  value: string
  label: string
}

export interface CalculatorField {
  key: string
  /** Étiquette mono capitales au-dessus du champ (artboard 13). */
  label: string
  kind: 'value' | 'choice'
  /** Suffixe gris à l'intérieur du champ (`/100 m`, `W`). */
  unit?: string
  options?: ChoiceOption[]
  /** Descripteur court du jeton de carte (artboard S8 : `400 m`, `W 20′`, `m en 30′`). */
  short?: string
  /**
   * Choix rendu sur la ligne d'étiquette du champ principal, là où l'artboard 13 l'écrit :
   * son étiquette dit « Allure en bassin 25 m », la longueur du bassin étant une donnée du
   * calcul et non un mot de décor.
   */
  inlineWithLabel?: boolean
  /** Champ principal : contour 2 px et ombre lime, saisie 20 px (artboard 13). */
  emphasis?: boolean
  /** Valeur de départ, tirée du profil quand il la porte — jamais une valeur inventée. */
  initial: (profile: AthleteProfile | undefined) => string
  inputMode?: 'numeric' | 'decimal' | 'text'
}

export interface CalculatorRow {
  label: string
  value: string
  zone?: ZoneNumber
}

/** Fourchette dessinée en barre hachurée (artboard 13). Les bornes sont des pourcentages. */
export interface CalculatorRangeBar {
  lowPercent: number
  highPercent: number
  lowLabel: string
  caption: string
  highLabel: string
}

export interface CalculatorSuccess {
  ok: true
  /** Grande valeur (56 px sur l'artboard 13). Absente quand le résultat est un tableau. */
  headline?: string
  /** Suffixe de la grande valeur, en plus petit (`/100 m`). */
  headlineUnit?: string
  /** Ligne mono sous la grande valeur (`1,9 km ≈ 32:00`). */
  secondary?: string
  range?: CalculatorRangeBar
  rowsHead?: [string, string]
  rows?: CalculatorRow[]
  proofLevel: CalculatorProofLevel
  source: string
}

export interface CalculatorFailure {
  ok: false
  /** Ce qui manque, dit en clair. Jamais un résultat de remplacement. */
  reason: string
}

export type CalculatorOutcome = CalculatorSuccess | CalculatorFailure

export interface CalculatorDefinition {
  id: string
  index: number
  /** Titre de la fiche, coupé en lignes comme l'artboard 13 le coupe. */
  titleLines: string[]
  /** Titre d'une carte de liste / de grille (artboard S8). */
  cardTitle: string
  /** Phrase mono de la carte (artboard S8). */
  cardDescription: string
  /** Colore la frise de 14 px sous le titre. Absente = frise d'encre. */
  discipline?: 'N' | 'V' | 'C'
  fields: CalculatorField[]
  /** Étiquette du bloc résultat (artboard 13 : « Estimation eau libre »). */
  resultLabel: string
  run: (values: CalculatorValues, profile: AthleteProfile | undefined) => CalculatorOutcome
  /** Paragraphe « Ce que vaut ce chiffre ». Seul l'artboard 13 en écrit un. */
  worth?: string
  /** Note de pied de fiche. Seul l'artboard 13 en pose une. */
  footnote?: { mark: string; text: string }
}

// --- Petits formats partagés ------------------------------------------------------------

/** `1810` → `30:10` ; `25710` → `7:08:30`. Toute quantité passe en Space Mono côté écran. */
export function formatClock(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const seconds = rounded % 60
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0')
  return hours > 0
    ? `${hours}:${mm}:${String(seconds).padStart(2, '0')}`
    : `${mm}:${String(seconds).padStart(2, '0')}`
}

function readNumber(values: CalculatorValues, key: string): number | null {
  const raw = (values[key] ?? '').trim().replace(',', '.').replace(/\s/g, '')
  if (raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function readPaceSeconds(values: CalculatorValues, key: string): number | null {
  return parsePaceToSeconds(values[key] ?? '')
}

/** `1 h 30` pour 90 min, `45 min` en dessous de l'heure — même règle que `formatDurationMin`. */
function formatHours(hours: number): string {
  const minutes = Math.round(hours * 60)
  if (minutes < 60) return `${minutes} min`
  const rest = minutes % 60
  return rest === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, '0')}`
}

const MISSING_FIELD = (what: string): CalculatorFailure => ({
  ok: false,
  reason: `${what} — le calcul reste vide tant que la valeur manque, rien n'est estimé à sa place.`,
})

const ZONE_NUMBER: Record<string, ZoneNumber> = { Z1: 1, Z2: 2, Z3: 3, Z4: 4, Z5: 5, Z6: 6 }

function boundRow(zone: string, low: string | number | null, high: string | number | null, unit: string): CalculatorRow {
  const text =
    low === null && high === null
      ? '—'
      : low === null
        ? `≤ ${high} ${unit}`
        : high === null
          ? `≥ ${low} ${unit}`
          : `${low} – ${high} ${unit}`
  return { label: zone, value: text, zone: ZONE_NUMBER[zone] }
}

// --- Valeurs de départ tirées du profil ---------------------------------------------------

const fromCss = (profile: AthleteProfile | undefined) => profile?.css?.paceMinPer100m ?? ''
const fromFtp = (profile: AthleteProfile | undefined) => (profile?.ftp ? String(profile.ftp.watts) : '')
const fromRunThreshold = (profile: AthleteProfile | undefined) => profile?.runThreshold?.paceMinPerKm ?? ''
const none = () => ''

/**
 * Puissance moyenne d'un test de 20 min reconstruite depuis la FTP enregistrée (`FTP = 0,95 × P20`).
 * C'est l'inverse exact du calculateur 07/12 : la valeur affichée reste celle de l'athlète, pas une
 * valeur d'exemple.
 */
const fromFtpAs20Min = (profile: AthleteProfile | undefined) =>
  profile?.ftp ? String(Math.round(profile.ftp.watts / 0.95)) : ''

/** Distance qu'un test de 30 min à l'allure seuil enregistrée aurait couverte (inverse du 08/12). */
const fromThresholdAsDistance = (profile: AthleteProfile | undefined) => {
  const paceSec = profile?.runThreshold ? parsePaceToSeconds(profile.runThreshold.paceMinPerKm) : null
  if (paceSec === null || paceSec <= 0) return ''
  return String(Math.round((1800 / paceSec) * 1000))
}

// --- Distances officielles par format ------------------------------------------------------

/** Distances officielles des quatre formats portés par `PlanFormat`. */
const RACE_DISTANCES: Record<PlanFormat, { swimM: number; bikeKm: number; runKm: number }> = {
  Sprint: { swimM: 750, bikeKm: 20, runKm: 5 },
  Olympique: { swimM: 1500, bikeKm: 40, runKm: 10 },
  '70.3': { swimM: 1900, bikeKm: 90, runKm: 21.1 },
  Ironman: { swimM: 3800, bikeKm: 180, runKm: 42.2 },
}

const FORMAT_OPTIONS: ChoiceOption[] = (Object.keys(RACE_DISTANCES) as PlanFormat[]).map((format) => ({
  value: format,
  label: format,
}))

/** Durées de transition de l'artboard 09 (T1 3:30, T2 2:10) : le modèle ne les porte pas. */
const TRANSITIONS_SEC = { t1: 210, t2: 130 }

const SEGMENT_LABELS: Record<RaceSegment, string> = {
  N: 'Natation',
  T1: 'Transition 1',
  V: 'Vélo',
  T2: 'Transition 2',
  C: 'Course',
}

// --- Les douze ----------------------------------------------------------------------------

export const CALCULATORS: CalculatorDefinition[] = [
  {
    id: 'convertisseur-allure-natation',
    index: 1,
    titleLines: ['Allures', 'de nage'],
    cardTitle: 'Convertisseur d’allure natation',
    cardDescription: 'allure /100 m, vitesse et temps sur une distance — conversions pures',
    discipline: 'N',
    resultLabel: 'Temps sur la distance',
    fields: [
      { key: 'pace', label: 'Allure', kind: 'value', unit: '/100 m', short: '/100 m', emphasis: true, initial: fromCss },
      { key: 'distance', label: 'Distance', kind: 'value', unit: 'm', short: 'm', initial: () => '1900', inputMode: 'numeric' },
    ],
    run: (values) => {
      const paceSec = readPaceSeconds(values, 'pace')
      if (paceSec === null || paceSec <= 0) return MISSING_FIELD('Allure aux 100 m attendue au format m:ss')
      const distance = readNumber(values, 'distance')
      if (distance === null || distance <= 0) return MISSING_FIELD('Distance en mètres attendue')

      const conversions = swimPaceConversions(paceSec)
      const time = swimTimeForDistance(paceSec, distance)
      return {
        ok: true,
        headline: formatClock(time.value),
        secondary: `${formatDecimalFr(conversions.value.speedKmh, 2)} km/h · ${formatDecimalFr(conversions.value.speedMs, 2)} m/s`,
        proofLevel: conversions.proofLevel,
        source: conversions.source,
      }
    },
  },

  {
    id: 'intensite-et-charge',
    index: 2,
    titleLines: ['Intensité', 'et charge'],
    cardTitle: 'Intensité (IF) et TSS',
    cardDescription: 'ce qu’une séance a coûté, comparable d’une discipline à l’autre',
    resultLabel: 'Charge de la séance',
    fields: [
      {
        key: 'discipline',
        label: 'Discipline',
        kind: 'choice',
        options: [
          { value: 'N', label: 'natation' },
          { value: 'V', label: 'vélo' },
          { value: 'C', label: 'course' },
        ],
        initial: () => 'V',
      },
      {
        key: 'effort',
        label: 'Effort tenu',
        kind: 'value',
        emphasis: true,
        // Vélo : puissance normalisée en watts. Natation / course : allure réelle, m:ss.
        initial: (profile) => (profile?.ftp ? String(Math.round(profile.ftp.watts * 0.85)) : ''),
      },
      { key: 'duration', label: 'Durée', kind: 'value', unit: 'min', short: 'durée', initial: () => '90', inputMode: 'numeric' },
    ],
    run: (values, profile) => {
      const duration = readNumber(values, 'duration')
      if (duration === null || duration <= 0) return MISSING_FIELD('Durée de la séance en minutes attendue')

      const discipline = values['discipline'] ?? 'V'
      let factor: ReturnType<typeof intensityFactorBike> | null = null

      if (discipline === 'V') {
        const power = readNumber(values, 'effort')
        if (power === null || power <= 0) return MISSING_FIELD('Puissance normalisée en watts attendue')
        if (!profile?.ftp) return MISSING_FIELD('Aucune FTP enregistrée dans le profil')
        factor = intensityFactorBike(power, profile.ftp.watts)
      } else if (discipline === 'C') {
        const pace = readPaceSeconds(values, 'effort')
        if (pace === null || pace <= 0) return MISSING_FIELD('Allure réelle au kilomètre attendue au format m:ss')
        const threshold = profile?.runThreshold ? parsePaceToSeconds(profile.runThreshold.paceMinPerKm) : null
        if (threshold === null) return MISSING_FIELD('Aucune allure seuil enregistrée dans le profil')
        factor = intensityFactorRun(threshold, pace)
      } else {
        const pace = readPaceSeconds(values, 'effort')
        if (pace === null || pace <= 0) return MISSING_FIELD('Allure réelle aux 100 m attendue au format m:ss')
        const css = profile?.css ? parsePaceToSeconds(profile.css.paceMinPer100m) : null
        if (css === null) return MISSING_FIELD('Aucun CSS enregistré dans le profil')
        factor = intensityFactorSwim(css, pace)
      }

      const tss = tssFromDurationAndIf(duration / 60, factor.value)
      return {
        ok: true,
        headline: formatDecimalFr(Math.round(tss.value)),
        headlineUnit: 'TSS',
        secondary: `IF ${formatDecimalFr(factor.value, 2)} · ${formatHours(duration / 60)}`,
        proofLevel: tss.proofLevel,
        source: `${factor.source}. ${tss.source}`,
      }
    },
  },

  {
    id: 'zones-de-puissance',
    index: 3,
    titleLines: ['Zones de', 'puissance'],
    cardTitle: 'FTP → zones de puissance',
    cardDescription: 'bornes Z1 à Z6 en watts, à partir de la FTP',
    discipline: 'V',
    resultLabel: 'Bornes par zone',
    fields: [{ key: 'ftp', label: 'FTP', kind: 'value', unit: 'W', short: 'W', emphasis: true, initial: fromFtp, inputMode: 'numeric' }],
    run: (values) => {
      const ftp = readNumber(values, 'ftp')
      if (ftp === null || ftp <= 0) return MISSING_FIELD('FTP en watts attendue')
      const zones = ftpPowerZones(ftp)
      return {
        ok: true,
        rowsHead: ['Zone', 'Puissance'],
        rows: zones.value.map((bound) => boundRow(bound.zone, bound.minWatts, bound.maxWatts, 'W')),
        proofLevel: zones.proofLevel,
        source: zones.source,
      }
    },
  },

  {
    id: 'bassin-eau-libre',
    index: 4,
    titleLines: ['Bassin →', 'eau libre'],
    cardTitle: 'Bassin → eau libre',
    cardDescription: 'ce que ton allure en bassin devient en eau libre, et avec quelle marge',
    discipline: 'N',
    resultLabel: 'Estimation eau libre',
    fields: [
      { key: 'poolPace', label: 'Allure en bassin', kind: 'value', unit: '/100 m', short: '/100 m bassin', emphasis: true, initial: fromCss },
      {
        key: 'poolLength',
        label: 'Bassin',
        kind: 'choice',
        inlineWithLabel: true,
        options: [
          { value: '25', label: '25 m' },
          { value: '50', label: '50 m' },
        ],
        initial: () => '25',
      },
      {
        key: 'wetsuit',
        label: 'Combinaison',
        kind: 'choice',
        options: [
          { value: 'oui', label: 'oui' },
          { value: 'non', label: 'non' },
        ],
        initial: () => 'oui',
      },
      {
        key: 'sighting',
        label: 'Sighting',
        kind: 'choice',
        options: [
          { value: 'faible', label: 'faible' },
          { value: 'moyenne', label: 'moyenne' },
          { value: 'elevee', label: 'élevée' },
        ],
        initial: () => 'elevee',
      },
    ],
    run: (values) => {
      const poolPace = readPaceSeconds(values, 'poolPace')
      if (poolPace === null || poolPace <= 0) return MISSING_FIELD('Allure en bassin attendue au format m:ss')

      const poolLengthM = values['poolLength'] === '50' ? (50 as const) : (25 as const)
      const wetsuit = (values['wetsuit'] ?? 'oui') === 'oui'
      const sightingFrequency = (values['sighting'] ?? 'elevee') as SightingFrequency

      const estimate = openWaterPaceFromPool({
        poolPaceSecPer100m: poolPace,
        poolLengthM,
        wetsuit,
        sightingFrequency,
      })
      const { lowPaceSecPer100m, centralPaceSecPer100m, highPaceSecPer100m } = estimate.value

      // Échelle de la barre : l'enveloppe complète de ce que le modèle peut produire pour cette
      // allure de bassin, toutes options confondues (−3 s à +5 s / 100 m d'après les trois
      // fourchettes du calculateur 04/12). La bande hachurée dit donc où les options déclarées
      // placent l'athlète à l'intérieur de ce que le modèle sait faire — pas un simple décor.
      const envelopeLow = poolPace - 3
      const envelopeSpan = 8
      const clamp = (value: number) => Math.min(100, Math.max(0, value))
      const lowPercent = clamp(((lowPaceSecPer100m - envelopeLow) / envelopeSpan) * 100)
      const highPercent = clamp(((highPaceSecPer100m - envelopeLow) / envelopeSpan) * 100)

      // 1,9 km : la distance de natation du 70.3, celle que l'artboard 13 prend pour repère.
      const lengths = 19
      return {
        ok: true,
        headline: formatPaceMinSec(centralPaceSecPer100m),
        headlineUnit: '/100 m',
        secondary: `1,9 km ≈ ${formatClock(centralPaceSecPer100m * lengths)}`,
        range: {
          lowPercent,
          highPercent,
          lowLabel: formatClock(lowPaceSecPer100m * lengths),
          caption: 'fourchette réelle',
          highLabel: formatClock(highPaceSecPer100m * lengths),
        },
        proofLevel: estimate.proofLevel,
        source: estimate.source,
      }
    },
    worth:
      'La conversion additionne trois effets mal quantifiés : plus de virages, flottaison de la combinaison, coût du sighting. La fourchette est large parce que la littérature l’est.',
    footnote: {
      mark: '8.',
      text: 'À recaler sur ta première eau libre — c’est ta mesure qui compte, pas l’estimation.',
    },
  },

  {
    id: 'glucides-course',
    index: 5,
    titleLines: ['Glucides', 'en course'],
    cardTitle: 'Nutrition course',
    cardDescription: 'glucides par heure et total sur la durée de course',
    resultLabel: 'Glucides à emporter',
    fields: [
      { key: 'rate', label: 'Débit', kind: 'value', unit: 'g/h', short: 'g/h', emphasis: true, initial: () => '78', inputMode: 'numeric' },
      { key: 'duration', label: 'Durée', kind: 'value', unit: 'h', initial: () => '5', inputMode: 'decimal' },
    ],
    run: (values) => {
      const rate = readNumber(values, 'rate')
      if (rate === null || rate <= 0) return MISSING_FIELD('Débit de glucides en grammes par heure attendu')
      const duration = readNumber(values, 'duration')
      if (duration === null || duration <= 0) return MISSING_FIELD('Durée de course en heures attendue')

      const total = carbsForDuration(rate, duration)
      return {
        ok: true,
        headline: formatDecimalFr(Math.round(total.value)),
        headlineUnit: 'g',
        secondary: `${formatDecimalFr(rate)} g/h · ${formatHours(duration)}`,
        proofLevel: total.proofLevel,
        source: total.source,
      }
    },
  },

  {
    id: 'hydratation-et-sodium',
    index: 6,
    titleLines: ['Hydratation', 'et sodium'],
    cardTitle: 'Hydratation et sodium',
    cardDescription: 'pertes hydriques et sodium à remplacer, d’après ton taux de sudation',
    resultLabel: 'Pertes sur la course',
    fields: [
      {
        key: 'sweat',
        short: 'L/h',
        label: 'Taux de sudation',
        kind: 'value',
        unit: 'L/h',
        emphasis: true,
        initial: (profile) => (profile && profile.sweatRateLPerH > 0 ? formatDecimalFr(profile.sweatRateLPerH) : ''),
        inputMode: 'decimal',
      },
      { key: 'duration', label: 'Durée', kind: 'value', unit: 'h', initial: () => '5', inputMode: 'decimal' },
    ],
    run: (values) => {
      const sweat = readNumber(values, 'sweat')
      if (sweat === null || sweat <= 0) return MISSING_FIELD('Taux de sudation en litres par heure attendu')
      const duration = readNumber(values, 'duration')
      if (duration === null || duration <= 0) return MISSING_FIELD('Durée de course en heures attendue')

      const result = hydrationForDuration(sweat, duration)
      const { fluidLossesL, sodiumMgLow, sodiumMgHigh } = result.value
      return {
        ok: true,
        headline: formatDecimalFr(fluidLossesL, 1),
        headlineUnit: 'L',
        secondary: `sodium ${formatDecimalFr(Math.round(sodiumMgLow), 0)} – ${formatDecimalFr(Math.round(sodiumMgHigh), 0)} mg`,
        proofLevel: result.proofLevel,
        source: result.source,
      }
    },
  },

  {
    id: 'test-20-min-ftp',
    index: 7,
    titleLines: ['Test 20 min', '→ FTP'],
    cardTitle: 'FTP vélo',
    cardDescription: 'puissance au seuil, dérivée d’un test de 20 min × 0,95',
    discipline: 'V',
    resultLabel: 'FTP estimée',
    fields: [
      {
        key: 'power20',
        short: 'W 20′',
        label: 'Puissance moyenne 20 min',
        kind: 'value',
        unit: 'W',
        emphasis: true,
        initial: fromFtpAs20Min,
        inputMode: 'numeric',
      },
      {
        key: 'weight',
        short: 'kg',
        label: 'Poids',
        kind: 'value',
        unit: 'kg',
        initial: (profile) => (profile && profile.weightKg > 0 ? formatDecimalFr(profile.weightKg) : ''),
        inputMode: 'decimal',
      },
    ],
    run: (values) => {
      const power = readNumber(values, 'power20')
      if (power === null || power <= 0) return MISSING_FIELD('Puissance moyenne du test de 20 min attendue')

      const ftp = ftpFrom20MinTest(power)
      const weight = readNumber(values, 'weight')
      return {
        ok: true,
        headline: String(ftp.value),
        headlineUnit: 'W',
        secondary: weight && weight > 0 ? `${formatDecimalFr(ftp.value / weight)} W/kg` : undefined,
        proofLevel: ftp.proofLevel,
        source: ftp.source,
      }
    },
  },

  {
    id: 'test-30-min-course',
    index: 8,
    titleLines: ['Test 30 min', '→ seuil'],
    cardTitle: 'Allures course',
    cardDescription: 'zones d’allure à partir d’un 30 min contre-la-montre',
    discipline: 'C',
    resultLabel: 'Allure au seuil',
    fields: [
      {
        key: 'distance',
        short: 'm en 30′',
        label: 'Distance en 30 min',
        kind: 'value',
        unit: 'm',
        emphasis: true,
        initial: fromThresholdAsDistance,
        inputMode: 'numeric',
      },
    ],
    run: (values) => {
      const distance = readNumber(values, 'distance')
      if (distance === null || distance <= 0) return MISSING_FIELD('Distance couverte en 30 min attendue, en mètres')

      const result = runThresholdFrom30MinTest(distance)
      return {
        ok: true,
        headline: result.value.thresholdPaceMinPerKm,
        headlineUnit: '/km',
        secondary: `${formatDecimalFr(result.value.speedKmh)} km/h · VMA ${formatDecimalFr(result.value.vmaKmh)}`,
        proofLevel: result.proofLevel,
        source: result.source,
      }
    },
  },

  {
    id: 'css-400-200',
    index: 9,
    titleLines: ['CSS', '400 / 200'],
    cardTitle: 'CSS natation',
    cardDescription: 'vitesse critique de nage, d’après un 400 m et un 200 m tenus au maximum',
    discipline: 'N',
    resultLabel: 'Vitesse critique de nage',
    fields: [
      // Valeurs de départ de l'artboard S8, seul endroit du canevas qui donne un couple 400/200.
      { key: 't400', label: 'Temps 400 m', kind: 'value', short: '400 m', emphasis: true, initial: () => '5:58' },
      { key: 't200', label: 'Temps 200 m', kind: 'value', short: '200 m', initial: () => '2:47' },
    ],
    run: (values) => {
      const t400 = readPaceSeconds(values, 't400')
      const t200 = readPaceSeconds(values, 't200')
      if (t400 === null) return MISSING_FIELD('Temps sur 400 m attendu au format m:ss')
      if (t200 === null) return MISSING_FIELD('Temps sur 200 m attendu au format m:ss')
      if (t400 <= t200) {
        return {
          ok: false,
          reason: 'Le 400 m doit être plus long que le 200 m : sans écart de temps, la vitesse critique n’existe pas.',
        }
      }

      const css = cssFrom400And200(t400, t200)
      return {
        ok: true,
        headline: css.value.pacePer100m,
        headlineUnit: '/100 m',
        secondary: `${formatDecimalFr(css.value.speedMs, 2)} m/s`,
        proofLevel: css.proofLevel,
        source: css.source,
      }
    },
  },

  {
    id: 'pacing-course',
    index: 10,
    titleLines: ['Pacing', 'de course'],
    cardTitle: 'Pacing multi-segments',
    cardDescription: 'répartition du temps par segment, depuis tes références et une intensité cible',
    resultLabel: 'Temps cible',
    fields: [
      { key: 'format', label: 'Format', kind: 'choice', options: FORMAT_OPTIONS, short: 'format', initial: () => '70.3' },
      {
        key: 'bikeSpeed',
        short: 'km/h',
        label: 'Vitesse seuil vélo',
        kind: 'value',
        unit: 'km/h',
        emphasis: true,
        // Absente du modèle : `AthleteProfile` ne porte que la FTP en watts. Le champ reste vide
        // tant que l'athlète ne l'a pas saisi — aucune vitesse n'est déduite d'une puissance.
        initial: none,
        inputMode: 'decimal',
      },
      // Intensités cibles de l'artboard 09 (« IF 0,78 » au vélo, 1:48/100 m et 5:12/km ailleurs).
      { key: 'ifSwim', label: 'IF nage', kind: 'value', initial: () => '0,85', inputMode: 'decimal' },
      { key: 'ifBike', label: 'IF vélo', kind: 'value', initial: () => '0,78', inputMode: 'decimal' },
      { key: 'ifRun', label: 'IF course', kind: 'value', initial: () => '0,81', inputMode: 'decimal' },
    ],
    run: (values, profile) => {
      const format = (values['format'] ?? '70.3') as PlanFormat
      const distances = RACE_DISTANCES[format] ?? RACE_DISTANCES['70.3']

      const bikeSpeed = readNumber(values, 'bikeSpeed')
      if (bikeSpeed === null || bikeSpeed <= 0) {
        return {
          ok: false,
          reason:
            'Aucune vitesse seuil vélo : le profil ne porte que la FTP en watts, et une puissance ne se convertit pas en vitesse sans connaître le parcours. Saisis-la pour obtenir la répartition.',
        }
      }

      const cssSec = profile?.css ? parsePaceToSeconds(profile.css.paceMinPer100m) : null
      const runSec = profile?.runThreshold ? parsePaceToSeconds(profile.runThreshold.paceMinPerKm) : null
      if (cssSec === null || runSec === null) {
        return {
          ok: false,
          reason: 'Il manque une référence mesurée (CSS ou allure seuil) : la répartition part de tes références, pas d’une moyenne.',
        }
      }

      const ifSwim = readNumber(values, 'ifSwim')
      const ifBike = readNumber(values, 'ifBike')
      const ifRun = readNumber(values, 'ifRun')
      if (!ifSwim || !ifBike || !ifRun) return MISSING_FIELD('Trois intensités cibles attendues, une par discipline')

      const pacing = raceSegmentPacing({
        distances,
        targetIf: { swim: ifSwim, bike: ifBike, run: ifRun },
        references: {
          cssPaceSecPer100m: cssSec,
          bikeThresholdSpeedKmh: bikeSpeed,
          runThresholdPaceSecPerKm: runSec,
        },
        transitionsSec: TRANSITIONS_SEC,
      })

      return {
        ok: true,
        headline: formatClock(pacing.value.targetTimeSec),
        secondary: `${format} · transitions comptées`,
        rowsHead: ['Segment', 'Cumul'],
        rows: pacing.value.segments.map((segment) => ({
          label: segment.pace ? `${SEGMENT_LABELS[segment.segment]} · ${segment.pace}` : SEGMENT_LABELS[segment.segment],
          value: formatClock(segment.cumulativeTimeSec),
        })),
        proofLevel: pacing.proofLevel,
        source: pacing.source,
      }
    },
  },

  {
    id: 'zones-allure-course',
    index: 11,
    titleLines: ['Zones', 'd’allure'],
    cardTitle: 'Allure seuil → zones d’allure',
    cardDescription: 'bornes Z1 à Z6 au kilomètre, à partir de l’allure seuil',
    discipline: 'C',
    resultLabel: 'Bornes par zone',
    fields: [
      {
        key: 'threshold',
        short: '/km',
        label: 'Allure seuil',
        kind: 'value',
        unit: '/km',
        emphasis: true,
        initial: fromRunThreshold,
      },
    ],
    run: (values) => {
      const threshold = readPaceSeconds(values, 'threshold')
      if (threshold === null || threshold <= 0) return MISSING_FIELD('Allure seuil au kilomètre attendue au format m:ss')
      const zones = runPaceZonesFromThreshold(threshold)
      return {
        ok: true,
        rowsHead: ['Zone', 'Allure /km'],
        rows: zones.value.map((bound) =>
          boundRow(bound.zone, bound.fastPaceMinPerKm, bound.slowPaceMinPerKm, ''),
        ),
        proofLevel: zones.proofLevel,
        source: zones.source,
      }
    },
  },

  {
    id: 'zones-frequence-cardiaque',
    index: 12,
    titleLines: ['Zones', 'cardiaques'],
    cardTitle: 'Zones de fréquence cardiaque',
    cardDescription: 'bornes Z1 à Z6 en battements, par pourcentage de FC max mesurée',
    resultLabel: 'Bornes par zone',
    fields: [
      {
        key: 'maxHr',
        short: 'bpm',
        label: 'FC max mesurée',
        kind: 'value',
        unit: 'bpm',
        emphasis: true,
        initial: (profile) => (profile && profile.maxHeartRateBpm > 0 ? String(profile.maxHeartRateBpm) : ''),
        inputMode: 'numeric',
      },
    ],
    run: (values) => {
      const maxHr = readNumber(values, 'maxHr')
      if (maxHr === null || maxHr <= 0) {
        return {
          ok: false,
          reason:
            'Aucune FC max mesurée : elle n’est jamais estimée d’après l’âge, et les zones cardio restent masquées tant qu’elle ne l’est pas.',
        }
      }
      const zones = heartRateZones(maxHr)
      return {
        ok: true,
        rowsHead: ['Zone', 'Fréquence'],
        rows: zones.value.map((bound) => boundRow(bound.zone, bound.minBpm, bound.maxBpm, 'bpm')),
        proofLevel: zones.proofLevel,
        source: zones.source,
      }
    },
  },
]

export const CALCULATOR_COUNT = CALCULATORS.length

export function findCalculator(id: string | undefined): CalculatorDefinition | undefined {
  return CALCULATORS.find((calculator) => calculator.id === id)
}

/** Valeurs de départ d'un calculateur, tirées du profil quand il les porte. */
export function initialValues(
  definition: CalculatorDefinition,
  profile: AthleteProfile | undefined,
): CalculatorValues {
  const values: CalculatorValues = {}
  for (const field of definition.fields) values[field.key] = field.initial(profile)
  return values
}

/** `04 / 12` — compteur mono de l'artboard 13. */
export function calculatorCounter(definition: CalculatorDefinition): string {
  return `${String(definition.index).padStart(2, '0')} / ${String(CALCULATOR_COUNT).padStart(2, '0')}`
}
