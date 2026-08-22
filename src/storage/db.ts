import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AthleteProfile, PlanJournalEntry, Race, TrainingPlan, Workout } from '../domain/types'

export const DB_NAME = 'zoned-tri'
export const DB_VERSION = 1
export const PROFILE_KEY = 'singleton'

export interface ZonedTriDB extends DBSchema {
  profile: { key: string; value: AthleteProfile }
  plans: { key: string; value: TrainingPlan }
  workouts: { key: string; value: Workout }
  races: { key: string; value: Race }
  journal: { key: string; value: PlanJournalEntry }
}

export const STORE_NAMES = ['profile', 'plans', 'workouts', 'races', 'journal'] as const

let dbPromise: Promise<IDBPDatabase<ZonedTriDB>> | null = null

export function getDb(): Promise<IDBPDatabase<ZonedTriDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ZonedTriDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('profile')
        db.createObjectStore('plans', { keyPath: 'id' })
        db.createObjectStore('workouts', { keyPath: 'id' })
        db.createObjectStore('races', { keyPath: 'id' })
        db.createObjectStore('journal', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

/** Ferme et oublie la connexion en cours. Utile entre les tests pour repartir d'une base fraiche. */
export async function resetDbConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}

export async function deleteDatabase(): Promise<void> {
  await resetDbConnection()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}
