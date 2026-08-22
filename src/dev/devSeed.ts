/**
 * Amorçage de la base — **développement uniquement**.
 *
 * L'artboard 01b pose une règle produit : « on n'affiche pas de faux plan ». Elle tient, et cet
 * amorçage ne l'entame pas — `import.meta.env.DEV` le retire du build, et il n'écrit rien si la
 * base porte déjà quoi que ce soit. Il n'existe que pour la reprise écran par écran : sans plan
 * actif, `/plan` renvoie à l'ouverture (cf. `PlanRoute`), `/plan/macro` aussi, et la moitié des
 * écrans du canevas est simplement inatteignable.
 *
 * Rien n'est inventé ici. Le plan vient du **vrai générateur** (`generatePlan`) nourri du vrai
 * catalogue (`SEED_WORKOUTS`) et du profil de démonstration : ce sont les mêmes 18 semaines que
 * produirait le générateur en six étapes. Seules les dates sont calées sur aujourd'hui, pour
 * retrouver la situation que le canevas dessine — « Semaine 07 / 18 », course dans 12 semaines.
 */

import { generatePlan } from '../domain/planGenerator/generatePlan'
import { addDays, mondayOf } from '../domain/planGenerator/dates'
import { createInitialForm } from '../domain/planGenerator/form'
import { SEED_WORKOUTS } from '../domain/seedWorkouts'
import { todayIso } from '../domain/planWeek'
import {
  demoAthleteProfile,
  demoJournalEntries,
  demoPastRace,
  demoPreparationRaces,
  demoRace,
} from '../domain/demoData'
import type { PlanJournalEntry, Race, TrainingPlan, Workout } from '../domain/types'
import * as repo from '../storage/repository'

/** Semaine du plan dans laquelle « aujourd'hui » doit tomber — « Semaine 07 / 18 » du canevas 02. */
const CURRENT_WEEK_NUMBER = 7

/** Durée totale du plan, celle de `demoPlan` et de l'artboard 04. */
const PLAN_WEEKS = 18

const DEMO_PLAN_ID = 'demo-plan-70-3-vichy'

export interface DemoDataset {
  plan: TrainingPlan
  workouts: Workout[]
  races: Race[]
  journal: PlanJournalEntry[]
}

/**
 * Construit le jeu de démonstration à partir de `today`.
 *
 * Le générateur fait toujours démarrer un plan au lundi du jour où il tourne. Pour qu'aujourd'hui
 * tombe en semaine 7 et non en semaine 1, on le fait donc tourner « six semaines plus tôt » : la
 * date de course reste à 12 semaines d'ici, ce qui donne bien 18 semaines au total.
 */
export function buildDemoDataset(today: string = todayIso()): DemoDataset {
  const generatedOn = addDays(mondayOf(today), -(CURRENT_WEEK_NUMBER - 1) * 7)
  const raceDate = addDays(generatedOn, PLAN_WEEKS * 7 - 1)

  const form = {
    ...createInitialForm(demoAthleteProfile, generatedOn),
    raceName: demoRace.name,
    raceDate,
    // Le déplacement pro de `demoPlan` — il donne à la vue macro et au journal une semaine
    // allégée à montrer, et à l'écran 02c son état « semaine bloquée ».
    constraints: {
      ...createInitialForm(demoAthleteProfile, generatedOn).constraints,
      openWater: true,
      timeTrialBike: true,
      blockedWeeks: [
        { weekNumber: 4, reason: 'Déplacement pro : volume réduit, pas de longue sortie' },
      ],
    },
  }

  const generated = generatePlan(form, generatedOn, SEED_WORKOUTS, { idPrefix: DEMO_PLAN_ID })

  const plan: TrainingPlan = {
    ...generated.plan,
    id: DEMO_PLAN_ID,
    raceId: demoRace.id,
    status: 'active',
  }

  // Les courses de préparation et la course passée gardent leur écart au jour J : le canevas 27
  // les montre « dont 1 passée », il faut donc qu'elles restent respectivement à venir et derrière.
  const races: Race[] = [
    { ...demoRace, date: raceDate },
    ...demoPreparationRaces.map((race) => ({
      ...race,
      date: shiftedFrom(demoRace.date, race.date, raceDate),
    })),
    { ...demoPastRace, date: shiftedFrom(demoRace.date, demoPastRace.date, raceDate) },
  ]

  const journal = demoJournalEntries.map((entry) => ({ ...entry, planId: plan.id }))

  return { plan, workouts: generated.workouts, races, journal }
}

/** Conserve l'écart en jours entre une course et la course objectif, une fois celle-ci recalée. */
function shiftedFrom(originalGoalDate: string, date: string, newGoalDate: string): string {
  const delta = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${originalGoalDate}T00:00:00Z`)) / 86_400_000,
  )
  return addDays(newGoalDate, delta)
}

/**
 * Écrit le jeu de démonstration **si et seulement si** la base est vide de plans, de courses et de
 * profil. Un plan généré par l'utilisateur, ou une base déjà amorcée, n'est jamais écrasé.
 *
 * Renvoie `true` si quelque chose a été écrit — l'appelant recharge alors le contexte.
 */
export async function seedIfEmpty(today: string = todayIso()): Promise<boolean> {
  const [plans, races, profile] = await Promise.all([
    repo.getAllPlans(),
    repo.getAllRaces(),
    repo.getProfile(),
  ])
  if (plans.length > 0 || races.length > 0 || profile) return false

  const dataset = buildDemoDataset(today)

  await repo.putProfile(demoAthleteProfile)
  await repo.putWorkouts(dataset.workouts)
  for (const race of dataset.races) await repo.putRace(race)
  await repo.putPlan(dataset.plan)
  for (const entry of dataset.journal) await repo.putJournalEntry(entry)

  return true
}
