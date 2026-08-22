// Moteur de génération de plan (parcours G1→G6).
//
// --- Deux modèles volontairement absents ----------------------------------------------------
// Ce moteur n'applique NI la « règle des 10 % » de progression hebdomadaire, NI aucun calcul de
// charge type ACWR (ratio charge aiguë / charge chronique). C'est une décision produit écrite noir
// sur blanc dans le canevas G6 (« Aucun calcul de charge type ACWR : écarté faute de preuve »,
// affiché avec une icône hachurée à côté des règles réellement appliquées) : ces deux modèles sont
// populaires mais leur validité prédictive n'est pas établie, et l'app ne s'autorise que ce
// qu'elle peut justifier — « une preuve annoncée à chaque affirmation ». La progression de charge
// vient donc uniquement d'un cycle 3:1 assumé comme une règle métier, pas d'un ratio calculé.
//
// Les seuls chiffres sourcés sont ceux affichés par le canevas : affûtage de 2 semaines (note 2,
// Bosquet et al. 2007, cf. `phases.ts`) et distribution pyramidale ~78 % Z1-Z2 (note 3). Tout le
// reste — répartition 40/40/20, cycle 3:1, sortie longue le samedi — est une règle métier, et le
// plan ne prétend jamais le contraire.
//
// La fonction est pure et déterministe : aucun `Date.now()`, aucun `Math.random()`. Deux appels
// avec les mêmes entrées rendent exactement le même plan, ce qui rend l'écran 06 · Simulation
// honnête (ce qu'on prévisualise est ce qu'on enregistrera).

import type {
  Discipline,
  PlanConstraints,
  PlanDay,
  PlanPhaseName,
  PlanReferencesSnapshot,
  PlanSettings,
  PlanWeek,
  TrainingPlan,
  Workout,
  WorkoutBlock,
  WorkoutSegment,
  Zone,
} from '../types'
import { addDays, mondayOf, weeksUntilRace } from './dates'
import { TRAINING_DISCIPLINES, type AvailableDays, type GeneratorForm, type TrainingDiscipline } from './form'
import { raceFormat } from './formats'
import { buildPhases, phaseNameByWeek } from './phases'
import { summarizePlan, type GeneratedPlan } from './summary'

export interface GeneratePlanOptions {
  /** Préfixe des identifiants générés — injecté par les tests pour un résultat déterministe. */
  idPrefix?: string
}

// --- Réglages du moteur ---------------------------------------------------------------------

const DAYS_PER_WEEK = 7
const SATURDAY = 5
const SUNDAY = 6

/** Modulation du volume hebdomadaire par phase (règle métier, pas une source). */
const PHASE_VOLUME_FACTOR: Record<PlanPhaseName, number> = {
  Base: 0.85,
  Build: 1,
  Specific: 1.05,
  Taper: 1,
}

/**
 * Affûtage : −40 % puis −55 % de volume. Les deux valeurs tiennent dans la fourchette de
 * réduction retenue par la méta-analyse citée en note 2 du canevas (Bosquet et al. 2007).
 */
const TAPER_WEEK_FACTORS = [0.6, 0.45]

/** Cycle de charge 3:1 — trois semaines de charge, une allégée. Règle métier. */
const LOAD_CYCLE_WEEKS = 4
const RECOVERY_WEEK_FACTOR = 0.7

/** Une semaine bloquée garde une trame d'entraînement, à volume réduit et sans sortie longue. */
const BLOCKED_WEEK_FACTOR = 0.5

/** Part maximale du volume hebdomadaire qu'une sortie longue peut prendre. */
const LONG_SESSION_MAX_SHARE = 0.4

/** Au-delà, on retire des séances d'endurance : le catalogue est discret, le volume ne l'est pas. */
const MAX_OVERSHOOT = 1.15

/** Discipline qui porte la séance dure de la semaine, en rotation (une seule par semaine). */
const QUALITY_ROTATION: readonly TrainingDiscipline[] = ['V', 'C', 'N'] as const

