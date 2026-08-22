// Jeu de contenu reduit (~30 seances) pour developper et tester la bibliotheque de la Phase 4
// (filtres, recherche, affichage) sans attendre le contenu final des 312 seances.
//
// Repartition volontairement couverte plutot qu'exhaustive : chaque discipline (N/V/C/R) a au
// moins une seance, et au moins deux seances portent le tag isBrick. Ce n'est PAS le contenu de
// production final — une passe de contenu dediee viendra plus tard porter ce jeu a 312 seances.
//
// --- Provenance ---------------------------------------------------------------------------
// Course a pied (11 seances, id prefixe "run-") : portees depuis les gabarits reels de l'app
// soeur "zoned" (../../zoned/src/data/workouts/*.json), en traduisant leur
// warmupStructure/mainSetStructure/cooldownStructure vers WorkoutSegment/WorkoutRepeat. Les
// chiffres (durees, nombre de repetitions, zones) viennent tels quels de la source ; seules deux
// adaptations structurelles ont ete faites :
//   1. Le format zoned separe "steps" (l'effort) et "between" (la recuperation) au sein d'un
//      repeat ; le format Zoned Tri fusionne un cycle effort+recuperation dans un seul `steps`
//      (cf. WorkoutRepeat.steps dans demoData "Pyramide CSS"). Chaque repetition portee combine
//      donc les deux.
//   2. zoned autorise des repeats imbriques (ex. VMA-001 "30/30" = 2 series de 12 repetitions) ;
//      WorkoutRepeat.steps n'accepte que des WorkoutSegment, jamais un WorkoutRepeat imbrique.
//      VMA-001 a donc ete aplati en deux WorkoutRepeat consecutifs separes par le bloc de
//      recuperation "entre series", sans perte des chiffres source.
// Quand la source donne une zone composite ("Z1-Z2", "Z2-Z3", "Z2-Z4" — un intervalle plutot
// qu'une zone unique, car ce champ decrit une progression ou une plage libre), la zone unique du
// modele Zoned Tri est resolue en prenant le premier palier de l'intervalle (le plus bas) : c'est
// une simplification structurelle assumee (comme le permet l'enonce de la tache), pas une valeur
// d'entrainement inventee. Les gabarits ou l'effort principal n'est donne qu'en distance sans
// duree (ex. repetitions au 400m) ont ete ecartes du portage pour ne pas avoir a inventer un
// couple allure/duree absent de la source.
//
// Natation, velo, repos/renfort et les 3 seances "brick" (7+7+3+... voir plus bas) : ecrites a la
// main faute d'equivalent dans "zoned" (qui ne couvre que la course a pied). Les zones/allures y
// sont choisies pour rester a l'interieur des bornes des calculateurs deja implementes
// (swimZonesFromCss avec le CSS de reference 1:32/100m, ftpPowerZones avec le FTP de reference
// 248W, runPaceZonesFromThreshold avec le seuil de reference 4:12/km — les memes references que
// demoAthleteProfile), pour que zone affichee et cible chiffree restent coherentes. Aucune de ces
// seances ne revendique une source scientifique : le champ `why` n'est rempli que sur les 4 ou le
// principe invoque est deja etabli ailleurs dans l'app (transition brick, protocole de test FTP).

import type { Workout } from './types'

// --- Course a pied (portees depuis zoned) --------------------------------------------------

