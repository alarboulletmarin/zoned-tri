// Réglages du plan — artboards 37 (« Ton plan, tes réglages »), 38 (« Avant / après ») et 39
// (« Journal du plan »).
//
// Une seule idée tient les trois écrans : **les six étapes du générateur restent ouvertes après
// acceptation**. Ce module ne recalcule donc RIEN. Il fait trois choses, et seulement trois :
//
//  1. il *relit* un plan enregistré comme un formulaire de génération (`formFromPlan`) ;
//  2. il laisse le moteur existant (`generatePlan`) produire le plan candidat ;
//  3. il *compare* les deux et décide ce qui est réécrit (`applySettingToPlan`).
//
// Aucun second moteur, aucune seconde règle de placement : la valeur affichée en « après » est
// exactement celle que l'écriture produira, parce que c'est le même plan qui sert aux deux.

import type {
  AthleteProfile,
  PlanFormat,
  PlanJournalEntry,
  PlanSettingKey,
  PlanSettingScope,
  PlanWeek,
  Race,
  TrainingPlan,
  Workout,
} from './types'
import { formatDayMonthLong } from './planGenerator/dates'
import {
  TRAINING_DISCIPLINES,
  availableDayCount,
  type AvailableDays,
  type GeneratorForm,
  type TrainingDiscipline,
} from './planGenerator/form'
import type { GeneratedPlan } from './planGenerator/summary'
import { formatDurationMin } from './workoutFormat'

/** Lundi = 0, comme `GeneratorForm.availableDays` et `weekdayIndex`. */
const DAY_SHORT = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

const DISCIPLINE_NAMES: Record<TrainingDiscipline, string> = {
  N: 'Natation',
  V: 'Vélo',
  C: 'Course',
}

// --- 37 · les six lignes de réglage ----------------------------------------------------------

/**
 * Portée d'un changement, telle que le canevas 37 la code en couleur dans sa colonne « Impact » :
 * vert = le choix des séances seulement, jaune = les semaines à venir, rouge = le plan entier.
 */
export type PlanSettingImpact = 'sessions' | 'upcoming' | 'whole_plan'

export const IMPACT_LABEL: Record<PlanSettingImpact, string> = {
  sessions: 'séances',
  upcoming: 'à venir',
  whole_plan: 'tout',
}

export interface PlanSettingRow {
  key: PlanSettingKey
  /** Intitulé de la colonne « Réglage ». */
  label: string
  /** Colonne « Valeur », déjà formatée — toute quantité s'affiche en Space Mono. */
  value: string
  impact: PlanSettingImpact
  /**
   * Vrai quand le réglage se rejoue depuis l'écran 38 (le moteur sait le recalculer). Les deux
   * réglages d'impact « tout » — le format et la date — refont le plan de zéro : ils repassent par
   * le générateur, et 37 le dit plutôt que d'ouvrir un avant/après qui mentirait sur sa portée.
   */
  reopenable: boolean
}

/** « 6 · sauf ven. », « 7 jours », « aucun jour » — colonne « Valeur » de la ligne des jours. */
export function availableDaysLabel(days: AvailableDays): string {
  const count = availableDayCount(days)
  if (count === 0) return 'aucun jour'
  if (count === DAY_SHORT.length) return '7 · tous'
  const free = DAY_SHORT.filter((_, index) => !days[index])
  return `${count} · sauf ${free.join(', ')}`
}