/** Gabarits de test de référence, un par discipline (canevas G5). */
const TEST_TEMPLATE_IDS: Record<TrainingDiscipline, string> = {
  N: 'swim-test-css-400-200',
  V: 'bike-test-ftp-20min',
  C: 'run-test-seuil-30min',
}

const EASY_ZONES: readonly Zone[] = ['Z1', 'Z2']
const HARD_ZONES: readonly Zone[] = ['Z4', 'Z5', 'Z6']

type SlotRole = 'test' | 'long' | 'quality' | 'moderate' | 'brickBike' | 'brickRun' | 'endurance'

/** Poids de répartition du volume hebdomadaire entre les créneaux d'une semaine. */
const SLOT_WEIGHTS: Record<SlotRole, number> = {
  test: 1.4,
  long: 2.6,
  quality: 1.4,
  moderate: 1.4,
  brickBike: 1.8,
  brickRun: 0.7,
  endurance: 1,
}

// --- Catalogue filtré -----------------------------------------------------------------------

/**
 * Écarte les gabarits qui demandent un accès dont l'utilisateur ne dispose pas. Rien n'est
 * substitué en silence : si plus aucune séance de natation n'est possible, le plan n'en contient
 * simplement pas.
 */
function allowedByConstraints(workout: Workout, constraints: GeneratorForm['constraints']): boolean {
  const location = workout.location
  if (!location) return true
  if (!constraints.pool && (location === 'pool_25m' || location === 'pool_50m')) return false
  if (!constraints.openWater && location === 'open_water') return false
  if (!constraints.homeTrainer && location === 'home_trainer') return false
  return true
}

function isEasy(workout: Workout): boolean {
  return workout.zone !== null && EASY_ZONES.includes(workout.zone)
}

function isHard(workout: Workout): boolean {
  return workout.zone !== null && HARD_ZONES.includes(workout.zone)
}

function isModerate(workout: Workout): boolean {
  return workout.zone === 'Z3'
}

interface TemplatePools {
  /** Clé `discipline:role`, triée par durée croissante puis identifiant. */
  byRole: Map<string, Workout[]>
  tests: Map<TrainingDiscipline, Workout>
}

function poolKey(discipline: TrainingDiscipline, role: SlotRole): string {
  return `${discipline}:${role}`
}

function sortTemplates(templates: Workout[]): Workout[] {
  return [...templates].sort((a, b) => a.durationMin - b.durationMin || a.id.localeCompare(b.id))
}

function buildPools(catalogue: Workout[], form: GeneratorForm): TemplatePools {
  const testIds = new Set(Object.values(TEST_TEMPLATE_IDS))
  const usable = catalogue.filter((workout) => allowedByConstraints(workout, form.constraints))

  const tests = new Map<TrainingDiscipline, Workout>()
  for (const discipline of TRAINING_DISCIPLINES) {
    const template = usable.find((workout) => workout.id === TEST_TEMPLATE_IDS[discipline])
    if (template) tests.set(discipline, template)
  }

  const byRole = new Map<string, Workout[]>()
  for (const discipline of TRAINING_DISCIPLINES) {
    const ofDiscipline = usable.filter(
      (workout) => workout.discipline === discipline && !testIds.has(workout.id),
    )
    const regular = ofDiscipline.filter((workout) => workout.isBrick !== true)
    const bricks = ofDiscipline.filter((workout) => workout.isBrick === true)

    byRole.set(poolKey(discipline, 'long'), sortTemplates(regular.filter(isEasy)))
    byRole.set(poolKey(discipline, 'endurance'), sortTemplates(regular.filter(isEasy)))
    byRole.set(poolKey(discipline, 'quality'), sortTemplates(regular.filter(isHard)))
    byRole.set(poolKey(discipline, 'moderate'), sortTemplates(regular.filter(isModerate)))
    if (discipline === 'V') byRole.set(poolKey(discipline, 'brickBike'), sortTemplates(bricks))
    if (discipline === 'C') byRole.set(poolKey(discipline, 'brickRun'), sortTemplates(bricks))
  }

  return { byRole, tests }
}