const runWorkouts: Workout[] = [
  // zoned: endurance.json / END-001 "Endurance fondamentale"
  {
    id: 'run-endurance-fondamentale',
    title: 'Endurance fondamentale',
    discipline: 'C',
    zone: 'Z2',
    durationMin: 50,
    location: 'outdoor',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 40, zone: 'Z2' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 5, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: threshold.json / THR-002 "Seuil fractionne" (3x8min r2min)
  {
    id: 'run-seuil-fractionne-3x8',
    title: 'Seuil fractionné',
    discipline: 'C',
    zone: 'Z4',
    durationMin: 60,
    location: 'road',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z1' },
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 5 },
      {
        kind: 'repeat',
        count: 3,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 8, zone: 'Z4' },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z1' },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: vma.json / VMA-001 "30/30 classique" (2 series de 12x30s/30s, r3min entre series) —
  // repeat imbrique de la source aplati en deux WorkoutRepeat consecutifs.
  {
    id: 'run-vma-30-30',
    title: '30/30 classique',
    discipline: 'C',
    zone: 'Z5',
    durationMin: 57,
    location: 'road',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z1' },
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 5 },
      {
        kind: 'repeat',
        count: 12,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 0.5, zone: 'Z5' },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
        ],
      },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 3, zone: 'Z1' },
      {
        kind: 'repeat',
        count: 12,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 0.5, zone: 'Z5' },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: long_run.json / SL-003 "Sortie longue endurance pure"
  {
    id: 'run-longue-endurance-pure',
    title: 'Sortie longue endurance pure',
    discipline: 'C',
    zone: 'Z2',
    durationMin: 90,
    location: 'outdoor',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 70, zone: 'Z2' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: recovery.json / REC-001 "Footing recuperation"
  {
    id: 'run-recuperation-footing',
    title: 'Footing récupération',
    discipline: 'C',
    zone: 'Z1',
    durationMin: 30,
    location: 'outdoor',
    blocks: [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, zone: 'Z1' }],
    status: 'planned',
  },
  // zoned: fartlek.json / FAR-001 "Fartlek libre"
  {
    id: 'run-fartlek-libre',
    title: 'Fartlek libre',
    discipline: 'C',
    zone: 'Z2',
    durationMin: 45,
    location: 'outdoor',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 25, zone: 'Z2' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: mixed.json / MIX-003 "Pyramide complete" (1-2-3-4-3-2-1 min, entrecoupe de recup)
  {
    id: 'run-pyramide-complete',
    title: 'Pyramide complète',
    discipline: 'C',
    zone: 'Z4',
    durationMin: 50,
    location: 'road',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 1, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 2, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 1, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 4, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 2, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 1, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1, zone: 'Z4' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: hills.json / HIL-014 "Course continue en terrain vallonne" (methode Lydiard)
  {
    id: 'run-cotes-vallonnees-continu',
    title: 'Course continue en terrain vallonné',
    discipline: 'C',
    zone: 'Z3',
    durationMin: 60,
    location: 'outdoor',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 40, zone: 'Z3' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: trail.json / TRL-006 "Endurance en montee prolongee" (zone source "Z2-Z3" -> Z2)
  {
    id: 'run-trail-montee-continue',
    title: 'Endurance en montée prolongée',
    discipline: 'C',
    zone: 'Z2',
    durationMin: 90,
    location: 'outdoor',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z2' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 70, zone: 'Z2' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // zoned: long_run.json / LR-014 "Sortie longue courte"
  {
    id: 'run-longue-courte',
    title: 'Sortie longue courte',
    discipline: 'C',
    zone: 'Z2',
    durationMin: 45,
    location: 'outdoor',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 35, zone: 'Z2' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 5, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // Test de reference du seuil en course a pied : c'est le protocole exact nomme par le canevas
  // (G5, "30 min contre-la-montre · course a pied · semaine 1") et l'entree attendue par le
  // calculateur runThresholdFrom30MinTest (distance couverte en 30 min).
  {
    id: 'run-test-seuil-30min',
    title: '30 min contre-la-montre',
    discipline: 'C',
    zone: 'Z4',
    durationMin: 45,
    location: 'track',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, zone: 'Z4' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 5, zone: 'Z1' },
    ],
    why: {
      level: 'moderate',
      text: "L'allure moyenne tenue sur 30 minutes en contre-la-montre approche l'allure au seuil : c'est une mesure directe, préférée à une estimation depuis le FTP vélo.",
    },
    status: 'planned',
  },
  // Ecrite a la main (pas de gabarit zoned equivalent) : jambe course d'un enchainement
  // velo -> course. Allure cible 5:20/km = zone Z2 pour le seuil de reference 4:12/km.
  {
    id: 'run-brick-transition-post-velo',
    title: 'Transition course après vélo',
    discipline: 'C',
    zone: 'Z2',
    isBrick: true,
    durationMin: 18,
    location: 'road',
    blocks: [
      {
        kind: 'segment',
        phase: 'main',
        effort: 'effort',
        durationMin: 18,
        zone: 'Z2',
        target: { pace: '5:20/km' },
      },
    ],
    why: {
      level: 'moderate',
      text: "Course juste après le vélo, même jour : transition spécifique travaillée.",
    },
    status: 'planned',
  },
]

// --- Natation (ecrites a la main) -----------------------------------------------------------
// Allures deduites des zones du CSS de reference (1:32/100m, cf. demoAthleteProfile), bornees par
// swimZonesFromCss : Z2 ~1:43-1:50, Z3 ~1:37-1:42, Z4 ~1:30-1:36, Z6 <1:25.

const swimWorkouts: Workout[] = [
  {
    id: 'swim-technique-educatifs',
    title: 'Éducatifs et technique',
    discipline: 'N',
    zone: 'Z2',
    distanceM: 1100,
    durationMin: 26.5,
    location: 'pool_25m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 8, distanceM: 400, zone: 'Z1' },
      {
        kind: 'repeat',
        count: 10,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1, distanceM: 50, zone: 'Z2', target: { pace: '1:47/100m' } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.33, zone: 'Z1' },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 5, distanceM: 200, zone: 'Z1' },
    ],
    status: 'planned',
  },
  {
    id: 'swim-endurance-continue',
    title: 'Endurance continue',
    discipline: 'N',
    zone: 'Z2',
    distanceM: 2450,
    durationMin: 48,
    location: 'pool_50m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, distanceM: 400, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30, distanceM: 1700, zone: 'Z2', target: { pace: '1:47/100m' } },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 8, distanceM: 350, zone: 'Z1' },
    ],
    status: 'planned',
  },
  {
    id: 'swim-seuil-css-8x200',
    title: 'Seuil CSS 8 x 200 m',
    discipline: 'N',
    zone: 'Z4',
    distanceM: 2300,
    durationMin: 46.8,
    location: 'pool_50m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, distanceM: 400, zone: 'Z1' },
      {
        kind: 'repeat',
        count: 8,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.1, distanceM: 200, zone: 'Z4', target: { pace: '1:33/100m' } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 8, distanceM: 300, zone: 'Z1' },
    ],
    status: 'planned',
  },
  {
    id: 'swim-vitesse-sprints-16x25',
    title: 'Vitesse 16 x 25 m',
    discipline: 'N',
    zone: 'Z6',
    distanceM: 1100,
    durationMin: 28.5,
    location: 'pool_25m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, distanceM: 400, zone: 'Z1' },
      {
        kind: 'repeat',
        count: 16,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 0.33, distanceM: 25, zone: 'Z6', target: { pace: '1:20/100m' } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.33, zone: 'Z1' },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 8, distanceM: 300, zone: 'Z1' },
    ],
    status: 'planned',
  },
  {
    id: 'swim-pyramide-css-courte',
    title: 'Pyramide CSS courte',
    discipline: 'N',
    zone: 'Z4',
    distanceM: 1400,
    durationMin: 30.5,
    location: 'pool_25m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 8, distanceM: 300, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1.55, distanceM: 100, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.1, distanceM: 200, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 4.65, distanceM: 300, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 1, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.1, distanceM: 200, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1.55, distanceM: 100, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 6, distanceM: 200, zone: 'Z1' },
    ],
    status: 'planned',
  },
  {
    id: 'swim-descendant-4x200',
    title: 'Descendant 4 x 200 m',
    discipline: 'N',
    zone: 'Z4',
    distanceM: 1500,
    durationMin: 32.3,
    location: 'pool_50m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, distanceM: 400, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.3, distanceM: 200, zone: 'Z3', target: { pace: '1:39/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.3, distanceM: 200, zone: 'Z3', target: { pace: '1:39/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.1, distanceM: 200, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 0.5, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3.1, distanceM: 200, zone: 'Z4', target: { pace: '1:33/100m' } },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 8, distanceM: 300, zone: 'Z1' },
    ],
    status: 'planned',
  },
  {
    id: 'swim-eau-libre-orientation',
    title: 'Eau libre orientation',
    discipline: 'N',
    zone: 'Z2',
    distanceM: 2400,
    durationMin: 45,
    location: 'open_water',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 5, distanceM: 200, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 35, distanceM: 2000, zone: 'Z2', target: { pace: '1:45/100m' } },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 5, distanceM: 200, zone: 'Z1' },
    ],
    status: 'planned',
  },
  // Test de reference CSS : les deux contre-la-montre 400 m puis 200 m attendus par le
  // calculateur cssFrom400And200 (canevas G5, source "test 400/200").
  {
    id: 'swim-test-css-400-200',
    title: 'Test CSS 400 m / 200 m',
    discipline: 'N',
    zone: 'Z4',
    distanceM: 1800,
    durationMin: 38.1,
    location: 'pool_25m',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 14, distanceM: 600, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 6.2, distanceM: 400, zone: 'Z4' },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 5, distanceM: 200, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 2.9, distanceM: 200, zone: 'Z4' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, distanceM: 400, zone: 'Z1' },
    ],
    why: {
      level: 'moderate',
      text: "Deux contre-la-montre (400 m puis 200 m) suffisent à établir la vitesse critique de nage, dont découlent toutes les allures de natation du plan.",
      sourceRef: 'Wakayoshi et al. 1992 (vitesse critique) ; formule à 2 distances : Ginn 1993',
    },
    status: 'planned',
  },
  // Jambe natation d'un enchainement natation -> velo (pas de retour au calme : le T1 puis le
  // velo enchainent directement).
  {
    id: 'swim-eau-libre-avant-brick',
    title: 'Eau libre avant T1',
    discipline: 'N',
    zone: 'Z3',
    isBrick: true,
    distanceM: 1550,
    durationMin: 28,
    location: 'open_water',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 5, distanceM: 200, zone: 'Z1' },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 20, distanceM: 1200, zone: 'Z3', target: { pace: '1:40/100m' } },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 3, distanceM: 150, zone: 'Z4', target: { pace: '1:33/100m' } },
    ],
    why: {
      level: 'moderate',
      text: "Fin d'effort à allure course juste avant l'enchaînement vélo : simulation de la transition T1.",
    },
    status: 'planned',
  },
]

