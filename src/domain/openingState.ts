// Écran d'ouverture (mockups 01/01b/01c en mobile, S9/S9b/S9c en desktop).
//
// L'écran n'a pas trois variantes décidées par une route ou un réglage : il en a trois décidées
// par ce qui est enregistré sur l'appareil. Ce module est la seule autorité sur ce choix et sur
// les libellés dérivés ; la vue ne fait que peindre ce qu'il retourne, et ne calcule ni date,
// ni pourcentage, ni écart de référence.
//
// Pur : ni horloge, ni persistance — `today` est injecté, comme dans `planWeek.ts`.

import type { AthleteProfile, Discipline, PlanDay, Race, TrainingPlan, Workout } from './types'
import { ZONE_LABELS, formatDistanceM, formatDurationCompact, formatDurationMin, formatMeters } from './workoutFormat'
import { weekdayIndex } from './planWeek'

/**
 * - `first_visit` : rien sur l'appareil (01b/S9b) — on n'affiche aucun faux plan.
 * - `plan_in_progress` : un plan actif (01/S9) — il y a quelque chose à reprendre.
 * - `race_done` : aucun plan actif mais au moins un plan archivé (01c/S9c) — plus rien à
 *   reprendre, mais un bilan et des références à reporter.
 */
export type OpeningStateKind = 'first_visit' | 'plan_in_progress' | 'race_done'

/** Index 0 = lundi, comme `DAY_SHORT_LABELS` de planWeek.ts. */
const DAY_LONG_LABELS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

const MONTH_LABELS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const

/** `2026-08-30` → `30 août`. Les dates du domaine sont des jours ISO, jamais des `Date`. */
export function formatDayMonth(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10))
  const month = MONTH_LABELS[Number(isoDate.slice(5, 7)) - 1]
  if (!month || Number.isNaN(day)) return isoDate
  return `${day} ${month}`
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

