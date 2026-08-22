import { useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { usePlans, useRaces } from '../../context/AppDataContext'
import { findCurrentWeek, todayIso } from '../../domain/planWeek'
import type { Race, TrainingPlan } from '../../domain/types'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { RaceChecklistScreen } from './RaceChecklistScreen'
import { RaceDayScreen } from './RaceDayScreen'
import { RaceNutritionScreen } from './RaceNutritionScreen'
import { RacePacingScreen } from './RacePacingScreen'
import { RaceSheetScreen } from './RaceSheetScreen'
import { RacesDesktopScreen } from './RacesDesktopScreen'
import { RacesListScreen, type PlanPosition } from './RacesListScreen'
import s from './RaceScreens.module.css'
import { MissingScreen } from '../../components/MissingScreen'
import { GENERATOR_PATH } from '../../navigation'
import { NEW_RACE_PATH } from './routes'
import { PageLoading } from '../../components/PageLoading'

/** Plan actif qui vise cette course — c'est lui qui donne « semaine 07 / 18 » et l'affûtage. */
function planForRace(plans: TrainingPlan[], raceId: string | undefined): TrainingPlan | undefined {
  return plans.find((plan) => plan.status === 'active' && plan.raceId === raceId)
}

function planPosition(plan: TrainingPlan | undefined, today: string): PlanPosition | undefined {
  if (!plan) return undefined
  const week = findCurrentWeek(plan, today) ?? plan.weeks[0]
  if (!week) return undefined
  return { weekNumber: week.weekNumber, weeksCount: plan.weeksCount }
}

function taperWeeks(plan: TrainingPlan | undefined): number | undefined {
  return plan?.phases.find((phase) => phase.name === 'Taper')?.weeksCount
}

/**
 * Route `/races` — la racine de la section. Trois formes, selon ce qu'il y a à montrer :
 *
 * - desktop (≥ 1024 px) : l'artboard S7, calendrier et fiche côte à côte ;
 * - mobile et tablette, plusieurs courses : l'artboard 27, « Mes courses » ;
 * - mobile et tablette, une seule course : l'artboard 08 directement — une liste d'un seul élément
 *   ferait perdre un appui pour rien, et 08 se décrit lui-même comme la racine « onglet Courses ».
 *
 * Le canevas ne donne pas de mise en page tablette à la section : la tablette suit donc le mobile.
 */
export function RacesRoute() {
  const breakpoint = useBreakpoint()
  const { races, loading } = useRaces()
  const { plans } = usePlans()
  const today = todayIso()

  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="root" label="Courses" />

  // La section s'ouvrait sur un cadre pointillé et RIEN d'autre : pas un lien, pas un bouton.
  // C'était le cul-de-sac le plus simple du produit — un vide qui se nomme mais ne se remplit pas.
  if (races.length === 0) {
    return (
      <MissingScreen
        trail={['Courses']}
        headline={['Aucune', 'course']}
        sentence="C’est une course objectif qui donne au plan sa date de fin et son affûtage. Tu peux en enregistrer une seule, et générer le plan plus tard."
        exits={[
          { label: 'Enregistrer une course', to: NEW_RACE_PATH, primary: true },
          { label: 'Générer un plan', to: GENERATOR_PATH },
        ]}
      />
    )
  }

  if (breakpoint === 'desktop') {
    const goalId = races.find((race) => race.role === 'primary_goal' && race.date >= today)?.id
    return (
      <RacesDesktopScreen races={races} today={today} taperWeeks={taperWeeks(planForRace(plans, goalId))} />
    )
  }

  if (races.length === 1) {
    return <RaceSheetScreen race={races[0]} today={today} variant="root" />
  }

  const goal = races.find((race) => race.role === 'primary_goal' && race.date >= today)
  return (
    <RacesListScreen
      races={races}
      today={today}
      planPosition={planPosition(planForRace(plans, goal?.id), today)}
    />
  )
}

/** Écran d'une course introuvable — jamais un blanc muet, jamais un cul-de-sac. */
function RaceNotFound() {
  const navigate = useNavigate()
  return (
    <div className={s.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', 'Introuvable']}
        onBack={() => navigate('/races')}
      />
      <div className={s.column}>
        <div className={s.emptyBlock}>
          <EmptyState
            headline="Introuvable"
            sentence="Cette course n’existe plus sur cet appareil : elle a été supprimée, ou son lien vient d’une autre sauvegarde."
          />
        </div>
      </div>
    </div>
  )
}

/** Charge la course de l'URL, ou dit qu'elle n'existe pas. Partagé par les cinq écrans de détail. */
function useRaceOfRoute(): { race: Race | undefined; loading: boolean } {
  const { id } = useParams<{ id: string }>()
  const { races, loading } = useRaces()
  return { race: races.find((race) => race.id === id), loading }
}

export function RaceSheetRoute() {
  const { race, loading } = useRaceOfRoute()
  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="root" label="Courses" />
  if (!race) return <RaceNotFound />
  return <RaceSheetScreen race={race} today={todayIso()} variant="detail" />
}

export function RacePacingRoute() {
  const { race, loading } = useRaceOfRoute()
  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="root" label="Courses" />
  if (!race) return <RaceNotFound />
  return <RacePacingScreen race={race} />
}

export function RaceNutritionRoute() {
  const { race, loading } = useRaceOfRoute()
  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="root" label="Courses" />
  if (!race) return <RaceNotFound />
  return <RaceNutritionScreen race={race} />
}

export function RaceDayRoute() {
  const { race, loading } = useRaceOfRoute()
  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="root" label="Courses" />
  if (!race) return <RaceNotFound />
  return <RaceDayScreen race={race} />
}

export function RaceChecklistRoute() {
  const { race, loading } = useRaceOfRoute()
  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="root" label="Courses" />
  if (!race) return <RaceNotFound />
  return <RaceChecklistScreen race={race} />
}
