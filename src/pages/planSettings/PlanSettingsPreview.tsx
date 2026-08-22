import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { demoAthleteProfile, demoJournalEntries, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { alignWeekToWeekOf, todayIso } from '../../domain/planWeek'
import type { PlanJournalEntry, TrainingPlan } from '../../domain/types'
import { PlanSettingsScreen } from './PlanSettingsScreen'
import { PlanSettingChangeScreen } from './PlanSettingChangeScreen'
import { PlanJournalScreen } from './PlanJournalScreen'

/**
 * Atelier d'aperçu des réglages du plan — **développement uniquement**, monté par `App` derrière
 * `import.meta.env.DEV`, comme `TodayPreview`.
 *
 * Raison d'être : les trois écrans supposent un plan actif ENREGISTRÉ, que le produit ne montre
 * jamais tant qu'aucun plan n'a été généré (règle de l'artboard 01b, tenue par `PlanSettingsRoute`).
 * L'aperçu monte le plan de démonstration à la place, recalé sur la semaine en cours pour que la
 * ligne « Semaine 08 » de l'avant / après ait un sens.
 *
 * Quatre états, un par artboard, plus les trois autres réglages rejouables de l'écran 38 :
 * `37` · `38` (volume) · `38-jours` · `38-materiel` · `38-semaines` · `39` · `39-vide`.
 */
const SETTINGS_PREVIEW_STATES = [
  '37',
  '38',
  '38-jours',
  '38-materiel',
  '38-semaines',
  '39',
  '39-vide',
] as const
export type SettingsPreviewState = (typeof SETTINGS_PREVIEW_STATES)[number]

function isPreviewState(value: string | undefined): value is SettingsPreviewState {
  return SETTINGS_PREVIEW_STATES.includes(value as SettingsPreviewState)
}

/** Semaine de démonstration recalée sur la semaine calendaire en cours, comme `PlanWeekRoute`. */
function previewPlan(today: string): TrainingPlan {
  return { ...demoPlan, weeks: demoPlan.weeks.map((week) => alignWeekToWeekOf(week, today)) }
}

/**
 * Le journal du canevas 39 compte quatorze entrées ; le jeu de démonstration en porte deux. On les
 * garde telles quelles — les compléter demanderait d'inventer des changements qui n'ont pas eu
 * lieu, et le compteur de l'écran dit la vérité : « 2 entrées ».
 */
function previewJournal(planId: string): PlanJournalEntry[] {
  return demoJournalEntries.map((entry) => ({ ...entry, planId }))
}

export function PlanSettingsPreview() {
  const { state } = useParams<{ state: string }>()
  const today = useMemo(() => todayIso(), [])
  const plan = useMemo(() => previewPlan(today), [today])
  const catalogue = useMemo(() => [...SEED_WORKOUTS], [])

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {SETTINGS_PREVIEW_STATES.join(' · ')}</p>
  }

  if (state === '37') {
    return (
      <PlanSettingsScreen
        plan={plan}
        race={demoRace}
        onBack={() => undefined}
        onOpenSetting={() => undefined}
        onOpenJournal={() => undefined}
        onRegenerate={() => undefined}
      />
    )
  }

  if (state === '39') {
    return <PlanJournalScreen entries={previewJournal(plan.id)} onBack={() => undefined} />
  }

  if (state === '39-vide') {
    return <PlanJournalScreen entries={[]} onBack={() => undefined} />
  }

  const setting =
    state === '38-jours'
      ? 'days'
      : state === '38-materiel'
        ? 'gear'
        : state === '38-semaines'
          ? 'reduced_weeks'
          : 'volume'

  return (
    <PlanSettingChangeScreen
      plan={plan}
      workouts={demoWorkouts}
      catalogue={catalogue}
      setting={setting}
      race={demoRace}
      profile={demoAthleteProfile}
      today={today}
      onBack={() => undefined}
      onApply={() => undefined}
    />
  )
}
