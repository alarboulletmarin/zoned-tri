// Modele de donnees du domaine (cf. thoughts/shared/research/2026-08-21-design-spec.md, section 3)
// Toutes les dates sont stockees en ISO 8601 (string), jamais en objet Date.

export type Discipline = 'N' | 'V' | 'C' | 'R'

export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6'

// Niveau de preuve scientifique — exactement 3 valeurs, jamais une 4e (principe "une preuve
// par affirmation"). Type unique partage par le domaine, l'UI (ProofBadge/EvidenceNote) et les
// calculateurs (CalculatorProofLevel) : le domaine ne doit rien importer de l'UI, donc ce type
// vit ici et l'UI/les calculateurs l'importent depuis le domaine, jamais l'inverse.
export type ProofLevel = 'solid' | 'moderate' | 'weak'

export type WorkoutStatus = 'planned' | 'completed' | 'cancelled'

export type PlanStatus = 'active' | 'archived_completed' | 'archived_abandoned'

export type JournalAuthor = 'user' | 'engine'

export type PlanFormat = 'Sprint' | 'Olympique' | '70.3' | 'Ironman'

export interface DisciplineDefinition {
  code: Discipline
  name: string
  color: string
}

export interface ZoneDefinition {
  code: Zone
  name: string
  color: string
  swimPacePer100m?: string
  bikeWattsRange?: [number, number]
  runPacePerKm?: string
  heartRateRangeBpm?: [number, number]
}

export interface EvidenceNoteData {
  level: ProofLevel
  text: string
  sourceRef?: string
}

// --- Profil athlete ---------------------------------------------------

export interface CssReference {
  paceMinPer100m: string
  measuredAt: string
}

export interface FtpReference {
  watts: number
  measuredAt: string
}

export interface RunThresholdReference {
  paceMinPerKm: string
  measuredAt: string
}

export type AppLanguage = 'fr' | 'en'
export type AppTheme = 'light' | 'dark' | 'system'

export interface AthleteProfile {
  id: string
  weightKg: number
  sweatRateLPerH: number
  maxHeartRateBpm: number
  css?: CssReference
  ftp?: FtpReference
  runThreshold?: RunThresholdReference
  language: AppLanguage
  theme: AppTheme
}

// --- Seance -------------------------------------------------------------

export type WorkoutBlockPhase = 'warmup' | 'main' | 'cooldown'
export type WorkoutBlockEffort = 'effort' | 'recovery' | 'rest'

export interface WorkoutTarget {
  pace?: string
  powerPercentFtp?: number
  cadenceRpm?: number
}

// Un bloc porte sa propre zone (une seance pyramidale n'a pas une seule zone pour tous ses
// blocs, cf. ecran 05 "Pyramide CSS" du mockup) et peut representer une repetition structuree
// (ex. "6 x 100m r20s") sans l'aplatir en blocs individuels indiscernables d'une sequence a
// blocs tous differents. `Workout.zone` reste la zone dominante/affichee en badge de liste,
// pas une garantie que tous les blocs partagent cette zone.
export interface WorkoutSegment {
  kind: 'segment'
  phase: WorkoutBlockPhase
  effort: WorkoutBlockEffort
  durationMin: number
  distanceM?: number
  zone?: Zone
  target?: WorkoutTarget
}

export interface WorkoutRepeat {
  kind: 'repeat'
  count: number
  steps: WorkoutSegment[]
}

export type WorkoutBlock = WorkoutSegment | WorkoutRepeat

export type WorkoutLocation =
  | 'pool_25m'
  | 'pool_50m'
  | 'open_water'
  | 'home_trainer'
  | 'road'
  | 'track'
  | 'treadmill'
  | 'outdoor'

export interface Workout {
  id: string
  title: string
  discipline: Discipline
  zone: Zone | null
  isBrick?: boolean
  distanceM?: number
  durationMin: number
  location?: WorkoutLocation
  blocks: WorkoutBlock[]
  why?: EvidenceNoteData
  status: WorkoutStatus
  completedAt?: string
}

