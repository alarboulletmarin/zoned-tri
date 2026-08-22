import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useJournal, usePlans, useProfile, useRaces, useWorkouts } from '../../context/AppDataContext'
import { OPENING_PATH } from '../../navigation'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { todayIso } from '../../domain/planWeek'
import { settingJournalEntry, type AppliedPlan } from '../../domain/planSettings'
import type { PlanSettingKey, PlanSettingScope, TrainingPlan } from '../../domain/types'
import { UndoToast } from '../../components/ui/UndoToast/UndoToast'
import { PlanSettingsScreen } from './PlanSettingsScreen'
import { PlanSettingChangeScreen } from './PlanSettingChangeScreen'
// Ré-exportés pour ne casser aucun import existant : la source est le module d'adresses.
export { PLAN_JOURNAL_PATH, PLAN_SETTINGS_PATH } from './planSettingsRoutes'
import { PLAN_JOURNAL_PATH, PLAN_SETTINGS_PATH } from './planSettingsRoutes'
import { PlanJournalScreen } from './PlanJournalScreen'


/** Les quatre réglages que l'écran 38 sait rejouer. Format et date repassent par le générateur. */
const REOPENABLE: PlanSettingKey[] = ['volume', 'days', 'gear', 'reduced_weeks']

function isReopenable(value: string | undefined): value is PlanSettingKey {
  return REOPENABLE.includes(value as PlanSettingKey)
}

/** Ce qu'il faut garder pour revenir à l'état exact d'avant pendant les 6 s du bandeau. */
interface UndoState {
  message: string
  previousPlan: TrainingPlan
  journalEntryId: string
}

/** Ce que l'écran 38 dépose dans l'état de navigation en revenant aux réglages. */
interface SettingsLocationState {
  undo?: UndoState
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * `/plan/reglages` — écran 37, et le bandeau d'annulation de 6 s qui suit une écriture.
 *
 * Le bandeau vit ICI et non sur l'écran 38 : l'écriture rend la main aux réglages, et c'est de là
 * qu'on doit pouvoir revenir en arrière sans avoir rien à chercher. Il porte le plan d'avant en
 * mémoire — c'est la seule annulation que l'application sait tenir réellement (cf. écran 39).
 */
export function PlanSettingsRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { plans, savePlan, loading } = usePlans()
  const { races } = useRaces()
  const { undoJournalEntry } = useJournal()

  // L'état de navigation n'est lu QU'UNE fois : sans ça, un retour arrière du navigateur ferait
  // réapparaître un bandeau d'annulation pour un changement déjà réglé.
  const [undo, setUndo] = useState<UndoState | null>(
    () => (location.state as SettingsLocationState | null)?.undo ?? null,
  )

  useEffect(() => {
    if ((location.state as SettingsLocationState | null)?.undo) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const activePlan = plans.find((plan) => plan.status === 'active')
  const race = activePlan?.raceId ? races.find((item) => item.id === activePlan.raceId) : undefined

  const applyUndo = useCallback(async () => {
    if (!undo) return
    await savePlan(undo.previousPlan)
    await undoJournalEntry(undo.journalEntryId)
    setUndo(null)
  }, [undo, savePlan, undoJournalEntry])

  if (loading) return null
  // Sans plan actif il n'y a aucun réglage à rouvrir : l'ouverture est l'écran qui sait le dire.
  if (!activePlan) return <Navigate to={OPENING_PATH} replace />

  return (
    <>
      <PlanSettingsScreen
        plan={activePlan}
        race={race}
        onBack={() => navigate('/plan')}
        onOpenSetting={(key) => navigate(`${PLAN_SETTINGS_PATH}/${key}`)}
        onOpenJournal={() => navigate(PLAN_JOURNAL_PATH)}
        onRegenerate={() => navigate('/generate-plan')}
      />
      {undo && (
        <UndoToast
          message={undo.message}
          onUndo={() => void applyUndo()}
          onExpire={() => setUndo(null)}
        />
      )}
    </>
  )
}

/**
 * `/plan/reglages/:setting` — écran 38.
 *
 * L'écriture se fait ici, en un seul geste : le plan, ses séances et l'entrée de journal partent
 * ensemble. On revient ensuite aux réglages, où le bandeau de 6 s attend.
 */
export function PlanSettingChangeRoute() {
  const navigate = useNavigate()
  const { setting } = useParams<{ setting: string }>()
  const { plans, savePlanWithWorkouts, loading } = usePlans()
  const { workouts } = useWorkouts()
  const { races } = useRaces()
  const { profile } = useProfile()
  const { addJournalEntry } = useJournal()

  const today = useMemo(() => todayIso(), [])
  const catalogue = useMemo(() => [...SEED_WORKOUTS], [])

  const activePlan = plans.find((plan) => plan.status === 'active')
  const race = activePlan?.raceId ? races.find((item) => item.id === activePlan.raceId) : undefined

  const planWorkouts = useMemo(() => {
    if (!activePlan) return []
    const ids = new Set(activePlan.weeks.flatMap((week) => week.days.flatMap((day) => day.workoutIds)))
    return workouts.filter((workout) => ids.has(workout.id))
  }, [activePlan, workouts])

  const onApply = useCallback(
    async (applied: AppliedPlan, before: string, after: string, scope: PlanSettingScope) => {
      if (!activePlan || !isReopenable(setting)) return
      const entry = settingJournalEntry({
        id: newId('journal'),
        planId: activePlan.id,
        at: new Date().toISOString(),
        key: setting,
        before,
        after,
        scope,
        rewrittenWeeks: applied.rewrittenWeeks,
      })
      await savePlanWithWorkouts(applied.plan, applied.workouts)
      await addJournalEntry(entry)
      navigate(PLAN_SETTINGS_PATH, {
        state: {
          undo: {
            message: entry.description,
            previousPlan: activePlan,
            journalEntryId: entry.id,
          },
        },
      })
    },
    [activePlan, setting, savePlanWithWorkouts, addJournalEntry, navigate],
  )

  if (loading) return null
  if (!activePlan) return <Navigate to={OPENING_PATH} replace />
  // Un réglage inconnu ou non rejouable ne s'ouvre pas en avant / après : retour aux réglages,
  // qui portent l'explication sur la ligne concernée.
  if (!isReopenable(setting)) return <Navigate to={PLAN_SETTINGS_PATH} replace />

  return (
    <PlanSettingChangeScreen
      plan={activePlan}
      workouts={planWorkouts}
      catalogue={catalogue}
      setting={setting}
      race={race}
      profile={profile}
      today={today}
      onBack={() => navigate(PLAN_SETTINGS_PATH)}
      onApply={(applied, before, after, scope) => void onApply(applied, before, after, scope)}
    />
  )
}

/** `/plan/journal` — écran 39. */
export function PlanJournalRoute() {
  const navigate = useNavigate()
  const { plans, loading } = usePlans()
  const { journal } = useJournal()

  const activePlan = plans.find((plan) => plan.status === 'active')
  const entries = useMemo(
    () => (activePlan ? journal.filter((entry) => entry.planId === activePlan.id) : []),
    [journal, activePlan],
  )

  if (loading) return null
  if (!activePlan) return <Navigate to={OPENING_PATH} replace />

  return <PlanJournalScreen entries={entries} onBack={() => navigate(PLAN_SETTINGS_PATH)} />
}
