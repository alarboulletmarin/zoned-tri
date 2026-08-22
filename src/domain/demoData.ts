// Jeu de données de démonstration — valeurs reprises telles quelles des artboards
// (artboards 02, 04, 05, 12, 15, 28, 29 du canevas).
// Aucune donnée utilisateur réelle : uniquement des fixtures pour développer les
// phases suivantes sans attendre le contenu des 312 séances / 1 240 courses.

import type {
  AthleteProfile,
  PlanJournalEntry,
  Race,
  RaceElevationBar,
  TrainingPlan,
  Workout,
} from './types'

export const demoAthleteProfile: AthleteProfile = {
  id: 'singleton',
  weightKg: 72.5,
  sweatRateLPerH: 1.1,
  maxHeartRateBpm: 186,
  css: { paceMinPer100m: '1:32', measuredAt: '2026-08-03' },
  ftp: { watts: 248, measuredAt: '2026-07-20' },
  runThreshold: { paceMinPerKm: '4:12', measuredAt: '2026-06-15' },
  language: 'fr',
  theme: 'light',
}

// Artboards 02 et 05 · natation · « 8 × 150 m au CSS », 2 400 m, 55 min, Z4.
export const demoSwimWorkout: Workout = {
  id: 'demo-workout-swim-css-pyramid',
  title: '8 × 150 m au CSS',
  discipline: 'N',
  zone: 'Z4',
  distanceM: 2400,
  durationMin: 55,
  location: 'pool_25m',
  blocks: [
    { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 12, distanceM: 400, zone: 'Z1' },
    {
      kind: 'repeat',
      count: 8,
      steps: [
        { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 2.5, distanceM: 150, zone: 'Z4', target: { pace: '1:34/100m' } },
        { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.33, zone: 'Z1' },
      ],
    },
    { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 6, distanceM: 200, zone: 'Z1' },
  ],
  why: {
    level: 'moderate',
    text: 'Allure dérivée de ton CSS du 3 août.',
    sourceRef: 'Wakayoshi et al. 1992',
  },
  status: 'planned',
}

/**
 * Artboard 28 · vélo · « 3 × 12′ au seuil », 1 h 05, Z4, 238 W cible.
 *
 * Les trois blocs sont une SÉRIE, pas un pavé de 36 min : l'artboard dessine trois barres Z4
 * séparées par deux récupérations vertes (l. 3076-3078) et son tableau écrit « 3 × 12′ · r 4′ ».
 * Les cibles sont en % de FTP — la seule forme que le domaine stocke — et se relisent en watts
 * contre la FTP du profil : 65 % → 161 W (l'artboard écrit « 160 »), 96 % → 238 W (sa valeur de
 * CIBLE au watt près), 56 % → 139 W (« 140 »).
 */
export const demoBikeWorkout: Workout = {
  id: 'demo-workout-bike-threshold-3x12',
  title: '3 × 12′ au seuil',
  discipline: 'V',
  zone: 'Z4',
  durationMin: 65,
  location: 'home_trainer',
  blocks: [
    { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 12, zone: 'Z2', target: { powerPercentFtp: 65, cadenceRpm: 90 } },
    {
      kind: 'repeat',
      count: 3,
      steps: [
        { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 12, zone: 'Z4', target: { powerPercentFtp: 96, cadenceRpm: 88 } },
        { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 4, zone: 'Z2', target: { powerPercentFtp: 45 } },
      ],
    },
    { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 8, zone: 'Z1', target: { powerPercentFtp: 56 } },
  ],
  why: {
    level: 'moderate',
    text: 'Blocs de 12′ préférés à des blocs de 20′ pour ce niveau.',
  },
  status: 'planned',
}

/**
 * Artboard 29 · course · « 6 × 1 000 m au seuil », 13 km, 1 h 02, Z4, allure 4:12/km.
 *
 * Six répétitions et non un bloc unique : l'artboard dessine cinq barres Z4 séparées par le trot
 * gris (l. 3137-3141) et son tableau détaille les répétitions. Les distances des blocs somment
 * exactement les 13 km de l'en-tête, et leurs durées les 62 minutes.
 */