// --- Choix des gabarits ---------------------------------------------------------------------

function closestTo(templates: Workout[], targetMin: number): Workout {
  return templates.reduce((best, candidate) =>
    Math.abs(candidate.durationMin - targetMin) < Math.abs(best.durationMin - targetMin) ? candidate : best,
  )
}

function longest(templates: Workout[]): Workout {
  return templates.reduce((best, candidate) => (candidate.durationMin > best.durationMin ? candidate : best))
}

/**
 * Gabarit d'un créneau. Les listes sont triées, les départages se font sur la durée puis sur
 * l'identifiant : deux générations identiques choisissent les mêmes séances.
 *
 * `maxDurationMin` fait tenir toute séance d'une discipline sous sa sortie longue de la semaine —
 * c'est ce qui fait d'elle la sortie longue. Quand plus rien ne tient sous ce plafond, on prend la
 * plus courte du lot plutôt que de laisser le créneau vide.
 */
function pickTemplate(
  pool: Workout[],
  role: SlotRole,
  slotTargetMin: number,
  maxDurationMin: number,
  used: Set<string>,
): Workout | undefined {
  if (pool.length === 0) return undefined

  // Le plafond de durée passe avant tout : mieux vaut répéter un gabarit que faire dépasser une
  // séance d'endurance au-dessus de la sortie longue de la semaine. `pool` est trié par durée
  // croissante, donc `pool[0]` est le repli le plus court.
  const fitting = pool.filter((workout) => workout.durationMin <= maxDurationMin)
  const eligible = fitting.length > 0 ? fitting : [pool[0]]

  const fresh = eligible.filter((workout) => !used.has(workout.id))
  const source = fresh.length > 0 ? fresh : eligible

  return role === 'long' ? longest(source) : closestTo(source, slotTargetMin)
}

// --- Trame d'une semaine --------------------------------------------------------------------

interface WeekShape {
  weekNumber: number
  phase: PlanPhaseName
  targetMin: number
  blockedReason?: string
  isFirstWeek: boolean
}

function weekVolumeTarget(form: GeneratorForm, shape: Omit<WeekShape, 'targetMin'>, taperIndex: number): number {
  let factor = PHASE_VOLUME_FACTOR[shape.phase]

  if (shape.phase === 'Taper') {
    factor = TAPER_WEEK_FACTORS[Math.min(taperIndex, TAPER_WEEK_FACTORS.length - 1)]
  } else if (shape.weekNumber % LOAD_CYCLE_WEEKS === 0) {
    factor *= RECOVERY_WEEK_FACTOR
  }

  if (shape.blockedReason !== undefined) factor *= BLOCKED_WEEK_FACTOR

  return Math.round(form.weeklyVolumeTargetMin * factor)
}

/**
 * Facteur de la semaine la plus chargée du plan — la phase spécifique, hors semaine de récupération
 * et hors affûtage. C'est la seule conséquence du curseur de volume que l'athlète puisse vérifier
 * après coup, et donc la seule qu'on ait le droit de lui annoncer pendant qu'il le déplace.
 */
export const PEAK_WEEK_FACTOR = PHASE_VOLUME_FACTOR.Specific

export function peakWeekMin(weeklyVolumeTargetMin: number): number {
  return Math.round(weeklyVolumeTargetMin * PEAK_WEEK_FACTOR)
}

interface Slot {
  discipline: TrainingDiscipline
  role: SlotRole
}

/**
 * Créneaux d'une semaine, par ordre de priorité décroissante : test de référence, sortie longue,
 * séance dure de la semaine, enchaînement, puis endurance jusqu'au plafond de la discipline.
 * Le plafond `maxSessionsPerDiscipline` tronque cette liste — il n'est jamais dépassé.
 */
