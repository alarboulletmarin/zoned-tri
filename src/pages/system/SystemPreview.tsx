import { useParams } from 'react-router-dom'
import { demoAthleteProfile, demoPlan, demoRaces, demoWorkouts } from '../../domain/demoData'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { CURRENT_SCHEMA_VERSION } from '../../domain/types'
import { validateBackupFile } from '../../storage/validation'
import { ImportRefusedScreen } from './ImportRefusedScreen'
import type { ImportRefusal } from './importRefusal'
import { LanguageScreen } from './LanguageScreen'
import { NotFoundScreen } from './NotFoundScreen'
import { OfflineScreen } from './OfflineScreen'
import { SettingsScreen } from './SettingsScreen'

/**
 * Atelier d'aperçu — **développement uniquement**, monté par `App` derrière `import.meta.env.DEV`.
 * Il n'existe pas dans l'application livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : trois des cinq états système ne s'atteignent que par accident (une adresse
 * morte, un fichier corrompu) et le quatrième n'a aucun point d'entrée dans le canevas. Les
 * mesurer à la main est impossible ; l'atelier les pose côte à côte, avec de vraies données.
 *
 * Modèle : `src/pages/plan/TodayPreview.tsx`.
 */
export const PREVIEW_STATES = ['S2', 'S3', '17', '18', '19'] as const
export type SystemPreviewState = (typeof PREVIEW_STATES)[number]

function isPreviewState(value: string | undefined): value is SystemPreviewState {
  return PREVIEW_STATES.includes(value as SystemPreviewState)
}

/** L'adresse de l'artboard 18, mot pour mot — deux de ses mots existent dans le catalogue. */
const DEAD_LINK = '/seance/8f2c-pyramide-css-v2'

/**
 * Un vrai refus, produit par le vrai validateur. Trois fautes délibérées, choisies pour couvrir les
 * trois formes que l'artboard 19 énumère : un champ mal typé, une entité incomplète, une version
 * de schéma dépassée.
 */
function buildRefusal(): ImportRefusal {
  const broken = {
    schemaVersion: CURRENT_SCHEMA_VERSION - 0.4,
    profile: { ...demoAthleteProfile, ftp: { watts: '248 W', measuredAt: '2026-08-03' } },
    plans: [demoPlan],
    workoutsDone: [{ ...demoWorkouts[0], discipline: undefined }],
    races: demoRaces,
    journal: [],
  }

  const result = validateBackupFile(broken)
  return {
    fileName: 'zonedtri-sauvegarde-2025-11-02.json',
    fileSizeBytes: 1_468_006,
    errors: result.ok ? [] : result.errors,
  }
}

export function SystemPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  if (state === 'S2') return <SettingsScreen />
  if (state === 'S3') return <LanguageScreen workoutCount={312} />
  if (state === '17') return <OfflineScreen workoutCount={312} hasActivePlan />
  if (state === '18') return <NotFoundScreen pathname={DEAD_LINK} catalogue={SEED_WORKOUTS} />

  // Les données de démonstration alimentent « Ce qui n'a pas bougé » : c'est le bloc dont
  // l'artboard 19 tire toute sa force, et il n'a rien à dire d'une base vide.
  return (
    <ImportRefusedScreen
      refusal={buildRefusal()}
      onPickAnotherFile={() => {}}
      today="2026-06-16"
      plans={[demoPlan]}
      workouts={demoWorkouts}
      races={demoRaces}
      profile={demoAthleteProfile}
    />
  )
}