export const demoRunWorkout: Workout = {
  id: 'demo-workout-run-threshold-6x1000',
  title: '6 × 1 000 m au seuil',
  discipline: 'C',
  zone: 'Z4',
  distanceM: 13000,
  durationMin: 62,
  location: 'track',
  blocks: [
    { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 17.5, distanceM: 3500, zone: 'Z2' },
    {
      kind: 'repeat',
      count: 6,
      steps: [
        { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 4.2, distanceM: 1000, zone: 'Z4', target: { pace: '4:12/km' } },
        { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 1.5, distanceM: 250, zone: 'Z1' },
      ],
    },
    { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, distanceM: 2000, zone: 'Z2' },
  ],
  why: {
    level: 'solid',
    text: 'La régularité compte plus que la vitesse sur des répétitions au seuil.',
  },
  status: 'planned',
}

// Artboard 02a · repos prévu au plan.
export const demoRestWorkout: Workout = {
  id: 'demo-workout-rest-recovery',
  title: 'Repos actif',
  discipline: 'R',
  zone: null,
  durationMin: 30,
  blocks: [{ kind: 'segment', phase: 'main', effort: 'rest', durationMin: 30 }],
  status: 'planned',
}

// Artboard 15 · « Enchaînement » après la séance vélo clé du même jour.
export const demoBrickRunWorkout: Workout = {
  id: 'demo-workout-run-brick-enchainement',
  title: 'Enchaînement',
  discipline: 'C',
  zone: 'Z2',
  isBrick: true,
  durationMin: 25,
  location: 'road',
  blocks: [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 25, zone: 'Z2', target: { pace: '5:10/km' } }],
  why: {
    level: 'moderate',
    text: 'Courir sur jambes fatiguées reproduit l’état réel du départ à pied. L’ordre ne s’inverse pas.',
  },
  status: 'planned',
}

export const demoWorkouts: Workout[] = [
  demoSwimWorkout,
  demoBikeWorkout,
  demoRunWorkout,
  demoRestWorkout,
  demoBrickRunWorkout,
]

// Profil altimétrique vélo de l'artboard 08 : douze barres, celles de plus de 4 % en orange.
const VICHY_BIKE_PROFILE: RaceElevationBar[] = [
  { key: 'km-0', heightPercent: 30, steep: false },
  { key: 'km-8', heightPercent: 38, steep: false },
  { key: 'km-15', heightPercent: 58, steep: true },
  { key: 'km-23', heightPercent: 74, steep: true },
  { key: 'km-30', heightPercent: 46, steep: false },
  { key: 'km-38', heightPercent: 34, steep: false },
  { key: 'km-45', heightPercent: 62, steep: true },
  { key: 'km-53', heightPercent: 88, steep: true },
  { key: 'km-60', heightPercent: 52, steep: false },
  { key: 'km-68', heightPercent: 28, steep: false },
  { key: 'km-75', heightPercent: 40, steep: false },
  { key: 'km-83', heightPercent: 22, steep: false },
]

/**
 * Artboards 08 / 09 / 10 / 11 / 30 · fiche course « 70.3 Vichy », 30 août.
 *
 * Les cumuls du pacing reprennent les segments de l'artboard 09 (34:12 · 3:30 · 2:55:00 · 2:10 ·
 * 1:49:38) et non son en-tête : cet en-tête affiche 7:08:30 alors que ses propres segments font
 * 5:24:30, et un total qui n'est pas la somme de ses parts ne trace pas sa source. `targetTimeSec`
 * vaut donc la somme, et l'écart est signalé dans le rapport de reprise.
 */