function buildSlots(form: GeneratorForm, shape: WeekShape, pools: TemplatePools): Slot[] {
  const roles: Record<TrainingDiscipline, SlotRole[]> = { N: [], V: [], C: [] }
  const blocked = shape.blockedReason !== undefined

  const testDisciplines = new Set(
    TRAINING_DISCIPLINES.filter(
      (discipline) => shape.isFirstWeek && form.testSessions[discipline] && pools.tests.has(discipline),
    ),
  )
  for (const discipline of testDisciplines) roles[discipline].push('test')

  // La sortie longue disparaît d'une semaine bloquée (« volume réduit, pas de longue sortie »).
  if (!blocked) {
    roles.V.push('long')
    roles.C.push('long')
  }

  // Une seule séance dure par semaine, en rotation : c'est ce qui garde la répartition pyramidale
  // (~14 % de Z4+) à l'échelle du plan. Une séance modérée (Z3) s'y ajoute hors phase de Base.
  const qualityDiscipline = QUALITY_ROTATION[(shape.weekNumber - 1) % QUALITY_ROTATION.length]
  const moderateDiscipline = QUALITY_ROTATION[shape.weekNumber % QUALITY_ROTATION.length]
  const wantsModerate = shape.phase !== 'Base' || shape.weekNumber % 2 === 1

  for (const discipline of TRAINING_DISCIPLINES) {
    if (testDisciplines.has(discipline)) continue
    if (discipline === qualityDiscipline) roles[discipline].push('quality')
    else if (wantsModerate && discipline === moderateDiscipline) roles[discipline].push('moderate')
  }

  const hasBrickTemplates =
    (pools.byRole.get(poolKey('V', 'brickBike'))?.length ?? 0) > 0 &&
    (pools.byRole.get(poolKey('C', 'brickRun'))?.length ?? 0) > 0
  const wantsBrick = !blocked && (shape.phase === 'Build' || shape.phase === 'Specific') && hasBrickTemplates
  if (wantsBrick) {
    roles.V.push('brickBike')
    roles.C.push('brickRun')
  }

  const slots: Slot[] = []
  for (const discipline of ['V', 'C', 'N'] as const) {
    const cap = Math.max(0, form.maxSessionsPerDiscipline[discipline] ?? 0)
    const list = [...roles[discipline]]
    while (list.length < cap) list.push('endurance')
    for (const role of list.slice(0, cap)) slots.push({ discipline, role })
  }

  // Un enchaînement n'a de sens qu'entier : si un plafond a coupé une des deux jambes, on retire
  // l'autre plutôt que de laisser une séance « brick » orpheline.
  const hasBikeLeg = slots.some((slot) => slot.role === 'brickBike')
  const hasRunLeg = slots.some((slot) => slot.role === 'brickRun')
  if (hasBikeLeg !== hasRunLeg) {
    return slots.filter((slot) => slot.role !== 'brickBike' && slot.role !== 'brickRun')
  }

  return slots
}

interface SelectedSlot extends Slot {
  template: Workout
}

function selectTemplates(slots: Slot[], shape: WeekShape, pools: TemplatePools): SelectedSlot[] {
  const totalWeight = slots.reduce((sum, slot) => sum + SLOT_WEIGHTS[slot.role], 0)
  if (totalWeight === 0) return []

  const used = new Set<string>()
  const longDuration = new Map<TrainingDiscipline, number>()
  const selected: SelectedSlot[] = []

  for (const slot of slots) {
    const slotTargetMin = (shape.targetMin * SLOT_WEIGHTS[slot.role]) / totalWeight
    const maxDurationMin =
      slot.role === 'long'
        ? shape.targetMin * LONG_SESSION_MAX_SHARE
        : slot.role === 'brickBike' || slot.role === 'brickRun'
          ? Number.POSITIVE_INFINITY
          : (longDuration.get(slot.discipline) ?? Number.POSITIVE_INFINITY)

    const pool =
      slot.role === 'test'
        ? [pools.tests.get(slot.discipline)].filter((template): template is Workout => template !== undefined)
        : (pools.byRole.get(poolKey(slot.discipline, slot.role)) ?? [])

    const template = pickTemplate(pool, slot.role, slotTargetMin, maxDurationMin, used)
    if (!template) continue

    used.add(template.id)
    if (slot.role === 'long') longDuration.set(slot.discipline, template.durationMin)
    selected.push({ ...slot, template })
  }

  return trimToVolume(selected, shape.targetMin)
}