// --- Plan -----------------------------------------------------------

export type PlanPhaseName = 'Base' | 'Build' | 'Specific' | 'Taper'
export type PlanPhaseStatus = 'upcoming' | 'active' | 'done'

export interface PlanPhase {
  name: PlanPhaseName
  weeksCount: number
  description?: string
  status: PlanPhaseStatus
}

export interface PlanBlockedWeek {
  weekNumber: number
  reason: string
}

export interface PlanSettings {
  weeklyVolumeTargetMin: number
  availableDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean]
  maxSessionsPerDiscipline: Partial<Record<Discipline, number>>
}

export interface PlanConstraints {
  pool?: boolean
  openWater?: boolean
  homeTrainer?: boolean
  powerMeter?: boolean
  timeTrialBike?: boolean
  blockedWeeks: PlanBlockedWeek[]
}

export interface PlanReferencesSnapshot {
  cssPaceMinPer100m?: string
  ftpWatts?: number
  runThresholdPaceMinPerKm?: string
}

export interface PlanIntensityDistribution {
  z1z2Percent: number
  z3Percent: number
  z4PlusPercent: number
}

export interface PlanDay {
  date: string
  workoutIds: string[]
  unavailable?: boolean
}

export interface PlanWeek {
  weekNumber: number
  phase: PlanPhaseName
  totalVolumeMin: number
  volumeByDiscipline: Partial<Record<Discipline, number>>
  days: PlanDay[]
  blockedReason?: string
  easyPercent: number
  hardPercent: number
}

export type PlanSettingKey =
  | 'race_format'
  | 'date'
  | 'volume'
  | 'days'
  | 'gear'
  | 'reduced_weeks'

export type PlanSettingScope = 'this_week' | 'upcoming_weeks' | 'whole_plan'

export interface TrainingPlan {
  id: string
  raceId?: string
  format: PlanFormat
  startDate: string
  endDate: string
  weeksCount: number
  status: PlanStatus
  abandonedAtWeek?: number
  settings: PlanSettings
  constraints: PlanConstraints
  referencesSnapshot: PlanReferencesSnapshot
  phases: PlanPhase[]
  intensityDistribution: PlanIntensityDistribution
  weeks: PlanWeek[]
}

// --- Course -----------------------------------------------------------

export type RaceRole = 'primary_goal' | 'preparation'

export interface RaceDistances {
  swimM: number
  bikeKm: number
  runKm: number
}

export interface RaceResult {
  timeSec: number
  deltaToTargetSec: number
}

export type RaceSegment = 'N' | 'T1' | 'V' | 'T2' | 'C'

export interface RacePacingSegment {
  segment: RaceSegment
  /** Cible du segment telle que l'artboard 09 l'écrit : « 1:48/100 m », « 193 W · IF 0,78 ». */
  pace: string
  /** Complément de la même ligne, après un point médian : « CSS +14 s », « 30,8 km/h ». */
  note?: string
  /** Appel de note en pied d'écran, posé après `pace` (artboard 09 : le « 4 » sur IF 0,78). */
  noteRef?: number
  cumulativeTimeSec: number
}

export interface RacePacing {
  targetTimeSec: number
  segments: RacePacingSegment[]
  /** IF cible au vélo — titre « Pourquoi 0,78 au vélo » de l'artboard 09. */
  bikeTargetIf?: number
  /** L'encadré de preuve de l'artboard 09, avec sa jauge qualifiée. */
  why?: EvidenceNoteData
}

/** Une ligne d'« À emporter » (artboard 10) : intitulé, précision, quantité. */
export interface RaceNutritionItem {
  label: string
  detail?: string
  /** Quantité déjà formatée, telle que l'artboard l'écrit : « × 2 », « × 5 ». */
  quantity: string
}