export const demoRace: Race = {
  id: 'demo-race-70-3-vichy',
  name: '70.3 Vichy',
  date: '2026-08-30',
  format: '70.3',
  role: 'primary_goal',
  startTime: '07:20',
  distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
  elevationGainM: 720,
  bikeElevationProfile: VICHY_BIKE_PROFILE,
  waterTemperatureC: 19.5,
  swimVenue: 'lac',
  runCourseNote: 'plat · 2 boucles',
  wetsuitAllowed: true,
  draftingAllowed: false,
  aidStationsKm: [30, 60],
  planImplications: [
    '18 semaines · affûtage sur les 2 dernières',
    '2 sorties longues vélo par mois à IF 0,78',
    '4 enchaînements vélo → course en semaines 12 à 16',
  ],
  pacing: {
    targetTimeSec: 19470, // 5:24:30 — somme des cinq segments ci-dessous
    bikeTargetIf: 0.78,
    segments: [
      { segment: 'N', pace: '1:48/100 m', note: 'CSS +14 s', cumulativeTimeSec: 2052 },
      { segment: 'T1', pace: '', note: 'combinaison, casque, chaussures posées', cumulativeTimeSec: 2262 },
      { segment: 'V', pace: '193 W · IF 0,78', note: '30,8 km/h', noteRef: 4, cumulativeTimeSec: 12762 },
      { segment: 'T2', pace: '', note: 'casque, chaussures, ceinture', cumulativeTimeSec: 12892 },
      { segment: 'C', pace: '5:12/km', note: 'seuil +60 s', cumulativeTimeSec: 19470 },
    ],
    why: {
      level: 'moderate',
      text: "Au-delà de 0,80 sur un demi, la course s'effondre plus souvent qu'elle ne gagne du temps. Marge prise sur les bosses du km 38 et du km 61.",
      sourceRef: "Consensus d'entraîneurs, peu d'essais contrôlés",
    },
  },
  nutrition: {
    carbsGPerH: 78,
    glucoseFructoseRatio: '2:1',
    fluidMlPerH: 600,
    sodiumMgPerH: 600,
    items: [
      { label: 'Bidon boisson 80 g', detail: 'cadre + porte-bidon arrière', quantity: '× 2' },
      { label: 'Gel 22 g', detail: '3 vélo · 2 course', quantity: '× 5' },
      { label: 'Barre 30 g', detail: 'km 20 et km 55 du vélo', quantity: '× 2' },
    ],
    carbsEvidence: {
      level: 'solid',
      text: "Jeukendrup — 60 à 90 g/h avec transporteurs multiples, à condition de l'avoir entraîné.",
      sourceRef: 'Jeukendrup, A. (2014), Nutrition Reviews',
    },
    sodiumEvidence: {
      level: 'weak',
      text: 'Protocoles sodium hétérogènes',
      sourceRef: 'ACSM, Position Stand on Exercise and Fluid Replacement',
    },
    sodiumRationale:
      'Les pertes sont très individuelles et les recommandations divergent. Point de départ à ajuster sur tes sorties longues.',
  },
  timeline: [
    { phase: 'eve', at: '16:00', label: 'Dépôt du vélo · repérage T1/T2' },
    { phase: 'eve', at: '19:00', label: 'Dernier repas riche en glucides' },
    { phase: 'eve', at: '22:00', label: 'Coucher · sacs préparés' },
    { phase: 'race_day', at: '04:20', label: 'Réveil', detail: '3 h avant le départ' },
    { phase: 'race_day', at: '04:40', label: 'Petit-déjeuner', detail: '2 g glucides/kg · 145 g' },
    { phase: 'race_day', at: '05:40', label: 'Ouverture du parc', detail: 'pression, bidons, compteur' },
    {
      phase: 'race_day',
      at: '06:40',
      label: 'Combinaison + échauffement',
      detail: '10 min souple + 4 accélérations',
    },
    { phase: 'race_day', at: '07:05', label: 'Gel + 200 ml' },
    { phase: 'race_day', at: '07:20', label: 'Départ', isStart: true },
  ],
  transitionChecklist: [
    { id: 't1-casque', section: 'T1', label: 'Casque ouvert, sangles écartées', done: true },
    { id: 't1-chaussures', section: 'T1', label: 'Chaussures clipsées, élastiques posés', done: false },
    { id: 't1-plateau', section: 'T1', label: 'Vélo sur le grand plateau, 3ᵉ pignon', done: false },
    { id: 't1-serviette', section: 'T1', label: 'Serviette pliée en repère visuel', done: false },
    { id: 'v-bidons', section: 'bike', label: '2 bidons · 80 g de glucides chacun', done: true },
    { id: 'v-gels', section: 'bike', label: '3 gels scotchés au cadre', done: true },
    { id: 'v-pression', section: 'bike', label: 'Pression : 6,2 bar avant / 6,5 arrière', done: false },
    { id: 'v-compteur', section: 'bike', label: "Compteur remis à zéro, écran d'allure", done: false },
    { id: 't2-chaussures', section: 'T2', label: 'Chaussures délacées, ceinture dessus', done: false },
    { id: 't2-casquette', section: 'T2', label: 'Casquette et 2 gels dans la ceinture', done: false },
  ],
}

// Artboards 27 et S7 · les deux courses de préparation, encadrées « PRÉPA ».
export const demoPreparationRaces: Race[] = [
  {
    id: 'demo-race-olympique-beauvais',
    name: 'Olympique de Beauvais',
    date: '2026-07-12',
    format: 'Olympique',
    role: 'preparation',
    distances: { swimM: 1500, bikeKm: 40, runKm: 10 },
    purpose: "test d'allure",
    easyDaysBefore: 3,
  },
  {
    // L'aquathlon n'a pas de partie vélo ; `format` ne porte pas ce mot, « Sprint » est le format
    // du modèle le plus proche (signalé dans le rapport de reprise).
    id: 'demo-race-aquathlon-compiegne',
    name: 'Aquathlon de Compiègne',
    date: '2026-08-03',
    format: 'Sprint',
    role: 'preparation',
    distances: { swimM: 1000, bikeKm: 0, runKm: 5 },
    purpose: 'rodage transition',
    easyDaysBefore: 2,
  },
]