/**
 * Le catalogue ne propose que des durées discrètes : la somme des créneaux dépasse parfois
 * franchement le volume visé. On retire alors des séances d'endurance — jamais la sortie longue,
 * la séance dure, le test ni l'enchaînement — en prenant celle de la discipline qui pèse le plus
 * lourd cette semaine. Rogner toujours la même discipline (la dernière de la liste) finirait par
 * la faire disparaître du plan.
 */
function trimToVolume(selected: SelectedSlot[], targetMin: number): SelectedSlot[] {
  const kept = [...selected]
  let total = kept.reduce((sum, slot) => sum + slot.template.durationMin, 0)

  while (total > targetMin * MAX_OVERSHOOT) {
    const minutes = new Map<TrainingDiscipline, number>()
    for (const slot of kept) {
      minutes.set(slot.discipline, (minutes.get(slot.discipline) ?? 0) + slot.template.durationMin)
    }

    let victim = -1
    for (let index = 0; index < kept.length; index += 1) {
      if (kept[index].role !== 'endurance') continue
      if (victim < 0 || (minutes.get(kept[index].discipline) ?? 0) >= (minutes.get(kept[victim].discipline) ?? 0)) {
        victim = index
      }
    }
    if (victim < 0) break

    total -= kept[victim].template.durationMin
    kept.splice(victim, 1)
  }

  return kept
}

// --- Placement dans la semaine ---------------------------------------------------------------

/**
 * Jour de chaque créneau (index 0 = lundi). La sortie longue vélo va au samedi — règle métier
 * annoncée telle quelle par le canevas G6 (« Caler les longues sorties sur le samedi ») — et la
 * sortie longue course au dimanche. Les deux jambes d'un enchaînement partagent le même jour.
 * Le reste se répartit sur le jour disponible le moins chargé, à égalité le plus tôt dans la
 * semaine, pour ne pas empiler les séances en fin de semaine.
 */
function assignDays(selected: SelectedSlot[], available: number[]): number[] {
  const dayOf = selected.map(() => -1)
  if (available.length === 0) return dayOf

  const load = new Map<number, number>(available.map((day) => [day, 0]))
  const loadOf = (day: number): number => load.get(day) ?? 0

  const take = (index: number, day: number): void => {
    dayOf[index] = day
    load.set(day, loadOf(day) + 1)
  }

  const leastLoaded = (excluded: number[]): number => {
    const pool = available.filter((day) => !excluded.includes(day))
    const source = pool.length > 0 ? pool : available
    return source.reduce((best, day) => (loadOf(day) < loadOf(best) ? day : best))
  }

  const latest = (excluded: number[]): number => {
    const pool = available.filter((day) => !excluded.includes(day))
    const source = pool.length > 0 ? pool : available
    return source[source.length - 1]
  }

  const longBikeIndex = selected.findIndex((slot) => slot.role === 'long' && slot.discipline === 'V')
  const longRunIndex = selected.findIndex((slot) => slot.role === 'long' && slot.discipline === 'C')

  let bikeDay = -1
  if (longBikeIndex >= 0) {
    bikeDay = available.includes(SATURDAY) ? SATURDAY : latest([])
    take(longBikeIndex, bikeDay)
  }
  if (longRunIndex >= 0) {
    const excluded = bikeDay >= 0 ? [bikeDay] : []
    const runDay =
      available.includes(SUNDAY) && SUNDAY !== bikeDay ? SUNDAY : latest(excluded)
    take(longRunIndex, runDay)
  }

  const brickIndexes = selected
    .map((slot, index) => ({ slot, index }))
    .filter((entry) => entry.slot.role === 'brickBike' || entry.slot.role === 'brickRun')
  if (brickIndexes.length > 0) {
    const brickDay = leastLoaded(dayOf.filter((day) => day >= 0))
    for (const entry of brickIndexes) take(entry.index, brickDay)
  }

  // Les tests de référence passent avant le reste et sur des jours distincts : deux mesures
  // maximales le même jour se fausseraient l'une l'autre.
  const testDays: number[] = []
  for (let index = 0; index < selected.length; index += 1) {
    if (selected[index].role !== 'test') continue
    const day = leastLoaded(testDays)
    testDays.push(day)
    take(index, day)
  }

  for (let index = 0; index < selected.length; index += 1) {
    if (dayOf[index] < 0) take(index, leastLoaded([]))
  }

  return dayOf
}

