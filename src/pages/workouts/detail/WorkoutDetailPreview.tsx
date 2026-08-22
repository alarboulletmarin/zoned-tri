import { useParams } from 'react-router-dom'
import { demoAthleteProfile, demoBikeWorkout, demoRunWorkout, demoSwimWorkout } from '../../../domain/demoData'
import type { AthleteProfile, Workout } from '../../../domain/types'
import { WorkoutDetailView } from './WorkoutDetailScreen'

/**
 * Atelier d'aperçu — **développement uniquement**, monté par `App` derrière `import.meta.env.DEV`.
 * Il n'existe dans aucune navigation et ne survit pas au build.
 *
 * Raison d'être : la fiche de séance a trois compositions que le canevas dessine séparément (05
 * natation, 28 vélo, 29 course), et une quatrième — l'encart « sans capteur de puissance » de 28 —
 * qui ne s'atteint qu'avec un profil SANS FTP mesurée. Les rejoindre par l'application demanderait
 * de générer un plan, puis d'effacer une référence du profil. La recette a besoin d'une adresse
 * stable pour comparer chaque artboard au pixel.
 *
 * Les fixtures viennent de `demoData.ts`, qui reprend les valeurs des artboards.
 */
export const PREVIEW_STATES = ['05', '28', '28-sans-capteur', '29'] as const
export type PreviewState = (typeof PREVIEW_STATES)[number]

/** Le fil d'Ariane que chaque artboard écrit au-dessus de sa fiche. */
const PREVIEW: Record<PreviewState, { workout: Workout; trail: string[]; profile: AthleteProfile }> = {
  '05': {
    workout: demoSwimWorkout,
    trail: ['Plan', "Aujourd'hui", 'Séance'],
    profile: demoAthleteProfile,
  },
  '28': {
    workout: demoBikeWorkout,
    trail: ['Plan', 'Semaine', 'Séance'],
    profile: demoAthleteProfile,
  },
  // Même séance, profil sans FTP : les cibles retombent en % de FTP et l'encart jaune apparaît.
  '28-sans-capteur': {
    workout: demoBikeWorkout,
    trail: ['Plan', 'Semaine', 'Séance'],
    profile: { ...demoAthleteProfile, ftp: undefined },
  },
  '29': {
    workout: demoRunWorkout,
    trail: ['Plan', 'Semaine', 'Séance'],
    profile: demoAthleteProfile,
  },
}

function isPreviewState(value: string | undefined): value is PreviewState {
  return PREVIEW_STATES.includes(value as PreviewState)
}

export function WorkoutDetailPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  const { workout, trail, profile } = PREVIEW[state]
  return <WorkoutDetailView workout={workout} trail={trail} profile={profile} onBack={() => {}} />
}
