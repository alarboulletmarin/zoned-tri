import { getDb, PROFILE_KEY, type ZonedTriDB } from './db'
import type { AthleteProfile, PlanJournalEntry, Race, TrainingPlan, Workout } from '../domain/types'

async function getAll<Store extends 'plans' | 'workouts' | 'races' | 'journal'>(
  store: Store,
): Promise<ZonedTriDB[Store]['value'][]> {
  const db = await getDb()
  return db.getAll(store)
}

async function getOne<Store extends 'plans' | 'workouts' | 'races' | 'journal'>(
  store: Store,
  id: string,
): Promise<ZonedTriDB[Store]['value'] | undefined> {
  const db = await getDb()
  return db.get(store, id)
}

async function putOne<Store extends 'plans' | 'workouts' | 'races' | 'journal'>(
  store: Store,
  value: ZonedTriDB[Store]['value'],
): Promise<void> {
  const db = await getDb()
  await db.put(store, value)
}

async function deleteOne<Store extends 'plans' | 'workouts' | 'races'>(
  store: Store,
  id: string,
): Promise<void> {
  const db = await getDb()
  await db.delete(store, id)
}

// --- Profil (singleton) --------------------------------------------------

export async function getProfile(): Promise<AthleteProfile | undefined> {
  const db = await getDb()
  return db.get('profile', PROFILE_KEY)
}

export async function putProfile(profile: AthleteProfile): Promise<void> {
  const db = await getDb()
  await db.put('profile', profile, PROFILE_KEY)
}

// --- Plans ----------------------------------------------------------------

export const getAllPlans = (): Promise<TrainingPlan[]> => getAll('plans')
export const getPlan = (id: string): Promise<TrainingPlan | undefined> => getOne('plans', id)
export const putPlan = (plan: TrainingPlan): Promise<void> => putOne('plans', plan)
export const deletePlan = (id: string): Promise<void> => deleteOne('plans', id)

// --- Seances (workouts) -----------------------------------------------------

export const getAllWorkouts = (): Promise<Workout[]> => getAll('workouts')
export const getWorkout = (id: string): Promise<Workout | undefined> => getOne('workouts', id)
export const putWorkout = (workout: Workout): Promise<void> => putOne('workouts', workout)
export const deleteWorkout = (id: string): Promise<void> => deleteOne('workouts', id)

/**
 * Ecrit un lot de seances en une seule transaction.
 *
 * La generation d'un plan produit une centaine de seances d'un coup : les ecrire une par une
 * ouvrirait autant de transactions et laisserait la base a moitie remplie en cas d'echec au
 * milieu. Meme garantie tout-ou-rien que l'import (cf. `backup.ts`).
 */
export async function putWorkouts(workouts: Workout[]): Promise<void> {
  if (workouts.length === 0) return
  const db = await getDb()
  const tx = db.transaction('workouts', 'readwrite')
  await Promise.all([...workouts.map((workout) => tx.store.put(workout)), tx.done])
}

// --- Courses ----------------------------------------------------------------

export const getAllRaces = (): Promise<Race[]> => getAll('races')
export const getRace = (id: string): Promise<Race | undefined> => getOne('races', id)
export const putRace = (race: Race): Promise<void> => putOne('races', race)
export const deleteRace = (id: string): Promise<void> => deleteOne('races', id)

// --- Journal du plan ------------------------------------------------------
// Jamais de suppression physique : une entree annulee est re-ecrite avec undone=true.

export const getAllJournalEntries = (): Promise<PlanJournalEntry[]> => getAll('journal')
export const getJournalEntry = (id: string): Promise<PlanJournalEntry | undefined> => getOne('journal', id)
export const putJournalEntry = (entry: PlanJournalEntry): Promise<void> => putOne('journal', entry)
