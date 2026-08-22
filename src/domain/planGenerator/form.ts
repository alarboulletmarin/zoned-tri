// État du formulaire de génération (G1→G6) : contrat unique partagé par les 6 écrans d'étape,
// la machine à états du parcours et le moteur de génération. Un seul objet, jamais dupliqué :
// chaque étape n'écrit que sa portion et lit ce dont elle a besoin.

import type { AthleteProfile, Discipline, PlanBlockedWeek, PlanFormat } from '../types'
import { addDays, mondayOf, weekdayIndex } from './dates'
import { raceFormat } from './formats'

/** Les 6 étapes du canevas, dans l'ordre. `summary` est la 6e (G6 · Récapitulatif). */
export type GeneratorStepId = 'format' | 'date' | 'availability' | 'constraints' | 'references' | 'summary'

export const GENERATOR_STEPS: readonly GeneratorStepId[] = [
  'format',
  'date',
  'availability',
  'constraints',
  'references',
  'summary',
] as const

export const GENERATOR_STEP_COUNT = GENERATOR_STEPS.length

/**
 * Ce que le générateur demande réellement, et la seule source qui le dise.
 *
 * L'ouverture promettait « ≈ 4 min · 6 questions », n'en listait que trois, et annonçait une
 * question sur la « discipline dominante » que le parcours ne pose nulle part. Trois écarts pour
 * une promesse de deux lignes. Les six étapes ne sont d'ailleurs pas six questions : la dernière
 * est un récapitulatif, qui ne demande rien. Les libellés vivent donc ici, à côté des étapes
 * qu'ils décrivent — l'ouverture les lit, elle ne les réécrit pas.
 *
 * Les « ≈ 4 min » ne se mesurent nulle part : ils ne sont pas remplacés, ils sont retirés.
 */
export interface GeneratorQuestion {
  id: GeneratorStepId
  /** Rang affiché, « 01 » à « 05 ». Le récapitulatif n'en porte pas : il ne demande rien. */
  index: string
  title: string
  detail: string
}

export const GENERATOR_QUESTIONS: readonly GeneratorQuestion[] = [
  { id: 'format', index: '01', title: 'Ton format', detail: 'sprint, olympique, 70.3 ou Ironman' },
  { id: 'date', index: '02', title: 'Ta date de course', detail: 'ou aucune course, pour un plan sans échéance' },
  {
    id: 'availability',
    index: '03',
    title: 'Tes disponibilités',
    detail: 'heures par semaine, jours d’entraînement, séances par discipline',
  },
  {
    id: 'constraints',
    index: '04',
    title: 'Ce que tu as sous la main',
    detail: 'bassin, home-trainer, lieux · et les semaines à alléger',
  },
  {
    id: 'references',
    index: '05',
    title: 'Tes allures de référence',
    detail: 'CSS, FTP, seuil course — ou rien, et le plan les fait tester',
  },
] as const

export const GENERATOR_QUESTION_COUNT = GENERATOR_QUESTIONS.length

/** Disciplines réellement planifiables (« R » est une étiquette de récupération, pas un choix). */
export type TrainingDiscipline = Extract<Discipline, 'N' | 'V' | 'C'>

export const TRAINING_DISCIPLINES: readonly TrainingDiscipline[] = ['N', 'V', 'C'] as const

/** Jours disponibles, index 0 = lundi (même convention que `PlanSettings.availableDays`). */
export type AvailableDays = [boolean, boolean, boolean, boolean, boolean, boolean, boolean]

export interface GeneratorReferences {
  /** « 1:32 » (min:sec aux 100 m). */
  cssPaceMinPer100m?: string
  ftpWatts?: number
  /** « 4:15 » (min:sec au km). */
  runThresholdPaceMinPerKm?: string
}

export interface GeneratorConstraints {
  pool: boolean
  openWater: boolean
  homeTrainer: boolean
  powerMeter: boolean
  timeTrialBike: boolean
  /** `weekNumber` 1-indexé dans le plan à venir. */
  blockedWeeks: PlanBlockedWeek[]
}

export interface GeneratorForm {
  // --- G1 · Objectif
  format: PlanFormat
  /** Saisie libre : le catalogue de courses est reporté (décision de session). */
  raceName: string
  /** Vrai = « aucune course, je m'entraîne » : la durée du plan vient alors du format. */
  noRace: boolean

  // --- G2 · Date
  /** Jour de la course (ISO). Ignoré quand `noRace`. */
  raceDate: string

  // --- G3 · Disponibilité
  weeklyVolumeTargetMin: number
  availableDays: AvailableDays
  maxSessionsPerDiscipline: Record<TrainingDiscipline, number>

  // --- G4 · Contraintes
  constraints: GeneratorConstraints

  // --- G5 · Références
  references: GeneratorReferences
  /** Placer un test en semaine 1 pour la discipline dont la référence manque. */
  testSessions: Record<TrainingDiscipline, boolean>
}

/** Bornes du curseur de volume hebdomadaire (canevas G3 : « 4 h » … « 12 h »). */
export const VOLUME_MIN_MIN = 240
export const VOLUME_MAX_MIN = 720
export const VOLUME_STEP_MIN = 15

/**
 * Premier dimanche à au moins `weeks` semaines de `todayIso` — date de course proposée par défaut
 * à l'étape G2 quand l'utilisateur n'en a pas encore saisi. Un triathlon se court un dimanche dans
 * l'écrasante majorité des cas, et le canevas G2 affiche « dimanche » sous la date.
 */
export function defaultRaceDate(todayIso: string, weeks: number): string {
  const monday = mondayOf(todayIso)
  return addDays(monday, weeks * 7 - 1)
}

/**
 * Formulaire de départ : les valeurs du canevas pour ce qui est un choix produit (format 70.3,
 * 7 h 30 sur 6 jours, vendredi libre, 2 N / 3 V / 3 C), le profil enregistré pour tout ce qui est
 * une donnée de l'utilisateur (références, tests proposés).
 *
 * Rien n'est deviné : une référence absente du profil reste absente et déclenche la proposition
 * de test correspondante, conformément à l'encart « Pourquoi pas d'estimation » de G5.
 */
export function createInitialForm(profile: AthleteProfile | undefined, todayIso: string): GeneratorForm {
  const format: PlanFormat = '70.3'
  const references: GeneratorReferences = {
    cssPaceMinPer100m: profile?.css?.paceMinPer100m,
    ftpWatts: profile?.ftp?.watts,
    runThresholdPaceMinPerKm: profile?.runThreshold?.paceMinPerKm,
  }

  return {
    format,
    raceName: '',
    noRace: false,
    raceDate: defaultRaceDate(todayIso, raceFormat(format).minWeeks),
    weeklyVolumeTargetMin: 450,
    availableDays: [true, true, true, true, false, true, true],
    maxSessionsPerDiscipline: { N: 2, V: 3, C: 3 },
    constraints: {
      pool: true,
      openWater: false,
      homeTrainer: true,
      powerMeter: false,
      timeTrialBike: false,
      blockedWeeks: [],
    },
    references,
    testSessions: {
      N: references.cssPaceMinPer100m === undefined,
      V: references.ftpWatts === undefined,
      C: references.runThresholdPaceMinPerKm === undefined,
    },
  }
}

/** Nombre de jours cochés à l'étape G3. */
export function availableDayCount(days: AvailableDays): number {
  return days.filter(Boolean).length
}

/** Vrai quand `isoDate` tombe sur un jour coché. */
export function isDayAvailable(days: AvailableDays, isoDate: string): boolean {
  return days[weekdayIndex(isoDate)]
}