/** « 04 et 05 », « 04, 05 et 09 », « aucune ». */
export function blockedWeeksLabel(weekNumbers: number[]): string {
  if (weekNumbers.length === 0) return 'aucune'
  const labels = [...weekNumbers].sort((a, b) => a - b).map((week) => String(week).padStart(2, '0'))
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`
}

/**
 * « 70.3 Vichy » — le format puis le nom de la course. Le nom saisi porte souvent DÉJÀ le format
 * (« 70.3 Vichy ») : on ne le répète pas, sans quoi la ligne se lirait « 70.3 70.3 Vichy ».
 */
export function raceFormatLabel(format: PlanFormat, raceName?: string): string {
  const name = raceName?.trim() ?? ''
  if (name === '') return `${format} · aucune course`
  return name.toLowerCase().includes(format.toLowerCase()) ? name : `${format} ${name}`
}

/** Nombre d'accès / matériels déclarés sur les cinq que porte `PlanConstraints` (canevas : « 4 sur 5 »). */
const GEAR_KEYS = ['pool', 'openWater', 'homeTrainer', 'powerMeter', 'timeTrialBike'] as const

export function gearLabel(plan: TrainingPlan): string {
  const owned = GEAR_KEYS.filter((key) => plan.constraints[key] === true).length
  return `${owned} sur ${GEAR_KEYS.length}`
}

/**
 * Les six lignes de l'artboard 37, dans son ordre — une par étape du générateur, plus la ligne des
 * semaines réduites que l'étape 4 produit.
 *
 * `race` est facultative : sans fiche de course, la ligne « Format et course » n'annonce que le
 * format, et la date est celle de fin de plan. On n'invente pas un nom de course absent.
 */
export function planSettingRows(plan: TrainingPlan, race?: Race): PlanSettingRow[] {
  const blocked = plan.constraints.blockedWeeks.map((week) => week.weekNumber)

  return [
    {
      key: 'race_format',
      label: 'Format et course',
      value: raceFormatLabel(plan.format, race?.name),
      impact: 'whole_plan',
      reopenable: false,
    },
    {
      key: 'date',
      label: 'Date',
      value: formatDayMonthLong(race?.date ?? plan.endDate),
      impact: 'whole_plan',
      reopenable: false,
    },
    {
      key: 'volume',
      label: 'Volume hebdo',
      value: formatDurationMin(plan.settings.weeklyVolumeTargetMin),
      impact: 'upcoming',
      reopenable: true,
    },
    {
      key: 'days',
      label: 'Jours disponibles',
      value: availableDaysLabel(plan.settings.availableDays),
      impact: 'upcoming',
      reopenable: true,
    },
    {
      key: 'gear',
      label: 'Matériel et lieux',
      value: gearLabel(plan),
      impact: 'sessions',
      reopenable: true,
    },
    {
      key: 'reduced_weeks',
      label: 'Semaines réduites',
      value: blockedWeeksLabel(blocked),
      impact: 'upcoming',
      reopenable: true,
    },
  ]
}

/**
 * Répartition par discipline sur tout le plan, pour la frise de 14 px du haut de 37.
 *
 * Elle vient de `PlanWeek.volumeByDiscipline`, que le moteur écrit lui-même : c'est le registre du
 * plan, pas une seconde somme sur les séances.
 */
export interface PlanShare {
  discipline: TrainingDiscipline
  minutes: number
  percent: number
}

export function planDisciplineShares(plan: TrainingPlan): PlanShare[] {
  const minutes = new Map<TrainingDiscipline, number>()
  for (const week of plan.weeks) {
    for (const discipline of TRAINING_DISCIPLINES) {
      const value = week.volumeByDiscipline[discipline] ?? 0
      if (value > 0) minutes.set(discipline, (minutes.get(discipline) ?? 0) + value)
    }
  }

  const total = [...minutes.values()].reduce((sum, value) => sum + value, 0)
  if (total === 0) return []

  return TRAINING_DISCIPLINES.filter((discipline) => minutes.has(discipline)).map((discipline) => {
    const value = minutes.get(discipline) ?? 0
    return { discipline, minutes: value, percent: Math.round((value / total) * 100) }
  })
}

// --- 37 · ce que le moteur a décidé seul ------------------------------------------------------

export interface EngineDecision {
  id: string
  title: string
  /** Le motif, en mono 9 px sous l'intitulé — jamais absent : une décision sans motif est opaque. */
  reason: string
  /**
   * Réglage qui produit cette décision, quand il en existe un. `undefined` = le moteur décide seul :
   * le bouton « Changer » reste rendu mais inerte, et dit pourquoi (méthode §4).
   */
  setting?: PlanSettingKey
  /** Pourquoi le bouton est inerte. Présent exactement quand `setting` est absent. */
  inertReason?: string
}

/**
 * Les quatre décisions de l'artboard 37, dérivées du plan enregistré.
 *
 * Écart assumé au canevas : celui-ci motive la sortie longue par « seul jour de plus de 3 h
 * déclaré » et la natation par « créneaux piscine lun. et mar. soir ». L'application ne collecte
 * ni durée disponible par jour ni horaires de piscine : ces deux motifs seraient inventés. Chaque
 * ligne porte donc le motif réel du moteur, qui existe et se vérifie.
 */
export function engineDecisions(plan: TrainingPlan): EngineDecision[] {
  const taper = plan.phases.find((phase) => phase.name === 'Taper')?.weeksCount ?? 0
  const swimPerWeek = plan.settings.maxSessionsPerDiscipline.N ?? 0
  const longDay = lastAvailableWeekendDay(plan.settings.availableDays)

  const decisions: EngineDecision[] = [
    {
      id: 'long-session-day',
      title: `Longues sorties le ${longDay}`,
      reason: 'règle du moteur : le dernier jour de week-end disponible porte la sortie longue',
      setting: 'days',
    },
    {
      id: 'intensity',
      title: `${plan.intensityDistribution.z1z2Percent} % du volume en Z1–Z2`,
      reason: 'distribution pyramidale · preuve solide',
      inertReason:
        'La distribution d’intensité est une règle du moteur, adossée à une preuve : aucun réglage ne l’expose.',
    },
  ]

  if (taper > 0) {
    decisions.push({
      id: 'taper',
      title: `Affûtage de ${taper} ${taper > 1 ? 'semaines' : 'semaine'}`,
      reason: 'volume −40 % puis −55 %, intensité maintenue',
      inertReason:
        'La durée de l’affûtage se déduit de celle du plan : elle n’a pas de réglage propre.',
    })
  }

  decisions.push({
    id: 'swim-per-week',
    title: `${DISCIPLINE_NAMES.N} ${swimPerWeek} fois par semaine`,
    reason: 'plafond par discipline déclaré à l’étape 3',
    setting: 'volume',
  })

  return decisions
}

/** Dimanche s'il est disponible, sinon samedi, sinon le dernier jour coché — règle du moteur. */
function lastAvailableWeekendDay(days: AvailableDays): string {
  if (days[6]) return DAY_SHORT[6]
  if (days[5]) return DAY_SHORT[5]
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index]) return DAY_SHORT[index]
  }
  return DAY_SHORT[5]
}

// --- 38 · relire un plan comme un formulaire ---------------------------------------------------

/**
 * Le plan enregistré, relu comme le formulaire des six étapes. C'est l'inverse exact de ce que
 * `generatePlan` a écrit : format, date, volume, jours, plafonds, contraintes et références y sont
 * tous conservés par `TrainingPlan`. Rien n'est reconstitué au jugé.
 *
 * `sustainableMaxMin` est la seule valeur que le plan ne porte pas — c'est une déclaration de
 * l'athlète, pas une sortie du moteur. On reprend le volume visé : le curseur n'annonce alors aucun
 * dépassement qu'on ne saurait justifier.
 */
export function formFromPlan(plan: TrainingPlan, race?: Race, profile?: AthleteProfile): GeneratorForm {
  const references = {
    cssPaceMinPer100m: plan.referencesSnapshot.cssPaceMinPer100m ?? profile?.css?.paceMinPer100m,
    ftpWatts: plan.referencesSnapshot.ftpWatts ?? profile?.ftp?.watts,
    runThresholdPaceMinPerKm:
      plan.referencesSnapshot.runThresholdPaceMinPerKm ?? profile?.runThreshold?.paceMinPerKm,
  }

  return {
    format: plan.format,
    raceName: race?.name ?? '',
    noRace: race === undefined,
    raceDate: race?.date ?? plan.endDate,
    weeklyVolumeTargetMin: plan.settings.weeklyVolumeTargetMin,
    sustainableMaxMin: plan.settings.weeklyVolumeTargetMin,
    availableDays: plan.settings.availableDays,
    maxSessionsPerDiscipline: {
      N: plan.settings.maxSessionsPerDiscipline.N ?? 0,
      V: plan.settings.maxSessionsPerDiscipline.V ?? 0,
      C: plan.settings.maxSessionsPerDiscipline.C ?? 0,
    },
    constraints: {
      pool: plan.constraints.pool === true,
      openWater: plan.constraints.openWater === true,
      homeTrainer: plan.constraints.homeTrainer === true,
      powerMeter: plan.constraints.powerMeter === true,
      timeTrialBike: plan.constraints.timeTrialBike === true,
      blockedWeeks: plan.constraints.blockedWeeks,
    },
    references,
    testSessions: {
      N: references.cssPaceMinPer100m === undefined,
      V: references.ftpWatts === undefined,
      C: references.runThresholdPaceMinPerKm === undefined,
    },
  }
}

/** Dernier segment du fil d'Ariane de l'écran 38 (canevas : « Plan / Réglages / Volume »). */
export const SETTING_TRAIL_LABEL: Record<PlanSettingKey, string> = {
  race_format: 'Format',
  date: 'Date',
  volume: 'Volume',
  days: 'Jours',
  gear: 'Matériel',
  reduced_weeks: 'Semaines',
}

/** Intitulé mono au-dessus de la valeur d'avant / après (canevas : « Volume hebdo »). */
export const SETTING_SECTION_LABEL: Record<PlanSettingKey, string> = {
  race_format: 'Format et course',
  date: 'Date de course',
  volume: 'Volume hebdo',
  days: 'Jours d’entraînement',
  gear: 'Matériel et lieux',
  reduced_weeks: 'Semaines réduites',
}

/** Nombre d'accès / matériels cochés dans un formulaire, sur cinq. */
export function gearCountLabel(constraints: GeneratorForm['constraints']): string {
  const owned = GEAR_KEYS.filter((key) => constraints[key]).length
  return `${owned} sur ${GEAR_KEYS.length}`
}

/**
 * La valeur d'un réglage telle que l'écran 38 l'écrit, lue dans un formulaire — c'est la MÊME
 * fonction pour l'avant et pour l'après, sinon les deux colonnes ne se compareraient pas.
 */
export function settingValueOfForm(key: PlanSettingKey, form: GeneratorForm): string {
  switch (key) {
    case 'volume':
      return formatDurationMin(form.weeklyVolumeTargetMin)
    case 'days':
      return availableDaysLabel(form.availableDays)
    case 'gear':
      return gearCountLabel(form.constraints)
    case 'reduced_weeks':
      return blockedWeeksLabel(form.constraints.blockedWeeks.map((week) => week.weekNumber))
    case 'race_format':
      return raceFormatLabel(form.format, form.noRace ? undefined : form.raceName)
    case 'date':
      return formatDayMonthLong(form.raceDate)
  }
}

// --- 38 · portée du changement ------------------------------------------------------------------

export interface PlanScopeOption {
  scope: PlanSettingScope
  label: string
  /** « 11 sem. » — le décompte réel, jamais un ordre de grandeur. */
  weeksLabel: string
  weeks: number
  /** Portée que l'écriture ne sait pas encore tenir : rendue, inerte, et elle dit pourquoi. */
  inertReason?: string
}

/**
 * Les trois portées de l'artboard 38, avec leur décompte réel.
 *
 * « Refaire tout le plan » n'est PAS un troisième calibre du même geste : c'est repartir de
 * l'étape 1, ce que le pied de l'artboard 37 propose déjà (« Refaire le plan »). La portée reste
 * dessinée — le canevas la dessine — mais elle est inerte et renvoie explicitement là-bas, plutôt
 * que d'écrire par-dessus des semaines déjà vécues.
 */
export function settingScopes(plan: TrainingPlan, currentWeekNumber: number): PlanScopeOption[] {
  const upcoming = Math.max(0, plan.weeksCount - currentWeekNumber + 1)

  return [
    { scope: 'this_week', label: 'Cette semaine seulement', weeksLabel: '1 sem.', weeks: 1 },
    {
      scope: 'upcoming_weeks',
      label: 'Les semaines à venir',
      weeksLabel: `${upcoming} sem.`,
      weeks: upcoming,
    },
    {
      scope: 'whole_plan',
      label: 'Refaire tout le plan',
      weeksLabel: `${plan.weeksCount} sem.`,
      weeks: plan.weeksCount,
      inertReason:
        'Refaire tout le plan repart de l’étape 1 du générateur : le bouton « Refaire le plan » des réglages y mène. Rien ne réécrit une semaine déjà vécue.',
    },
  ]
}

// --- 38 · le tableau avant / après ---------------------------------------------------------------

export interface WeekComparisonRow {
  label: string
  before: string
  after: string
  /** Le canevas met la valeur d'après en gras quand elle change, en gris quand elle ne change pas. */
  changed: boolean
}

function sessionCount(week: PlanWeek): number {
  return week.days.reduce((sum, day) => sum + day.workoutIds.length, 0)
}

function doubledDayCount(week: PlanWeek): number {
  return week.days.filter((day) => day.workoutIds.length > 1).length
}

function freeDaysLabel(week: PlanWeek): string {
  const free = week.days.filter((day) => day.workoutIds.length === 0)
  if (free.length === 0) return 'aucun'
  return free
    .map((day) => DAY_SHORT[(new Date(`${day.date}T12:00:00Z`).getUTCDay() + 6) % 7])
    .join(', ')
}

/** Les quatre lignes de l'artboard 38, dans son ordre. */
export function compareWeeks(before: PlanWeek, after: PlanWeek): WeekComparisonRow[] {
  const rows: [string, string, string][] = [
    ['Séances', String(sessionCount(before)), String(sessionCount(after))],
    ['Jours doublés', String(doubledDayCount(before)), String(doubledDayCount(after))],
    ['Facile / dur', `${before.easyPercent}/${before.hardPercent}`, `${after.easyPercent}/${after.hardPercent}`],
    ['Jours libres', freeDaysLabel(before), freeDaysLabel(after)],
  ]

  return rows.map(([label, beforeValue, afterValue]) => ({
    label,
    before: beforeValue,
    after: afterValue,
    changed: beforeValue !== afterValue,
  }))
}

/** Ce que le changement demande de plus (ou de moins) par semaine, en minutes. */
export function weeklyVolumeDelta(before: PlanWeek, after: PlanWeek): number {
  return after.totalVolumeMin - before.totalVolumeMin
}

// --- 38 · écrire, une fois seulement -------------------------------------------------------------

/**
 * Vrai dès qu'un jour de la semaine porte une séance déjà faite. Une telle semaine n'est jamais
 * réécrite : « les séances déjà faites ne sont jamais réécrites » (pied de l'artboard 37).
 */
export function weekHasCompletedWork(week: PlanWeek, completedIds: ReadonlySet<string>): boolean {
  return week.days.some((day) => day.workoutIds.some((id) => completedIds.has(id)))
}

export interface AppliedPlan {
  plan: TrainingPlan
  /** Séances à enregistrer en même temps que le plan — celles des semaines réellement remplacées. */
  workouts: Workout[]
  /** Numéros des semaines réécrites, dans l'ordre. Vide = rien n'a changé. */
  rewrittenWeeks: number[]
  /** Semaines épargnées parce qu'elles portent une séance faite. */
  keptWeeks: number[]
}

/**
 * Applique le plan candidat au plan enregistré, sur la portée choisie.
 *
 * La semaine `n` du candidat correspond à la semaine `currentWeekNumber + n - 1` du plan
 * enregistré : le moteur repart toujours du lundi de la semaine en cours. Les semaines antérieures
 * ne sont jamais touchées, et celles qui portent une séance faite non plus.
 */
export function applySettingToPlan(
  stored: TrainingPlan,
  candidate: GeneratedPlan,
  scope: PlanSettingScope,
  currentWeekNumber: number,
  completedWorkoutIds: ReadonlySet<string>,
): AppliedPlan {
  const lastWeek = scope === 'this_week' ? currentWeekNumber : stored.weeksCount
  const rewrittenWeeks: number[] = []
  const keptWeeks: number[] = []
  const workouts: Workout[] = []
  const candidateById = new Map(candidate.workouts.map((workout) => [workout.id, workout]))

  const weeks = stored.weeks.map((week) => {
    if (week.weekNumber < currentWeekNumber || week.weekNumber > lastWeek) return week
    if (weekHasCompletedWork(week, completedWorkoutIds)) {
      keptWeeks.push(week.weekNumber)
      return week
    }

    const replacement = candidate.plan.weeks[week.weekNumber - currentWeekNumber]
    if (!replacement) return week

    rewrittenWeeks.push(week.weekNumber)
    for (const day of replacement.days) {
      for (const id of day.workoutIds) {
        const workout = candidateById.get(id)
        if (workout) workouts.push(workout)
      }
    }
    // Le candidat garde ses propres dates (il repart du lundi courant) ; on ne conserve du plan
    // enregistré que son numéro et sa phase, qui ordonnent la progression déjà entamée.
    return { ...replacement, weekNumber: week.weekNumber, phase: week.phase }
  })

  return {
    plan: {
      ...stored,
      settings: candidate.plan.settings,
      constraints: candidate.plan.constraints,
      weeks,
    },
    workouts,
    rewrittenWeeks,
    keptWeeks,
  }
}

// --- 39 · le journal -------------------------------------------------------------------------------

const SETTING_JOURNAL_LABEL: Record<PlanSettingKey, string> = {
  race_format: 'Format et course',
  date: 'Date de course',
  volume: 'Volume hebdo',
  days: 'Jours disponibles',
  gear: 'Matériel et lieux',
  reduced_weeks: 'Semaines réduites',
}

const SCOPE_JOURNAL_LABEL: Record<PlanSettingScope, string> = {
  this_week: 'cette semaine',
  upcoming_weeks: 'les semaines à venir',
  whole_plan: 'tout le plan',
}

/**
 * L'entrée que 38 dépose au journal au moment d'écrire. Elle porte l'auteur (« toi » : c'est un
 * geste de l'utilisateur), la valeur d'avant et d'après, et la portée réellement appliquée — le
 * journal doit permettre de refaire le chemin en sens inverse.
 */
export function settingJournalEntry(params: {
  id: string
  planId: string
  at: string
  key: PlanSettingKey
  before: string
  after: string
  scope: PlanSettingScope
  rewrittenWeeks: number[]
}): PlanJournalEntry {
  const { rewrittenWeeks } = params
  const weeksPart =
    rewrittenWeeks.length === 0
      ? 'aucune semaine réécrite'
      : `${rewrittenWeeks.length} ${rewrittenWeeks.length > 1 ? 'semaines réécrites' : 'semaine réécrite'}`

  return {
    id: params.id,
    planId: params.planId,
    at: params.at,
    author: 'user',
    description: `${SETTING_JOURNAL_LABEL[params.key]} : ${params.before} → ${params.after}`,
    reason: `${SCOPE_JOURNAL_LABEL[params.scope]} · ${weeksPart}`,
    undone: false,
  }
}