/** `4:12` → 252 s. `null` si la référence n'a pas la forme attendue (jamais devinée). */
function parsePaceToSeconds(pace: string): number | null {
  const match = /^(\d+):(\d{2})$/.exec(pace.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function plural(count: number, singular: string): string {
  return count > 1 ? `${singular}s` : singular
}

export interface OpeningNextSession {
  /** `mardi` — jour de la prochaine séance à venir, plan compris dans son entier. */
  dayLabel: string
  /** `seuil 2 400 m` — zone puis distance (ou durée), rien d'inventé quand les champs manquent. */
  detail: string
}

/** Carte centrale de l'état « plan en cours ». */
export interface OpeningActivePlanCard {
  planId: string
  /** Nom de la course visée, à défaut le format du plan. */
  title: string
  /** `J-77`, absent si le plan n'est rattaché à aucune course datée. */
  countdownLabel?: string
  /** `Semaine 07 / 18`. */
  weekLabel: string
  /** Avancement en pourcentage, semaine courante comprise. */
  progressPercent: number
  nextSession?: OpeningNextSession
}

/** Ligne de la liste « Archivés ». */
export interface OpeningArchivedPlanRow {
  planId: string
  title: string
  /** `12 sem. · terminé le 18 mai` ou `16 sem. · abandonné sem. 09`. */
  detail: string
}

/** Carte centrale de l'état « course courue ». */
export interface OpeningFinishedPlanCard {
  planId: string
  title: string
  /** La course a un résultat enregistré → badge « Couru ». */
  isRaceRun: boolean
  /** `5 h 12 · 30 août`, ou le nombre de semaines si aucun résultat n'est enregistré. */
  headline: string
  /** `18 semaines · 141 séances sur 156`. */
  detail: string
}

/** Ligne « Références à reporter » : valeur actuelle et écart avec la photo prise par le plan. */
export interface OpeningReferenceRow {
  discipline: Extract<Discipline, 'N' | 'V' | 'C'>
  /** `FTP 268 W`, `Seuil 4:05 /km`, `CSS 1:28 /100 m`. */
  label: string
  /** `+11 W`, `−7 s` — absent si le plan n'avait pas photographié cette référence. */
  deltaLabel?: string
  /** L'écart va dans le sens du progrès (plus de watts, moins de secondes au kilomètre). */
  improved?: boolean
}

export interface OpeningState {
  kind: OpeningStateKind
  activeCount: number
  archivedCount: number
  /** `1 en cours · 2 archivés`, ou `aucun plan` à la première visite. */
  summaryLabel: string
  activePlan?: OpeningActivePlanCard
  archivedPlans: OpeningArchivedPlanRow[]
  finishedPlan?: OpeningFinishedPlanCard
  references: OpeningReferenceRow[]
  /** `30 août` — date de la référence la plus récemment mesurée, si le profil en porte une. */
  referencesDateLabel?: string
}

export interface OpeningStateInput {
  plans: TrainingPlan[]
  races: Race[]
  workouts: Workout[]
  profile?: AthleteProfile
  /** Jour courant ISO `YYYY-MM-DD` (voir `todayIso()`). */
  today: string
}

function planTitle(plan: TrainingPlan, raceById: Map<string, Race>): string {
  const race = plan.raceId ? raceById.get(plan.raceId) : undefined
  return race?.name ?? plan.format
}

/** Toutes les journées du plan, dans l'ordre chronologique. */
function planDays(plan: TrainingPlan): PlanDay[] {
  return plan.weeks.flatMap((week) => week.days).sort((a, b) => a.date.localeCompare(b.date))
}

function nextSession(plan: TrainingPlan, catalogue: Map<string, Workout>, today: string): OpeningNextSession | undefined {
  for (const day of planDays(plan)) {
    if (day.date < today) continue
    for (const id of day.workoutIds) {
      const workout = catalogue.get(id)
      if (!workout || workout.status !== 'planned') continue

      const parts: string[] = []
      if (workout.zone) parts.push(ZONE_LABELS[workout.zone].toLowerCase())
      if (workout.distanceM) {
        // La natation se compte en mètres jusqu'au bout (même règle que `workoutSubDetail`).
        parts.push(workout.discipline === 'N' ? formatMeters(workout.distanceM) : formatDistanceM(workout.distanceM))
      } else {
        parts.push(formatDurationCompact(workout.durationMin))
      }

      return { dayLabel: DAY_LONG_LABELS[weekdayIndex(day.date)], detail: parts.join(' ') }
    }
  }
  return undefined
}

function buildActivePlanCard(
  plan: TrainingPlan,
  raceById: Map<string, Race>,
  catalogue: Map<string, Workout>,
  today: string,
): OpeningActivePlanCard {
  const race = plan.raceId ? raceById.get(plan.raceId) : undefined
  const currentWeek = plan.weeks.find((week) => week.days.some((day) => day.date === today)) ?? plan.weeks[0]
  const weekNumber = currentWeek?.weekNumber ?? 1
  const weeksCount = plan.weeksCount || plan.weeks.length || 1
  const daysToRace = race ? daysBetween(today, race.date) : undefined

  return {
    planId: plan.id,
    title: planTitle(plan, raceById),
    countdownLabel: daysToRace !== undefined && daysToRace >= 0 ? `J-${daysToRace}` : undefined,
    weekLabel: `Semaine ${String(weekNumber).padStart(2, '0')} / ${weeksCount}`,
    progressPercent: Math.min(100, Math.round((weekNumber / weeksCount) * 100)),
    nextSession: nextSession(plan, catalogue, today),
  }
}

function buildArchivedRow(plan: TrainingPlan, raceById: Map<string, Race>): OpeningArchivedPlanRow {
  const weeks = `${plan.weeksCount || plan.weeks.length} sem.`
  const detail =
    plan.status === 'archived_abandoned'
      ? `${weeks} · abandonné${plan.abandonedAtWeek ? ` sem. ${String(plan.abandonedAtWeek).padStart(2, '0')}` : ''}`
      : `${weeks} · terminé le ${formatDayMonth(plan.endDate)}`

  return { planId: plan.id, title: planTitle(plan, raceById), detail }
}

function buildFinishedPlanCard(
  plan: TrainingPlan,
  raceById: Map<string, Race>,
  catalogue: Map<string, Workout>,
): OpeningFinishedPlanCard {
  const race = plan.raceId ? raceById.get(plan.raceId) : undefined
  const weeksCount = plan.weeksCount || plan.weeks.length

  const ids = planDays(plan).flatMap((day) => day.workoutIds)
  const doneCount = ids.filter((id) => catalogue.get(id)?.status === 'completed').length

  const headline = race?.result
    ? `${formatDurationMin(race.result.timeSec / 60)} · ${formatDayMonth(race.date)}`
    : `${weeksCount} ${plural(weeksCount, 'semaine')}`

  return {
    planId: plan.id,
    title: planTitle(plan, raceById),
    isRaceRun: Boolean(race?.result),
    headline,
    detail: `${weeksCount} ${plural(weeksCount, 'semaine')} · ${doneCount} séances sur ${ids.length}`,
  }
}

interface DeltaCopy {
  deltaLabel?: string
  improved?: boolean
}

function wattsDelta(current: number, snapshot?: number): DeltaCopy {
  if (snapshot === undefined) return {}
  const delta = current - snapshot
  if (delta === 0) return {}
  return { deltaLabel: `${delta > 0 ? '+' : '−'}${Math.abs(delta)} W`, improved: delta > 0 }
}

function paceDelta(current: string, snapshot?: string): DeltaCopy {
  if (snapshot === undefined) return {}
  const currentSec = parsePaceToSeconds(current)
  const snapshotSec = parsePaceToSeconds(snapshot)
  if (currentSec === null || snapshotSec === null) return {}
  const delta = currentSec - snapshotSec
  if (delta === 0) return {}
  // Une allure qui baisse est un progrès : le signe affiché est celui de l'écart, pas du progrès.
  return { deltaLabel: `${delta > 0 ? '+' : '−'}${Math.abs(delta)} s`, improved: delta < 0 }
}

/**
 * Références actuelles du profil confrontées à la photo prise par le plan de référence.
 * Une référence absente du profil ne produit aucune ligne ; un plan sans photo produit une
 * ligne sans écart, jamais un écart nul inventé.
 */
function buildReferences(profile: AthleteProfile | undefined, plan: TrainingPlan | undefined): OpeningReferenceRow[] {
  if (!profile) return []
  const snapshot = plan?.referencesSnapshot
  const rows: OpeningReferenceRow[] = []

  if (profile.css) {
    rows.push({
      discipline: 'N',
      label: `CSS ${profile.css.paceMinPer100m} /100 m`,
      ...paceDelta(profile.css.paceMinPer100m, snapshot?.cssPaceMinPer100m),
    })
  }
  if (profile.ftp) {
    rows.push({ discipline: 'V', label: `FTP ${profile.ftp.watts} W`, ...wattsDelta(profile.ftp.watts, snapshot?.ftpWatts) })
  }
  if (profile.runThreshold) {
    rows.push({
      discipline: 'C',
      label: `Seuil ${profile.runThreshold.paceMinPerKm} /km`,
      ...paceDelta(profile.runThreshold.paceMinPerKm, snapshot?.runThresholdPaceMinPerKm),
    })
  }

  return rows
}

/** Date de mesure la plus récente parmi les références du profil. */
function latestReferenceDate(profile: AthleteProfile | undefined): string | undefined {
  const dates = [profile?.css?.measuredAt, profile?.ftp?.measuredAt, profile?.runThreshold?.measuredAt].filter(
    (date): date is string => Boolean(date),
  )
  if (dates.length === 0) return undefined
  return dates.sort().at(-1)
}

/** État de l'écran d'ouverture, déduit de ce qui est enregistré sur l'appareil. */
export function selectOpeningState({ plans, races, workouts, profile, today }: OpeningStateInput): OpeningState {
  const raceById = new Map(races.map((race) => [race.id, race]))
  const catalogue = new Map(workouts.map((workout) => [workout.id, workout]))

  const activePlan = plans.find((plan) => plan.status === 'active')
  // Le plus récemment terminé en tête : c'est celui dont on propose le bilan.
  const archived = plans
    .filter((plan) => plan.status !== 'active')
    .sort((a, b) => b.endDate.localeCompare(a.endDate))

  const activeCount = activePlan ? 1 : 0
  const archivedCount = archived.length

  if (activePlan) {
    return {
      kind: 'plan_in_progress',
      activeCount,
      archivedCount,
      summaryLabel: `1 en cours · ${archivedCount} ${plural(archivedCount, 'archivé')}`,
      activePlan: buildActivePlanCard(activePlan, raceById, catalogue, today),
      archivedPlans: archived.map((plan) => buildArchivedRow(plan, raceById)),
      references: [],
      referencesDateLabel: undefined,
    }
  }

  if (archivedCount > 0) {
    const finished = archived[0]
    const referencesDate = latestReferenceDate(profile)
    return {
      kind: 'race_done',
      activeCount,
      archivedCount,
      summaryLabel: `0 en cours · ${archivedCount} ${plural(archivedCount, 'archivé')}`,
      archivedPlans: archived.slice(1).map((plan) => buildArchivedRow(plan, raceById)),
      finishedPlan: buildFinishedPlanCard(finished, raceById, catalogue),
      references: buildReferences(profile, finished),
      referencesDateLabel: referencesDate ? formatDayMonth(referencesDate) : undefined,
    }
  }

  return {
    kind: 'first_visit',
    activeCount: 0,
    archivedCount: 0,
    summaryLabel: 'aucun plan',
    archivedPlans: [],
    references: [],
  }
}