export interface RaceNutrition {
  carbsGPerH: number
  glucoseFructoseRatio: string
  items: RaceNutritionItem[]
  /** Plan de boisson, pas un débit de sudation : l'artboard 10 écrit « 600 ml/h ». */
  fluidMlPerH?: number
  sodiumMgPerH?: number
  /** Note 5 de l'artboard 10 (glucides). */
  carbsEvidence?: EvidenceNoteData
  /** Note 6 de l'artboard 10 (sodium). */
  sodiumEvidence?: EvidenceNoteData
  /** Paragraphe de l'encadré jaune « Sodium » de l'artboard 10. */
  sodiumRationale?: string
}

/** Deux moments dans l'artboard 11 : « La veille » et « À rebours du départ ». */
export type RaceTimelinePhase = 'eve' | 'race_day'

export interface RaceTimelineEvent {
  label: string
  /** Heure locale « HH:MM » telle que l'artboard 11 la pose. */
  at: string
  phase: RaceTimelinePhase
  /** Sous-ligne mono : « 3 h avant le départ », « 2 g glucides/kg · 145 g ». */
  detail?: string
  /** Le départ lui-même : rendu en capitales de 26 px, sans filet en dessous. */
  isStart?: boolean
}

export type ChecklistSection = 'T1' | 'bike' | 'T2'

export interface ChecklistItem {
  id: string
  section: ChecklistSection
  label: string
  done: boolean
}

/** Une barre du profil altimétrique vélo de l'artboard 08 (12 barres, pente > 4 % en orange). */
export interface RaceElevationBar {
  key: string
  heightPercent: number
  steep: boolean
}

export interface Race {
  id: string
  name: string
  date: string
  format: PlanFormat
  role: RaceRole
  distances: RaceDistances
  /** Heure de départ « HH:MM » (artboard 11 : « départ 07:20 »). */
  startTime?: string
  elevationGainM?: number
  bikeElevationProfile?: RaceElevationBar[]
  waterTemperatureC?: number
  /** Nature du plan d'eau (artboard S7 : « lac · 19 °C »). */
  swimVenue?: string
  /** Nature du parcours à pied (artboard S7 : « plat · 2 boucles »). */
  runCourseNote?: string
  wetsuitAllowed?: boolean
  draftingAllowed?: boolean
  aidStationsKm?: number[]
  /** « Ce que cette course impose au plan » (artboard S7), une ligne par contrainte. */
  planImplications?: string[]
  /** Rôle d'une course de préparation (artboard 27 : « test d'allure »). */
  purpose?: string
  /** Jours faciles réservés avant une course de préparation (artboard 27 : « 3 jours faciles avant »). */
  easyDaysBefore?: number
  result?: RaceResult
  pacing?: RacePacing
  nutrition?: RaceNutrition
  timeline?: RaceTimelineEvent[]
  transitionChecklist?: ChecklistItem[]
}

// --- Journal du plan -----------------------------------------------------

export interface PlanJournalEntry {
  id: string
  planId: string
  at: string
  author: JournalAuthor
  description: string
  reason?: string
  undone: boolean
}

// --- Sauvegarde / import-export ------------------------------------------

/**
 * Version de l'application, telle que les artboards S2 et S3 l'écrivent : « v 1.4 · hors ligne ».
 * C'est un numéro de produit, affiché à l'utilisateur.
 */
export const APP_VERSION = '1.4'

/**
 * Version de la FORME des données sauvegardées. Elle n'a pas à suivre celle du produit : elle change
 * dès qu'un champ change de type, et l'import refuse alors les sauvegardes de l'ancienne forme
 * (artboard 19 · « Import refusé · rien n'a été modifié ») plutôt que de les lire de travers.
 *
 * 1.4 → 1.5 : `RaceNutrition.items` est passé de `string[]` à des objets `{ label, detail, quantity }`
 * (artboard 10). Une sauvegarde 1.4 se serait importée sans erreur et aurait rendu des libellés vides.
 */
export const CURRENT_SCHEMA_VERSION = 1.5

export interface BackupFile {
  schemaVersion: number
  profile: AthleteProfile
  plans: TrainingPlan[]
  workoutsDone: Workout[]
  races: Race[]
  journal: PlanJournalEntry[]
}
