// Dérivation de la vue « Mes références » des écrans Outils (artboards 12 et S8).
//
// Fonctions pures : rien n'est inventé ici. Une référence absente du profil sort à `null`, et
// c'est l'écran qui la rend en « — » avec sa légende — jamais une estimation de remplacement.

import { formatDayMonth } from './openingState'
import { paceSecToSpeedKmh } from './calculators/paceFormat'
import { runThresholdFrom30MinTest } from './calculators/runThresholdFrom30MinTest'
import type { AthleteProfile, TrainingPlan, Workout } from './types'

export type ReferenceKey = 'css' | 'ftp' | 'runThreshold'

/** Nombre décimal en français : virgule décimale, pas de zéro superflu (`3,4`, `72,5`). */
export function formatDecimalFr(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits })
}

/** `4:12` → 252 s. `null` si la chaîne n'a pas la forme attendue — jamais devinée. */
export function parsePaceToSeconds(pace: string): number | null {
  const match = /^(\d+):(\d{2})$/.exec(pace.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.round((to - from) / 86_400_000)
}

/**
 * VMA déduite de l'allure seuil enregistrée, en repassant par le calculateur 08/12 : on
 * reconstruit la distance qu'un test de 30 min à cette allure aurait couverte, puis on lui
 * redemande sa VMA. Le coefficient reste dans le calculateur — l'écran n'en porte aucun.
 */
export function vmaFromThresholdPace(paceMinPerKm: string): number | null {
  const paceSec = parsePaceToSeconds(paceMinPerKm)
  if (paceSec === null || paceSec <= 0) return null
  const distanceM = (1800 / paceSec) * 1000
  return runThresholdFrom30MinTest(distanceM).value.vmaKmh
}

export interface ReferenceLine {
  key: ReferenceKey
  discipline: 'N' | 'V' | 'C'
  /** Étiquette courte de l'artboard 12 : `CSS`, `FTP`, `SEUIL`. */
  label: string
  /** Étiquette longue de l'artboard S8 : `CSS natation`, `FTP vélo`, `Allure seuil course`. */
  longLabel: string
  /** `1:32`, `248`, `4:12` — `null` quand le profil ne porte pas la référence. */
  value: string | null
  /** `/100 m`, `W`, `/km`. */
  unit: string
  /** Colonne droite de l'artboard 12 : `test 400/200`, `3,4 W/kg`, `VMA 17,2`. */
  meta: string | null
  measuredAt: string | null
  /** `testé le 3 août · il y a 18 j` (artboard S8). `null` sans date de mesure. */
  sinceLabel: string | null
  /** Appel de note en pied d'écran — l'artboard 12 n'en pose qu'un, le `7` de la FTP. */
  noteNumber?: number
}

export interface ProfileMeasure {
  label: string
  value: string | null
}

export interface HeartRateLine {
  label: string
  /** `186 bpm`, ou `null` : le tiret veut dire « pas de donnée », pas zéro. */
  value: string | null
  /** Phrase de l'artboard S8 quand la mesure manque ; rien à dire quand elle est là. */
  sinceLabel: string | null
}

export interface ToolsReferencesView {
  lines: ReferenceLine[]
  heartRate: HeartRateLine
  measures: ProfileMeasure[]
  /** `3 août` — date de la référence mesurée la plus récente, ou `null`. */
  lastTestLabel: string | null
  /** Combien des trois références du seuil sont réellement enregistrées. */
  measuredCount: number
}

/** Formule de l'artboard S8 pour une référence que le profil ne porte pas. */
export const NEVER_MEASURED = 'jamais mesurée · non utilisée'

const EMPTY_VIEW: ToolsReferencesView = {
  lines: [],
  heartRate: { label: 'Fréquence cardiaque max', value: null, sinceLabel: NEVER_MEASURED },
  measures: [],
  lastTestLabel: null,
  measuredCount: 0,
}

function sinceLabel(measuredAt: string | null, today: string): string | null {
  if (!measuredAt) return null
  const days = daysBetween(measuredAt, today)
  if (days < 0) return `testé le ${formatDayMonth(measuredAt)}`
  return `testé le ${formatDayMonth(measuredAt)} · il y a ${days} j`
}

/** `testé le 3 août · il y a 18 j`, ou la phrase du non-mesuré. Jamais un blanc muet. */
function lineSince(value: string | null, measuredAt: string | null, today: string): string | null {
  return value === null ? NEVER_MEASURED : sinceLabel(measuredAt, today)
}

/**
 * `AthleteProfile.maxHeartRateBpm` est un nombre obligatoire du modèle : il n'a pas d'état
 * « absent ». Une valeur nulle ou négative est donc le seul moyen d'exprimer « jamais mesurée »,
 * l'état que dessine l'artboard S8 — et il n'est jamais estimé d'après l'âge.
 */
function heartRateLine(profile: AthleteProfile | undefined): HeartRateLine {
  const bpm = profile?.maxHeartRateBpm
  if (bpm === undefined || !Number.isFinite(bpm) || bpm <= 0) return EMPTY_VIEW.heartRate
  return { label: 'Fréquence cardiaque max', value: `${bpm} bpm`, sinceLabel: null }
}

export function buildToolsReferences(
  profile: AthleteProfile | undefined,
  today: string,
): ToolsReferencesView {
  if (!profile) return EMPTY_VIEW

  const { css, ftp, runThreshold, weightKg, sweatRateLPerH } = profile

  const wattsPerKg = ftp && weightKg > 0 ? ftp.watts / weightKg : null
  const vma = runThreshold ? vmaFromThresholdPace(runThreshold.paceMinPerKm) : null

  const lines: ReferenceLine[] = [
    {
      key: 'css',
      discipline: 'N',
      label: 'CSS',
      longLabel: 'CSS natation',
      value: css?.paceMinPer100m ?? null,
      unit: '/100 m',
      // Protocole du calculateur 09/12 : le CSS ne se mesure que par ce test à deux distances.
      meta: css ? 'test 400/200' : null,
      measuredAt: css?.measuredAt ?? null,
      sinceLabel: lineSince(css?.paceMinPer100m ?? null, css?.measuredAt ?? null, today),
    },
    {
      key: 'ftp',
      discipline: 'V',
      label: 'FTP',
      longLabel: 'FTP vélo',
      value: ftp ? String(ftp.watts) : null,
      unit: 'W',
      meta: wattsPerKg === null ? null : `${formatDecimalFr(wattsPerKg)} W/kg`,
      measuredAt: ftp?.measuredAt ?? null,
      sinceLabel: lineSince(ftp ? String(ftp.watts) : null, ftp?.measuredAt ?? null, today),
      noteNumber: 7,
    },
    {
      key: 'runThreshold',
      discipline: 'C',
      label: 'SEUIL',
      longLabel: 'Allure seuil course',
      value: runThreshold?.paceMinPerKm ?? null,
      unit: '/km',
      meta: vma === null ? null : `VMA ${formatDecimalFr(vma)}`,
      measuredAt: runThreshold?.measuredAt ?? null,
      sinceLabel: lineSince(runThreshold?.paceMinPerKm ?? null, runThreshold?.measuredAt ?? null, today),
    },
  ]

  const dates = lines.map((line) => line.measuredAt).filter((date): date is string => date !== null)
  const lastTest = dates.length > 0 ? dates.slice().sort().at(-1) : undefined

  return {
    lines,
    heartRate: heartRateLine(profile),
    measures: [
      { label: 'Poids', value: weightKg > 0 ? `${formatDecimalFr(weightKg)} kg` : null },
      {
        label: 'Taux de sudation',
        value: sweatRateLPerH > 0 ? `${formatDecimalFr(sweatRateLPerH)} L/h` : null,
      },
      { label: 'FC max mesurée', value: heartRateLine(profile).value },
    ],
    lastTestLabel: lastTest ? formatDayMonth(lastTest) : null,
    measuredCount: lines.filter((line) => line.value !== null).length,
  }
}

// --- Prochain test au plan (artboard S8, colonne de droite) --------------------------------

/**
 * Le modèle ne porte aucun marqueur « ceci est un test de référence » : `generatePlan` clone ses
 * gabarits sous un identifiant de créneau, et le lien avec le gabarit d'origine est perdu. Le seul
 * signal qui survive est le titre, et ce sont les trois titres écrits dans `seedWorkouts.ts`
 * (`TEST_TEMPLATE_IDS` de `planGenerator/generatePlan.ts`).
 */
export const REFERENCE_TEST_TITLES: readonly string[] = [
  'Test CSS 400 m / 200 m',
  'Test FTP 20 minutes',
  '30 min contre-la-montre',
]

export interface NextReferenceTest {
  title: string
  /** `semaine 09` — numéro de la semaine du plan qui porte le test. */
  weekLabel: string
  /** `dans 12 jours`, `aujourd'hui`. */
  whenLabel: string
}

/** Prochaine occurrence datée d'un test de référence dans le plan actif, à partir d'aujourd'hui. */
export function findNextReferenceTest(
  plan: TrainingPlan | undefined,
  workouts: Workout[],
  today: string,
): NextReferenceTest | null {
  if (!plan) return null

  const byId = new Map(workouts.map((workout) => [workout.id, workout]))
  const candidates: { date: string; weekNumber: number; title: string }[] = []

  for (const week of plan.weeks) {
    if (week.blockedReason !== undefined) continue
    for (const day of week.days) {
      if (day.date < today) continue
      for (const id of day.workoutIds) {
        const workout = byId.get(id)
        if (!workout || workout.status !== 'planned') continue
        if (!REFERENCE_TEST_TITLES.includes(workout.title)) continue
        candidates.push({ date: day.date, weekNumber: week.weekNumber, title: workout.title })
      }
    }
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.date.localeCompare(b.date))
  const next = candidates[0]
  const days = daysBetween(today, next.date)

  return {
    title: next.title,
    weekLabel: `semaine ${String(next.weekNumber).padStart(2, '0')}`,
    whenLabel: days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`,
  }
}

// --- Utilitaires partagés avec les calculateurs -------------------------------------------

/** Vitesse en km/h depuis une allure `m:ss` au kilomètre — `null` si l'allure est illisible. */
export function speedFromPacePerKm(paceMinPerKm: string): number | null {
  const paceSec = parsePaceToSeconds(paceMinPerKm)
  if (paceSec === null || paceSec <= 0) return null
  return paceSecToSpeedKmh(paceSec)
}
