import { useParams } from 'react-router-dom'
import { demoAthleteProfile, demoPlan, demoWorkouts } from '../../domain/demoData'
import { alignWeekToWeekOf, todayIso } from '../../domain/planWeek'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import type { AthleteProfile, TrainingPlan, Workout } from '../../domain/types'
import { CalculatorScreen } from './CalculatorScreen'
import { CalculatorsScreen } from './CalculatorsScreen'
import { ImportExportScreen } from './ImportExportScreen'
import { ToolsScreen } from './ToolsScreen'

/**
 * Atelier d'aperçu — **développement uniquement**, monté derrière `import.meta.env.DEV`. Il
 * n'existe pas dans l'application livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : les écrans Outils ont des états qui tiennent à des données que le produit ne
 * fabrique pas à la demande — un profil sans FC max (colonne de l'artboard S8), un plan qui porte
 * un test de référence à venir, un profil totalement vide. Les atteindre à la main demanderait de
 * générer un plan puis d'attendre le bon jour.
 */
const PREVIEW_STATES = [
  '12', // racine Outils, profil complet
  '12-vide', // racine Outils, aucun profil enregistré
  '13', // fiche du calculateur 04/12 · bassin → eau libre
  '13-liste', // la liste des douze
  '14', // import / export · sources
  'S8', // desktop : le même écran racine, à ouvrir en 1280 px
  'S8-sans-fc', // desktop : profil sans FC max mesurée (« le tiret veut dire pas de donnée »)
] as const

type PreviewState = (typeof PREVIEW_STATES)[number]

function isPreviewState(value: string | undefined): value is PreviewState {
  return PREVIEW_STATES.includes(value as PreviewState)
}

/** `AthleteProfile.maxHeartRateBpm` est obligatoire : `0` est le seul « jamais mesurée » possible. */
const PROFILE_WITHOUT_HEART_RATE: AthleteProfile = { ...demoAthleteProfile, maxHeartRateBpm: 0 }

/**
 * Plan de démonstration recalé sur la semaine en cours, auquel on ajoute le test FTP de la
 * bibliothèque le jeudi — le jour que `demoPlan` laisse à un repos. C'est ce qui rend visible
 * « Prochain test au plan » de l'artboard S8 sans toucher aux fixtures partagées.
 */
const FTP_TEST_ID = 'bike-test-ftp-20min'

function previewPlan(today: string): TrainingPlan {
  const week = alignWeekToWeekOf(demoPlan.weeks[0], today)
  return {
    ...demoPlan,
    weeks: [
      {
        ...week,
        days: week.days.map((day, index) =>
          index === 4 ? { ...day, workoutIds: [FTP_TEST_ID] } : day,
        ),
      },
    ],
  }
}

function previewWorkouts(): Workout[] {
  const test = SEED_WORKOUTS.find((workout) => workout.id === FTP_TEST_ID)
  return test ? [...demoWorkouts, test] : demoWorkouts
}

export function ToolsPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  const today = todayIso()
  const plans = [previewPlan(today)]
  const catalogue = previewWorkouts()

  if (state === '13') return <CalculatorScreen id="bassin-eau-libre" profile={demoAthleteProfile} />
  if (state === '13-liste') return <CalculatorsScreen profile={demoAthleteProfile} />
  if (state === '14') return <ImportExportScreen />

  const profile =
    state === '12-vide' ? undefined : state === 'S8-sans-fc' ? PROFILE_WITHOUT_HEART_RATE : demoAthleteProfile

  return <ToolsScreen profile={profile} plans={plans} catalogue={catalogue} today={today} />
}
