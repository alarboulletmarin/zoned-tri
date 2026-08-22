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
    /**
     * Amorçage de démonstration. Deux cas, et deux seulement :
     *
     * — le développement, pour qu'un `npm run dev` sur une machine neuve ait du contenu ;
     * — une **build de démonstration** (`VITE_DEMO=1`), celle qu'on déploie pour montrer l'app à
     *   qui n'a pas de plan. Elle s'annonce comme telle (cf. `IS_DEMO_BUILD`), et la build du
     *   produit ne pose pas le drapeau : la règle de l'artboard 01b — « on n'affiche jamais de
     *   faux plan » — reste entière là où elle compte.
     *
     * L'import reste dynamique : sans l'un des deux cas, le bundler retire `devSeed` entièrement.
     * La base n'est amorcée que si elle est vide (cf. `seedIfEmpty`), jamais écrasée.
     */
    async function boot() {
      // `MODE !== 'test'` : sous Vitest, `DEV` vaut aussi vrai, et amorcer la base fausserait
      // chaque test qui monte le fournisseur — ils posent leurs propres fixtures.
      // La condition est écrite EN LIGNE, et non via `IS_DEMO_BUILD` : le bundler ne replie une
      // branche que s'il en voit la constante sur place. Passée par un autre module, elle laissait
      // le chunk `devSeed` dans la build du produit — vérifié, et c'était le cas.
      if (
        (import.meta.env.DEV || import.meta.env.VITE_DEMO === '1') &&
        import.meta.env.MODE !== 'test'
      ) {
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

/**
 * Ce que la COQUILLE a besoin de savoir, et rien de plus : l'appareil porte-t-il déjà quelque
 * chose ?
 *
 * Ce hook ne lève pas hors du fournisseur, contrairement aux cinq autres — c'est délibéré. La
 * coquille est montée par des tests qui n'ont aucune donnée à servir, et surtout elle doit pouvoir
 * se peindre avant que la base ne réponde : elle rendrait sinon un rail qui apparaît après coup.
 * Hors fournisseur, ou avant la première lecture, l'appareil est réputé vide — l'état le plus
 * prudent, celui qui ne promet rien.
 */
export function useDeviceHasContent(): boolean {
  const context = useContext(AppDataContext)
  if (!context) return false
  return context.plans.length > 0 || context.races.length > 0 || context.profile !== undefined
}

/**
 * Ce que la RECHERCHE globale a besoin de lire.
 *
 * Comme `useDeviceHasContent`, ce hook ne lève pas hors du fournisseur : la loupe appartient à la
 * coquille, qui est montée par des tests sans base, et une recherche qui fait planter l'écran
 * plutôt que de rendre zéro course serait un cul-de-sac de plus.
 */
export function useSearchableData(): { races: Race[] } {
  const context = useContext(AppDataContext)
  return { races: context?.races ?? [] }
}
