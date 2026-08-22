import { useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { usePlans, useRaces, useWorkouts } from '../../context/AppDataContext'
import { addDays } from '../../domain/planGenerator/dates'
import { alignWeekToWeekOf, todayIso, weekdayIndex } from '../../domain/planWeek'
import { currentWeekOf } from '../../domain/todayState'
import { demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import { OPENING_PATH, PLAN_PATH } from '../../navigation'
import type { PlanWeek, TrainingPlan } from '../../domain/types'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { PlanMacroScreen } from './PlanMacroScreen'
import { PlanMonthScreen } from './PlanMonthScreen'
import { SemaineScreen } from './SemaineScreen'
import { TodayScreen } from './TodayScreen'

/**
 * `/plan` montre « Aujourd'hui » (mockup 02), pas la semaine : le canevas donne à cet artboard
 * l'en-tête « Plan » et l'annotation « onglet Plan · dès qu'un plan est actif », tandis que la
 * semaine (mockup 03) s'intitule « Plan / Semaine » et s'atteint « depuis Aujourd'hui → voir la
 * semaine ». La section Plan répond donc d'abord à « qu'est-ce que je fais aujourd'hui ».
 *
 * Sans plan actif il n'y a rien à afficher : on renvoie à l'écran d'ouverture, qui est
 * précisément la réponse à « aucun plan sur cet appareil » (mockups 01b/01c) et propose la
 * génération. Aucun écran intermédiaire « générer un plan » n'est inventé ici.
 */
export function PlanRoute() {
  const { plans, loading } = usePlans()

  if (loading) return null

  const activePlan = plans.find((plan) => plan.status === 'active')
  if (!activePlan) return <Navigate to={OPENING_PATH} replace />

  // Aujourd'hui tombe hors des dates du plan (plan terminé, course déjà courue) : l'ouverture
  // est déjà l'écran qui sait le dire, la section Plan n'a rien à ajouter.
  if (!currentWeekOf(activePlan, todayIso())) return <Navigate to={OPENING_PATH} replace />

  return <TodayScreen plan={activePlan} />
}

/**
 * `/plan/semaine` — accès direct à l'écran S6.
 *
 * Sans plan actif en base (appareil neuf, ou plan pas encore généré via `/generate-plan`), on
 * retombe sur le plan de démonstration, dont les dates sont recalées sur la semaine calendaire en
 * cours pour que la colonne « aujourd'hui » ait un sens, et la mention « semaine de démonstration »
 * est affichée dans la légende du pied de page. Dès qu'un plan est généré, c'est lui qui s'affiche.
 */
export function PlanWeekRoute() {
  const { plans, loading } = usePlans()
  const { workouts } = useWorkouts()
  const { races } = useRaces()
  const [search] = useSearchParams()

  // Un plan généré référence ses propres séances (enregistrées en base) ; le plan de
  // démonstration référence le catalogue statique. Les deux espaces d'identifiants sont
  // disjoints, on peut donc les concaténer sans arbitrage.
  const catalogue = useMemo(() => [...workouts, ...SEED_WORKOUTS, ...demoWorkouts], [workouts])

  // Atelier de recette, DÉVELOPPEMENT UNIQUEMENT (cf. `weekPreview`). Il court-circuite le plan
  // enregistré : c'est le seul moyen d'inspecter les deux états mobiles à volonté.
  const previewState = import.meta.env.DEV ? search.get('apercu') : null
  if (isWeekPreviewState(previewState)) {
    const preview = weekPreview(previewState, todayIso())
    return <SemaineScreen plan={preview.plan} races={[demoRace]} today={preview.today} isDemo />
  }

  if (loading) return null

  // `?semaine=N` — le Mois (04m) et, plus tard, les flèches de l'artboard 03 ouvrent une semaine
  // précise. Une valeur non numérique est ignorée : `SemaineScreen` retombe sur la semaine en cours.
  const requested = Number(search.get('semaine'))
  const weekNumber = Number.isInteger(requested) && requested > 0 ? requested : undefined

  const activePlan = plans.find((plan) => plan.status === 'active')
  if (activePlan)
    return (
      <SemaineScreen
        plan={activePlan}
        catalogue={catalogue}
        races={races}
        {...(weekNumber !== undefined ? { weekNumber } : {})}
      />
    )

  const today = todayIso()
  const demoWeek: TrainingPlan = {
    ...demoPlan,
    weeks: demoPlan.weeks.map((week) => alignWeekToWeekOf(week, today)),
  }

  return <SemaineScreen plan={demoWeek} races={[demoRace]} isDemo />
}

/**
 * `/plan/macro` — écran 04, la saison entière.
 *
 * Le canevas l'atteint désormais par le segment SAISON, depuis n'importe quel niveau de zoom, et
 * non plus « depuis Semaine → appui sur « Semaine 07 » ». Le carré de retour suit donc le fil
 * d'Ariane — « Plan / Saison » — et remonte à Aujourd'hui. Sans plan actif il n'y a pas de plan à
 * regarder dans son entier : l'ouverture est l'écran qui sait le dire (même règle que `PlanRoute`).
 */
export function PlanMacroRoute() {
  const navigate = useNavigate()
  const { plans, loading } = usePlans()
  const { races } = useRaces()

  if (loading) return null

  const activePlan = plans.find((plan) => plan.status === 'active')
  if (!activePlan) return <Navigate to={OPENING_PATH} replace />

  const race = activePlan.raceId ? races.find((item) => item.id === activePlan.raceId) : undefined

  return (
    <PlanMacroScreen
      plan={activePlan}
      {...(race ? { race } : {})}
      onBack={() => navigate(PLAN_PATH)}
    />
  )
}

/**
 * `/plan/mois` — écran 04m, le niveau que le canevas a ajouté entre la semaine et la saison.
 *
 * Le mois affiché vit dans l'URL (`?mois=AAAA-MM-JJ`) : les flèches ← → le changent, et le retour
 * du navigateur remonte donc de mois en mois, sans état caché.
 */
export function PlanMonthRoute() {
  const [search, setSearch] = useSearchParams()
  const { plans, loading } = usePlans()
  const { workouts } = useWorkouts()
  const { races } = useRaces()

  const catalogue = useMemo(() => [...workouts, ...SEED_WORKOUTS, ...demoWorkouts], [workouts])

  if (loading) return null

  const activePlan = plans.find((plan) => plan.status === 'active')
  if (!activePlan) return <Navigate to={OPENING_PATH} replace />

  const anchor = search.get('mois') ?? undefined

  return (
    <PlanMonthScreen
      plan={activePlan}
      catalogue={catalogue}
      races={races}
      {...(anchor ? { anchor } : {})}
      onNavigateMonth={(firstDay) => setSearch({ mois: firstDay })}
    />
  )
}

/**
 * Atelier d'aperçu de la Semaine — **développement uniquement**, comme `TodayPreview`. Deux
 * chemins y mènent : la route `/apercu/semaine/:state` (le patron commun à tous les ateliers) et
 * le paramètre `/plan/semaine?apercu=03`, qui rend l'état sans quitter l'écran réel.
 * `import.meta.env.DEV` les garde tous deux : ils ne survivent pas au build.
 *
 * Raison d'être : l'écran Semaine a deux états mobiles que le canevas dessine séparément — une
 * séance par jour (03) et jours doublés (16) — et l'état dépend entièrement des données. La
 * semaine de démonstration porte un jour doublé (samedi) : elle donne donc 16, jamais 03.
 *
 * Aucune séance n'est inventée : `03` déplace simplement l'enchaînement du samedi vers le
 * vendredi, seul jour libre de la semaine, ce qui défait le seul jour doublé.
 */
const WEEK_PREVIEW_STATES = ['03', '16'] as const
type WeekPreviewState = (typeof WEEK_PREVIEW_STATES)[number]

function isWeekPreviewState(value: string | null): value is WeekPreviewState {
  return WEEK_PREVIEW_STATES.includes(value as WeekPreviewState)
}

/** Jour de référence de chaque état : mardi pour 03, samedi (le jour doublé) pour 16. */
const PREVIEW_DAY_INDEX: Record<WeekPreviewState, number> = { '03': 1, '16': 5 }

function weekPreview(state: WeekPreviewState, today: string): { plan: TrainingPlan; today: string } {
  const monday = addDays(today, -weekdayIndex(today))
  const week = alignWeekToWeekOf(demoPlan.weeks[0], today)

  return {
    plan: { ...demoPlan, weeks: [state === '03' ? unstackDoubledDay(week) : week] },
    today: addDays(monday, PREVIEW_DAY_INDEX[state]),
  }
}

/** La deuxième séance du premier jour doublé descend sur le premier jour libre — rien d'ajouté. */
function unstackDoubledDay(week: PlanWeek): PlanWeek {
  const doubled = week.days.findIndex((day) => day.workoutIds.length > 1)
  const free = week.days.findIndex((day) => day.workoutIds.length === 0)
  if (doubled === -1 || free === -1) return week

  const moved = week.days[doubled].workoutIds[week.days[doubled].workoutIds.length - 1]
  return {
    ...week,
    days: week.days.map((day, index) => {
      if (index === doubled) return { ...day, workoutIds: day.workoutIds.slice(0, -1) }
      if (index === free) return { ...day, workoutIds: [moved] }
      return day
    }),
  }
}

/** Route `/apercu/semaine/:state` — même atelier, atteint comme les autres (`03` · `16`). */
export function SemainePreviewRoute() {
  const { state } = useParams<{ state: string }>()
  if (!isWeekPreviewState(state ?? null)) {
    return <p>État inconnu. Attendus : {WEEK_PREVIEW_STATES.join(' · ')}</p>
  }
  const preview = weekPreview(state as WeekPreviewState, todayIso())
  return <SemaineScreen plan={preview.plan} races={[demoRace]} today={preview.today} isDemo />
}
