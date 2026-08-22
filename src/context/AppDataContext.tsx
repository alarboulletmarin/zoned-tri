import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AthleteProfile, PlanJournalEntry, Race, TrainingPlan, Workout } from '../domain/types'
import * as repo from '../storage/repository'

interface AppDataState {
  profile: AthleteProfile | undefined
  plans: TrainingPlan[]
  workouts: Workout[]
  races: Race[]
  journal: PlanJournalEntry[]
  loading: boolean
}

interface AppDataActions {
  saveProfile: (profile: AthleteProfile) => Promise<void>
  savePlan: (plan: TrainingPlan) => Promise<void>
  /** Enregistre un plan généré et les séances qu'il référence, en un seul rechargement. */
  savePlanWithWorkouts: (plan: TrainingPlan, workouts: Workout[]) => Promise<void>
  deletePlan: (id: string) => Promise<void>
  saveWorkout: (workout: Workout) => Promise<void>
  deleteWorkout: (id: string) => Promise<void>
  saveRace: (race: Race) => Promise<void>
  deleteRace: (id: string) => Promise<void>
  addJournalEntry: (entry: PlanJournalEntry) => Promise<void>
  undoJournalEntry: (id: string) => Promise<void>
  reload: () => Promise<void>
}

type AppDataContextValue = AppDataState & AppDataActions

const AppDataContext = createContext<AppDataContextValue | null>(null)

const initialState: AppDataState = {
  profile: undefined,
  plans: [],
  workouts: [],
  races: [],
  journal: [],
  loading: true,
}

export interface AppDataProviderProps {
  children: ReactNode
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  const [state, setState] = useState<AppDataState>(initialState)

  const reload = useCallback(async () => {
    const [profile, plans, workouts, races, journal] = await Promise.all([
      repo.getProfile(),
      repo.getAllPlans(),
      repo.getAllWorkouts(),
      repo.getAllRaces(),
      repo.getAllJournalEntries(),
    ])
    setState({ profile, plans, workouts, races, journal, loading: false })
  }, [])

  useEffect(() => {
    // Amorçage de démonstration, développement uniquement : l'import dynamique sous
    // `import.meta.env.DEV` laisse le bundler retirer entièrement `devSeed` du build. La base
    // n'est amorcée que si elle est vide (cf. `seedIfEmpty`), jamais écrasée.
    async function boot() {
      // `MODE !== 'test'` : sous Vitest, `DEV` vaut aussi vrai, et amorcer la base fausserait
      // chaque test qui monte le fournisseur — ils posent leurs propres fixtures.
      if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        const { seedIfEmpty } = await import('../dev/devSeed')
        await seedIfEmpty()
      }
      await reload()
    }
    void boot()
  }, [reload])

  const saveProfile = useCallback(
    async (profile: AthleteProfile) => {
      await repo.putProfile(profile)
      await reload()
    },
    [reload],
  )

  const savePlan = useCallback(
    async (plan: TrainingPlan) => {
      await repo.putPlan(plan)
      await reload()
    },
    [reload],
  )

  /**
   * Les séances d'abord, le plan ensuite : le plan ne référence jamais un identifiant qui ne
   * serait pas déjà en base, même si l'écriture s'interrompt entre les deux.
   */
  const savePlanWithWorkouts = useCallback(
    async (plan: TrainingPlan, workouts: Workout[]) => {
      await repo.putWorkouts(workouts)
      await repo.putPlan(plan)
      await reload()
    },
    [reload],
  )

  const deletePlan = useCallback(
    async (id: string) => {
      await repo.deletePlan(id)
      await reload()
    },
    [reload],
  )

  const saveWorkout = useCallback(
    async (workout: Workout) => {
      await repo.putWorkout(workout)
      await reload()
    },
    [reload],
  )

  const deleteWorkout = useCallback(
    async (id: string) => {
      await repo.deleteWorkout(id)
      await reload()
    },
    [reload],
  )

  const saveRace = useCallback(
    async (race: Race) => {
      await repo.putRace(race)
      await reload()
    },
    [reload],
  )

  const deleteRace = useCallback(
    async (id: string) => {
      await repo.deleteRace(id)
      await reload()
    },
    [reload],
  )

  const addJournalEntry = useCallback(
    async (entry: PlanJournalEntry) => {
      await repo.putJournalEntry(entry)
      await reload()
    },
    [reload],
  )

  const undoJournalEntry = useCallback(
    async (id: string) => {
      const entry = await repo.getJournalEntry(id)
      if (!entry) return
      await repo.putJournalEntry({ ...entry, undone: true })
      await reload()
    },
    [reload],
  )

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...state,
      saveProfile,
      savePlan,
      savePlanWithWorkouts,
      deletePlan,
      saveWorkout,
      deleteWorkout,
      saveRace,
      deleteRace,
      addJournalEntry,
      undoJournalEntry,
      reload,
    }),
    [
      state,
      saveProfile,
      savePlan,
      savePlanWithWorkouts,
      deletePlan,
      saveWorkout,
      deleteWorkout,
      saveRace,
      deleteRace,
      addJournalEntry,
      undoJournalEntry,
      reload,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used within an AppDataProvider')
  return context
}

export function useProfile() {
  const { profile, saveProfile, loading } = useAppData()
  return { profile, saveProfile, loading }
}

export function usePlans() {
  const { plans, savePlan, savePlanWithWorkouts, deletePlan, loading } = useAppData()
  return { plans, savePlan, savePlanWithWorkouts, deletePlan, loading }
}

export function useWorkouts() {
  const { workouts, saveWorkout, deleteWorkout, loading } = useAppData()
  return { workouts, saveWorkout, deleteWorkout, loading }
}

export function useRaces() {
  const { races, saveRace, deleteRace, loading } = useAppData()
  return { races, saveRace, deleteRace, loading }
}

export function useJournal() {
  const { journal, addJournalEntry, undoJournalEntry, loading } = useAppData()
  return { journal, addJournalEntry, undoJournalEntry, loading }
}
