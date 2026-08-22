import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePlans, useProfile, useRaces, useWorkouts } from '../../context/AppDataContext'
import { demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { alignWeekToWeekOf, buildWeekDays, findCurrentWeek, todayIso } from '../../domain/planWeek'
import type { IcsDay } from '../../domain/exports/icsFile'
import type { TrainingPlan, Workout } from '../../domain/types'
import { PLAN_PATH, WORKOUTS_PATH } from '../../navigation'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useGoBack } from '../../hooks/useGoBack'
import { EXPORTS_PATH, EXPORTS_PRINT_PATH } from './exportsRoutes'
import { exportTrail } from '../../domain/exports/exportSheet'
import { ExportSheet } from './ExportSheet'
import { PrintDocument } from './PrintDocument'
import { SessionCardScreen } from './SessionCardScreen'
import { PageLoading } from '../../components/PageLoading'
import { MissingScreen } from '../../components/MissingScreen'

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
  const closeSheet = useGoBack(PLAN_PATH)
  const [search] = useSearchParams()
  const { plans, loading } = usePlans()
  const catalogue = useCatalogue()
  const today = todayIso()

  const plan = plans.find((candidate) => candidate.status === 'active') ?? demoPlanFor(today)

  // `?semaine=N` — la Semaine et la Saison exportent la semaine REGARDÉE, pas celle du calendrier.
  // Une valeur qui ne désigne aucune semaine du plan est ignorée : on retombe sur la semaine en
  // cours plutôt que sur un export vide, et l'écran ne prétend rien exporter d'autre.
  const requested = Number(search.get('semaine'))
  const week =
    (Number.isInteger(requested) ? plan.weeks.find((item) => item.weekNumber === requested) : undefined) ??
    findCurrentWeek(plan, today)

  const days: IcsDay[] = useMemo(
    () =>
      week
        ? buildWeekDays(week, catalogue, today).map((day) => ({ date: day.date, workouts: day.workouts }))
        : [],
    [week, catalogue, today],
  )

  // La feuille est une route comme une autre : son onglet porte son nom, pas celui du produit.
  // Elle ne rend pas d'`AppHeader` — c'est une feuille, pas un écran — donc elle titre elle-même.
  useDocumentTitle(exportTrail(week?.weekNumber ?? 1))

  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="detail" trail={['Plan', 'Exporter']} />

  // `?seance=id` — la fiche de séance vise SA séance. À défaut, celle du jour : c'est ce que
  // l'écran Aujourd'hui exporte, et c'est la seule que la feuille peut nommer sans rien inventer.
  const requestedId = search.get('seance')
  const workout =
    (requestedId ? catalogue.find((candidate) => candidate.id === requestedId) : undefined) ??
    days.find((day) => day.date === today)?.workouts[0]

  return (
    <ExportSheet
      isOpen
      onClose={closeSheet}
      weekNumber={week?.weekNumber ?? 1}
      days={days}
      workout={workout}
      onPrint={() => navigate(EXPORTS_PRINT_PATH)}
    />
  )
}

/**
 * Artboards 21 + 22 · le document A4, prêt pour le « Enregistrer au format PDF » du navigateur.
 *
 * Le bandeau est rendu À CÔTÉ du document, jamais dedans : la règle `@media print` de
 * `printSheets.module.css` masque tout ce qui n'est pas `.document`, le chrome n'entre donc pas
 * dans le fichier. Sans lui, cet écran n'avait aucune sortie — ni retour, ni fil, ni menu — et
 * on n'en revenait qu'avec le bouton du navigateur.
 */
export function PrintDocumentRoute() {
  const navigate = useNavigate()
  const { plans, loading } = usePlans()
  const { profile } = useProfile()
  const { races } = useRaces()
  const catalogue = useCatalogue()
  const today = todayIso()

  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="detail" trail={['Plan', 'Exporter', 'Document A4']} />

  const activePlan = plans.find((plan) => plan.status === 'active')
  const plan = activePlan ?? demoPlanFor(today)
  const race = activePlan
    ? races.find((candidate) => candidate.id === activePlan.raceId)
    : demoRace

  return (
    <>
      <AppHeader
        variant="detail"
        trail={['Plan', 'Exporter', 'Document A4']}
        onBack={() => navigate(EXPORTS_PATH)}
        desktopActions={<span>{'Enregistrer au format PDF depuis l’impression du navigateur'}</span>}
      />
      <PrintDocument plan={plan} catalogue={catalogue} profile={profile} race={race} today={today} />
    </>
  )
}

/**
 * Artboard 23 · la carte de séance et son écriture en PNG 1080.
 *
 * Le PNG s'écrit depuis un `<canvas>`, pas depuis le DOM : le bandeau ne peut donc pas entrer
 * dans le fichier. Cet écran n'avait aucun lien, aucun retour et aucun menu — c'était le
 * cul-de-sac le plus complet du produit.
 */
export function SessionCardRoute() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { loading } = useWorkouts()
  const catalogue = useCatalogue()

  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="detail" trail={['Séances', 'Carte .PNG']} />

  const workout = catalogue.find((candidate) => candidate.id === id)
  // Une adresse de carte qui ne désigne aucune séance — un lien partagé après un import, un plan
  // archivé, une faute de frappe — renvoyait à l'ouverture sans un mot : on ne pouvait pas savoir
  // si l'application avait planté ou si la séance n'existait plus. L'écran s'ouvre donc, vide.
  if (!workout)
    return (
      <MissingScreen
        trail={['Séances', 'Carte .PNG']}
        headline={['Séance', 'introuvable']}
        sentence={
          <>
            Cette carte vise la séance <code>{id}</code>, qui n’est pas sur cet appareil. Les
            identifiants d’un plan généré ne survivent pas à sa suppression : une carte partagée
            après coup ne retrouve donc plus sa séance.
          </>
        }
        exits={[
          { label: 'Parcourir la bibliothèque', to: WORKOUTS_PATH, primary: true },
          { label: 'Revenir au plan', to: PLAN_PATH },
        ]}
        backTo={WORKOUTS_PATH}
      />
    )

  return (
    <>
      <AppHeader
        variant="detail"
        trail={['Séances', { label: workout.title, to: `/workouts/${workout.id}` }, 'Carte .PNG']}
        onBack={() => navigate(`/workouts/${workout.id}`)}
      />
      <SessionCardScreen workout={workout} />
    </>
  )
}