// --- Instanciation --------------------------------------------------------------------------

function cloneSegment(segment: WorkoutSegment): WorkoutSegment {
  const copy: WorkoutSegment = { ...segment }
  if (segment.target) copy.target = { ...segment.target }
  return copy
}

function cloneBlocks(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map((block) =>
    block.kind === 'repeat' ? { ...block, steps: block.steps.map(cloneSegment) } : cloneSegment(block),
  )
}

/**
 * Copie du gabarit avec un identifiant propre au plan. Sans cette copie, marquer « fait » une
 * séance de la semaine 3 marquerait toutes ses répétitions du plan : les créneaux partageraient
 * le même objet de la bibliothèque.
 */
function instantiate(template: Workout, id: string): Workout {
  const workout: Workout = { ...template, id, blocks: cloneBlocks(template.blocks), status: 'planned' }
  delete workout.completedAt
  if (template.why) workout.why = { ...template.why }
  return workout
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

// --- Assemblage -----------------------------------------------------------------------------

function roundPercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function buildWeek(
  shape: WeekShape,
  weekStart: string,
  planId: string,
  availableDays: AvailableDays,
  selected: SelectedSlot[],
  /** Jour de course : ce jour-là et les suivants ne portent aucune séance d'entraînement. */
  raceDate: string | undefined,
): { week: PlanWeek; workouts: Workout[] } {
  const available: number[] = []
  for (let index = 0; index < DAYS_PER_WEEK; index += 1) {
    if (!availableDays[index]) continue
    if (raceDate !== undefined && addDays(weekStart, index) >= raceDate) continue
    available.push(index)
  }

  const dayOf = assignDays(selected, available)
  const workouts: Workout[] = []
  const days: PlanDay[] = []

  for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
    const date = addDays(weekStart, dayIndex)
    const workoutIds: string[] = []

    for (let slotIndex = 0; slotIndex < selected.length; slotIndex += 1) {
      if (dayOf[slotIndex] !== dayIndex) continue
      const id = `${planId}-w${pad2(shape.weekNumber)}-d${dayIndex}-${workoutIds.length}`
      workoutIds.push(id)
      workouts.push(instantiate(selected[slotIndex].template, id))
    }

    const day: PlanDay = { date, workoutIds }
    if (!availableDays[dayIndex]) day.unavailable = true
    days.push(day)
  }

  const volumeByDiscipline: Partial<Record<Discipline, number>> = {}
  const minutesByDiscipline = new Map<Discipline, number>()
  for (const workout of workouts) {
    minutesByDiscipline.set(
      workout.discipline,
      (minutesByDiscipline.get(workout.discipline) ?? 0) + workout.durationMin,
    )
  }
  let totalVolumeMin = 0
  for (const [discipline, minutes] of minutesByDiscipline) {
    const rounded = Math.round(minutes)
    volumeByDiscipline[discipline] = rounded
    totalVolumeMin += rounded
  }

  const zoned = workouts.filter((workout) => workout.zone !== null)
  const zonedMinutes = zoned.reduce((sum, workout) => sum + workout.durationMin, 0)
  const easyMinutes = zoned.filter(isEasy).reduce((sum, workout) => sum + workout.durationMin, 0)
  const hardMinutes = zoned.filter(isHard).reduce((sum, workout) => sum + workout.durationMin, 0)

  const week: PlanWeek = {
    weekNumber: shape.weekNumber,
    phase: shape.phase,
    totalVolumeMin,
    volumeByDiscipline,
    days,
    easyPercent: roundPercent(easyMinutes, zonedMinutes),
    hardPercent: roundPercent(hardMinutes, zonedMinutes),
  }
  if (shape.blockedReason !== undefined) week.blockedReason = shape.blockedReason

  return { week, workouts }
}

