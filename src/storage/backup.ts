import { getDb, PROFILE_KEY, STORE_NAMES } from './db'
import { validateBackupFile, type ValidationError } from './validation'
import { CURRENT_SCHEMA_VERSION, type BackupFile } from '../domain/types'
import * as repo from './repository'

export type ImportResult = { ok: true } | { ok: false; errors: ValidationError[] }

/**
 * Import tout-ou-rien : la structure entiere du fichier est validee avant
 * la moindre ecriture. Si la validation echoue, rien n'est touche en base.
 * Une fois validee, l'ecriture se fait dans une transaction IndexedDB unique
 * (clear + put de chaque entite) : soit tout est ecrit, soit rien ne l'est.
 */
export async function importBackup(file: unknown): Promise<ImportResult> {
  const validation = validateBackupFile(file)
  if (!validation.ok) return { ok: false, errors: validation.errors }

  const backup = validation.data
  const db = await getDb()
  const tx = db.transaction(STORE_NAMES, 'readwrite')

  await Promise.all(STORE_NAMES.map((storeName) => tx.objectStore(storeName).clear()))

  await Promise.all([
    tx.objectStore('profile').put(backup.profile, PROFILE_KEY),
    ...backup.plans.map((plan) => tx.objectStore('plans').put(plan)),
    ...backup.workoutsDone.map((workout) => tx.objectStore('workouts').put(workout)),
    ...backup.races.map((race) => tx.objectStore('races').put(race)),
    ...backup.journal.map((entry) => tx.objectStore('journal').put(entry)),
  ])

  await tx.done

  return { ok: true }
}

export async function exportBackup(): Promise<BackupFile> {
  const profile = await repo.getProfile()
  if (!profile) {
    throw new Error(
      "Aucun profil enregistre : impossible de generer une sauvegarde avant la fin de l'onboarding.",
    )
  }

  const [plans, workoutsDone, races, journal] = await Promise.all([
    repo.getAllPlans(),
    repo.getAllWorkouts(),
    repo.getAllRaces(),
    repo.getAllJournalEntries(),
  ])

  return { schemaVersion: CURRENT_SCHEMA_VERSION, profile, plans, workoutsDone, races, journal }
}