// Artboards 27 et S7 · la course déjà courue. 1:18:42, 12 s de mieux que la cible.
export const demoPastRace: Race = {
  id: 'demo-race-sprint-senlis',
  name: 'Sprint de Senlis',
  date: '2026-05-18',
  format: 'Sprint',
  role: 'preparation',
  distances: { swimM: 750, bikeKm: 20, runKm: 5 },
  result: { timeSec: 4722, deltaToTargetSec: -12 },
}

/** Les quatre courses de l'artboard 27 : « 4 · dont 1 passée ». */
export const demoRaces: Race[] = [demoRace, ...demoPreparationRaces, demoPastRace]

// Artboard 04 · vue macro du plan « 70.3 Vichy », 18 semaines, semaine 07 en cours.
export const demoPlan: TrainingPlan = {
  id: 'demo-plan-70-3-vichy',
  raceId: demoRace.id,
  format: '70.3',
  startDate: '2026-05-04',
  endDate: '2026-08-30',
  weeksCount: 18,
  status: 'active',
  settings: {
    weeklyVolumeTargetMin: 450,
    availableDays: [true, true, true, true, false, true, true],
    maxSessionsPerDiscipline: { N: 2, V: 3, C: 3 },
  },
  constraints: {
    pool: true,
    openWater: true,
    homeTrainer: true,
    powerMeter: false,
    timeTrialBike: true,
    blockedWeeks: [{ weekNumber: 4, reason: 'Déplacement pro : volume réduit, pas de longue sortie' }],
  },
  referencesSnapshot: {
    cssPaceMinPer100m: demoAthleteProfile.css?.paceMinPer100m,
    ftpWatts: demoAthleteProfile.ftp?.watts,
    runThresholdPaceMinPerKm: demoAthleteProfile.runThreshold?.paceMinPerKm,
  },
  // Les quatre descriptions sont celles de l'artboard 04 (l. 526, 530, 534, 538), mot pour mot.
  phases: [
    { name: 'Base', weeksCount: 4, description: 'volume, technique, aérobie', status: 'done' },
    { name: 'Build', weeksCount: 8, description: 'seuil, durabilité, longues sorties', status: 'active' },
    { name: 'Specific', weeksCount: 3, description: 'allure course, enchaînements, nutrition', status: 'upcoming' },
    { name: 'Taper', weeksCount: 3, description: 'volume −45 %, intensité maintenue', status: 'upcoming' },
  ],
  intensityDistribution: { z1z2Percent: 78, z3Percent: 8, z4PlusPercent: 14 },
  weeks: [
    {
      weekNumber: 7,
      phase: 'Build',
      totalVolumeMin: 490,
      volumeByDiscipline: { N: 100, V: 210, C: 150, R: 30 },
      days: [
        { date: '2026-06-15', workoutIds: [demoSwimWorkout.id] },
        { date: '2026-06-16', workoutIds: [demoBikeWorkout.id] },
        { date: '2026-06-17', workoutIds: [demoRunWorkout.id] },
        { date: '2026-06-18', workoutIds: [demoRestWorkout.id] },
        { date: '2026-06-19', workoutIds: [] },
        { date: '2026-06-20', workoutIds: [demoBikeWorkout.id, demoBrickRunWorkout.id] },
        { date: '2026-06-21', workoutIds: [demoRunWorkout.id] },
      ],
      easyPercent: 81,
      hardPercent: 19,
    },
  ],
}

export const demoJournalEntries: PlanJournalEntry[] = [
  {
    id: 'demo-journal-1',
    planId: demoPlan.id,
    at: '2026-06-20T09:45:00.000Z',
    author: 'user',
    description: 'Enchaînement vélo → course marqué fait le samedi',
    undone: false,
  },
  {
    id: 'demo-journal-2',
    planId: demoPlan.id,
    at: '2026-06-01T08:00:00.000Z',
    author: 'engine',
    description: 'Affûtage calé à 2 semaines',
    reason: 'Bosquet et al. 2007 — méta-analyse',
    undone: false,
  },
]
