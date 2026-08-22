import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlans, useProfile, useRaces, useWorkouts } from '../../context/AppDataContext'
import { demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { alignWeekToWeekOf, buildWeekDays, findCurrentWeek, todayIso } from '../../domain/planWeek'
import type { IcsDay } from '../../domain/exports/icsFile'
import type { TrainingPlan, Workout } from '../../domain/types'
import { OPENING_PATH } from '../../navigation'
import { EXPORTS_PRINT_PATH } from './exportsRoutes'
import { ExportSheet } from './ExportSheet'
import { PrintDocument } from './PrintDocument'
import { SessionCardScreen } from './SessionCardScreen'

/**
 * Catalogue de résolution commun aux trois routes. Un plan généré référence ses propres séances
 * (en base), le plan de démonstration le catalogue statique : les deux espaces d'identifiants
 * sont disjoints, on peut les concaténer sans arbitrage — c'est déjà ce que fait `PlanWeekRoute`.
 */
function useCatalogue(): Workout[] {
  const { workouts } = useWorkouts()
  return useMemo(() => [...workouts, ...SEED_WORKOUTS, ...demoWorkouts], [workouts])
}

/** Plan de démonstration recalé sur la semaine calendaire en cours. */
function demoPlanFor(today: string): TrainingPlan {
  return { ...demoPlan, weeks: demoPlan.weeks.map((week) => alignWeekToWeekOf(week, today)) }
}

/**
 * Artboard 20 · la feuille d'export, montée sur son adresse propre. Elle se ferme en revenant
 * d'où l'on vient : c'est une feuille appelée depuis un écran, pas une destination.
 */
export function ExportSheetRoute() {
  const navigate = useNavigate()
  const { plans, loading } = usePlans()
  const catalogue = useCatalogue()
  const today = todayIso()

  const plan = plans.find((candidate) => candidate.status === 'active') ?? demoPlanFor(today)
  const week = findCurrentWeek(plan, today)

  const days: IcsDay[] = useMemo(
    () =>
      week
        ? buildWeekDays(week, catalogue, today).map((day) => ({ date: day.date, workouts: day.workouts }))
        : [],
    [week, catalogue, today],
  )

  if (loading) return null

  const todaysWorkout = days.find((day) => day.date === today)?.workouts[0]

  return (
    <ExportSheet
      isOpen
      onClose={() => navigate(-1)}
      weekNumber={week?.weekNumber ?? 1}
      days={days}
      workout={todaysWorkout}
      onPrint={() => navigate(EXPORTS_PRINT_PATH)}
    />
  )
}

/** Artboards 21 + 22 · le document A4, prêt pour le « Enregistrer au format PDF » du navigateur. */
export function PrintDocumentRoute() {
  const { plans, loading } = usePlans()
  const { profile } = useProfile()
  const { races } = useRaces()
  const catalogue = useCatalogue()
  const today = todayIso()

  if (loading) return null

  const activePlan = plans.find((plan) => plan.status === 'active')
  const plan = activePlan ?? demoPlanFor(today)
  const race = activePlan
    ? races.find((candidate) => candidate.id === activePlan.raceId)
    : demoRace

  return (
    <PrintDocument plan={plan} catalogue={catalogue} profile={profile} race={race} today={today} />
  )
}

/** Artboard 23 · la carte de séance et son écriture en PNG 1080. */
export function SessionCardRoute() {
  const { id } = useParams<{ id: string }>()
  const { loading } = useWorkouts()
  const catalogue = useCatalogue()

  if (loading) return null

  const workout = catalogue.find((candidate) => candidate.id === id)
  // Une carte sans séance n'a rien à montrer : plutôt qu'un vide inutile, on renvoie à
  // l'ouverture, qui sait dire ce qu'il y a sur l'appareil.
  if (!workout) return <Navigate to={OPENING_PATH} replace />

  return <SessionCardScreen workout={workout} />
}