function defaultPlanId(form: GeneratorForm, today: string, startDate: string): string {
  const anchor = form.noRace ? startDate : form.raceDate || today
  return `plan-${form.format.toLowerCase()}-${anchor}`
}

/**
 * Plan complet et séances instanciées, à partir du formulaire des 6 étapes.
 *
 * `startDate` est le lundi de la semaine calendaire de `today` : la semaine 1 contient toujours le
 * jour courant, sans quoi l'écran « Aujourd'hui » n'aurait rien à afficher juste après la
 * génération.
 */
export function generatePlan(
  form: GeneratorForm,
  today: string,
  catalogue: Workout[],
  options?: GeneratePlanOptions,
): GeneratedPlan {
  const startDate = mondayOf(today)
  const weeksCount = form.noRace
    ? raceFormat(form.format).minWeeks
    : Math.max(0, weeksUntilRace(today, form.raceDate))
  const endDate = form.noRace || !form.raceDate ? addDays(startDate, weeksCount * DAYS_PER_WEEK - 1) : form.raceDate

  const planId = options?.idPrefix ?? defaultPlanId(form, today, startDate)
  const pools = buildPools(catalogue, form)
  const phaseNames = phaseNameByWeek(weeksCount)
  const blockedReasons = new Map(
    form.constraints.blockedWeeks.map((blocked) => [blocked.weekNumber, blocked.reason]),
  )

  const weeks: PlanWeek[] = []
  const workouts: Workout[] = []
  let taperIndex = 0

  for (let weekNumber = 1; weekNumber <= weeksCount; weekNumber += 1) {
    const phase = phaseNames[weekNumber - 1]
    const base = {
      weekNumber,
      phase,
      blockedReason: blockedReasons.get(weekNumber),
      isFirstWeek: weekNumber === 1,
    }
    const shape: WeekShape = { ...base, targetMin: weekVolumeTarget(form, base, taperIndex) }
    if (phase === 'Taper') taperIndex += 1

    const selected = selectTemplates(buildSlots(form, shape, pools), shape, pools)
    const built = buildWeek(
      shape,
      addDays(startDate, (weekNumber - 1) * DAYS_PER_WEEK),
      planId,
      form.availableDays,
      selected,
      form.noRace || !form.raceDate ? undefined : form.raceDate,
    )
    weeks.push(built.week)
    workouts.push(...built.workouts)
  }

  const settings: PlanSettings = {
    weeklyVolumeTargetMin: form.weeklyVolumeTargetMin,
    availableDays: [...form.availableDays],
    maxSessionsPerDiscipline: { ...form.maxSessionsPerDiscipline },
  }
  const constraints: PlanConstraints = {
    pool: form.constraints.pool,
    openWater: form.constraints.openWater,
    homeTrainer: form.constraints.homeTrainer,
    powerMeter: form.constraints.powerMeter,
    timeTrialBike: form.constraints.timeTrialBike,
    blockedWeeks: form.constraints.blockedWeeks.map((blocked) => ({ ...blocked })),
  }
  const referencesSnapshot: PlanReferencesSnapshot = { ...form.references }

  const plan: TrainingPlan = {
    id: planId,
    format: form.format,
    startDate,
    endDate,
    weeksCount,
    status: 'active',
    settings,
    constraints,
    referencesSnapshot,
    phases: buildPhases(weeksCount, weeksCount > 0 ? 1 : 0),
    // Remplacée juste après par la répartition réellement obtenue : le plan annonce ce qu'il
    // contient, pas la cible visée (~78 / 8 / 14).
    intensityDistribution: { z1z2Percent: 0, z3Percent: 0, z4PlusPercent: 0 },
    weeks,
  }
  plan.intensityDistribution = summarizePlan({ plan, workouts }).intensity

  return { plan, workouts }
}
