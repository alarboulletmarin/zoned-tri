import { findCurrentWeek } from './planWeek'
import { SEED_WORKOUTS } from './seedWorkouts'
import type { Race, TrainingPlan } from './types'

export interface MenuCountsInput {
  plans: TrainingPlan[]
  races: Race[]
  /** Jour de référence au format ISO (`YYYY-MM-DD`), pour situer la semaine courante du plan. */
  today: string
}

/**
 * Compteur de la section Outils. Le canevas S1 affiche « 12 », mais l'écran Outils n'existe pas
 * encore : aucune donnée réelle ne peut alimenter ce chiffre, il reste donc celui du canevas.
 */
const TOOLS_PLACEHOLDER_COUNT = '12'

/** Aucun plan actif : le menu ne peut pas annoncer de semaine, il dit ce qui manque. */
const NO_PLAN_COUNT = 'aucun plan'

/**
 * Compteurs affichés à droite des 4 sections du menu (écran S1), indexés par chemin de section.
 * Chaque compteur compte ce que sa section montre vraiment : Séances annonce la taille du
 * catalogue affiché par la bibliothèque, Plan et Courses lisent l'appareil. Seul Outils, dont
 * l'écran n'existe pas, garde le chiffre du canevas.
 */
export function buildMenuCounts({ plans, races, today }: MenuCountsInput): Record<string, string> {
  return {
    '/plan': planWeekCount(plans, today),
    '/workouts': String(SEED_WORKOUTS.length),
    '/races': String(races.length),
    '/tools': TOOLS_PLACEHOLDER_COUNT,
  }
}

/** « sem. 07 » — numéro de la semaine courante du plan actif, sur deux chiffres comme le canevas. */
function planWeekCount(plans: TrainingPlan[], today: string): string {
  const activePlan = plans.find((plan) => plan.status === 'active')
  if (!activePlan) return NO_PLAN_COUNT
  const week = findCurrentWeek(activePlan, today)
  if (!week) return NO_PLAN_COUNT
  return `sem. ${String(week.weekNumber).padStart(2, '0')}`
}