// --- Velo (ecrites a la main) ---------------------------------------------------------------
// %FTP cibles bornes par ftpPowerZones (Z1 <55%, Z2 55-75%, Z3 75-90%, Z4 90-105%, Z5 105-120%).

const bikeWorkouts: Workout[] = [
  {
    id: 'bike-endurance-longue',
    title: 'Endurance longue',
    discipline: 'V',
    zone: 'Z2',
    durationMin: 120,
    location: 'road',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 100, zone: 'Z2', target: { powerPercentFtp: 65, cadenceRpm: 85 } },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    status: 'planned',
  },
  {
    id: 'bike-seuil-2x20',
    title: "2 x 20' au seuil",
    discipline: 'V',
    zone: 'Z4',
    durationMin: 75,
    location: 'home_trainer',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2', target: { powerPercentFtp: 60 } },
      {
        kind: 'repeat',
        count: 2,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 20, zone: 'Z4', target: { powerPercentFtp: 98, cadenceRpm: 90 } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 5, zone: 'Z1', target: { powerPercentFtp: 45 } },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    status: 'planned',
  },
  {
    id: 'bike-vo2max-5x4',
    title: "5 x 4' VO2max",
    discipline: 'V',
    zone: 'Z5',
    durationMin: 65,
    location: 'home_trainer',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2', target: { powerPercentFtp: 60 } },
      {
        kind: 'repeat',
        count: 5,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 4, zone: 'Z5', target: { powerPercentFtp: 112, cadenceRpm: 95 } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 4, zone: 'Z1', target: { powerPercentFtp: 45 } },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    status: 'planned',
  },
  {
    id: 'bike-sweet-spot-3x15',
    title: "3 x 15' sweet spot",
    discipline: 'V',
    zone: 'Z3',
    durationMin: 85,
    location: 'home_trainer',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2', target: { powerPercentFtp: 60 } },
      {
        kind: 'repeat',
        count: 3,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 15, zone: 'Z3', target: { powerPercentFtp: 88, cadenceRpm: 90 } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 5, zone: 'Z2', target: { powerPercentFtp: 60 } },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    status: 'planned',
  },
  {
    id: 'bike-recuperation-home-trainer',
    title: 'Récupération active',
    discipline: 'V',
    zone: 'Z1',
    durationMin: 40,
    location: 'home_trainer',
    blocks: [
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 40, zone: 'Z1', target: { powerPercentFtp: 50, cadenceRpm: 95 } },
    ],
    status: 'planned',
  },
  {
    id: 'bike-cotes-force-6x5',
    title: 'Côtes force 6 x 5',
    discipline: 'V',
    zone: 'Z4',
    durationMin: 79,
    location: 'road',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2', target: { powerPercentFtp: 60 } },
      {
        kind: 'repeat',
        count: 6,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 5, zone: 'Z4', target: { powerPercentFtp: 95, cadenceRpm: 65 } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 4, zone: 'Z1', target: { powerPercentFtp: 45 } },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    status: 'planned',
  },
  {
    id: 'bike-test-ftp-20min',
    title: 'Test FTP 20 minutes',
    discipline: 'V',
    zone: 'Z5',
    durationMin: 55,
    location: 'home_trainer',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2', target: { powerPercentFtp: 60 } },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 5, zone: 'Z4', target: { powerPercentFtp: 92, cadenceRpm: 90 } },
      { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 5, zone: 'Z1', target: { powerPercentFtp: 45 } },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 20, zone: 'Z5' },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    why: {
      level: 'solid',
      text: 'Protocole de test FTP standard sur 20 minutes.',
      sourceRef: 'Allen & Coggan, Training and Racing with a Power Meter, 3e éd. (2019)',
    },
    status: 'planned',
  },
  // Jambe velo d'un enchainement velo -> course : bloc Z2 puis accelerations pour preparer la
  // transition (pas de retour au calme : la course enchaine directement).
  {
    id: 'bike-brick-accel-finish',
    title: 'Home-trainer avec accélérations finales',
    discipline: 'V',
    zone: 'Z2',
    isBrick: true,
    durationMin: 67,
    location: 'home_trainer',
    blocks: [
      { kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 10, zone: 'Z1', target: { powerPercentFtp: 50 } },
      { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 40, zone: 'Z2', target: { powerPercentFtp: 70, cadenceRpm: 85 } },
      {
        kind: 'repeat',
        count: 4,
        steps: [
          { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1, zone: 'Z4', target: { powerPercentFtp: 95, cadenceRpm: 95 } },
          { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z2', target: { powerPercentFtp: 65 } },
        ],
      },
      { kind: 'segment', phase: 'cooldown', effort: 'recovery', durationMin: 5, zone: 'Z1', target: { powerPercentFtp: 50 } },
    ],
    why: {
      level: 'moderate',
      text: 'Accélérations en fin de séance pour préparer les jambes à la transition course.',
    },
    status: 'planned',
  },
]

// --- Repos / renfort (ecrites a la main) ----------------------------------------------------

const restWorkouts: Workout[] = [
  {
    id: 'repos-marche-recuperation',
    title: 'Marche de récupération',
    discipline: 'R',
    zone: null,
    durationMin: 30,
    location: 'outdoor',
    blocks: [{ kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 30 }],
    status: 'planned',
  },
  {
    id: 'repos-renforcement-musculaire',
    title: 'Renforcement musculaire',
    discipline: 'R',
    zone: null,
    durationMin: 45,
    blocks: [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 45 }],
    status: 'planned',
  },
  {
    id: 'repos-mobilite-etirements',
    title: 'Mobilité et étirements',
    discipline: 'R',
    zone: null,
    durationMin: 20,
    blocks: [{ kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 20 }],
    status: 'planned',
  },
]

export const SEED_WORKOUTS: Workout[] = [...runWorkouts, ...swimWorkouts, ...bikeWorkouts, ...restWorkouts]
