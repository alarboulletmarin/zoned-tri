import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../../components/ui/AppHeader/AppHeader'
import { useProfile, useWorkouts } from '../../../context/AppDataContext'
import { SEED_WORKOUTS } from '../../../domain/seedWorkouts'
import type { AthleteProfile, Workout } from '../../../domain/types'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { WorkoutDetailContent } from './WorkoutDetailContent'
import styles from './WorkoutDetailScreen.module.css'

/** Segment courant du fil d'Ariane — le canevas y écrit le mot « Séance », jamais le titre de la séance. */
const CURRENT_TRAIL_SEGMENT = 'Séance'

interface DetailLocationState {
  /** Écran d'origine, pour le segment du milieu (« Aujourd'hui » ou « Semaine »). */
  from?: string
}

/**
 * Fil d'Ariane des artboards : « Plan / Aujourd'hui / Séance » (05 l. 563), « Plan / Semaine /
 * Séance » (28 l. 3055, 29 l. 3116). Le segment du milieu nomme l'écran d'où l'on vient — c'est ce
 * que dit la légende de 05, « depuis Aujourd'hui ou Semaine → appui sur une séance ».
 *
 * L'origine n'est connue que si l'appelant la passe en `state`. À défaut, on ne l'invente pas : on
 * s'en tient à ce qui est certain, l'onglet propriétaire de la séance — le Plan quand elle est une
 * instance enregistrée du plan, les Séances quand elle vient du catalogue.
 */
function buildTrail(fromCatalogue: boolean, from: string | undefined): string[] {
  const root = fromCatalogue ? 'Séances' : 'Plan'
  return from ? [root, from, CURRENT_TRAIL_SEGMENT] : [root, CURRENT_TRAIL_SEGMENT]
}

export interface WorkoutDetailViewProps {
  workout: Workout
  trail: string[]
  profile?: AthleteProfile
  onBack: () => void
}

/**
 * La fiche complète : le bandeau unique de 46 px et la fiche elle-même. Partagée par la route et
 * par l'atelier d'aperçu, pour que ce qui se mesure soit exactement ce qui se livre.
 *
 * **Une seule composition, à toutes les largeurs.** Le canevas ne donne AUCUN artboard large à la
 * fiche de séance : le README §5 la liste « `05` et suivants + `06` », sans écran `S`. Le seul
 * artboard qui la montre en large est le panneau de 440 px de S5, à droite de la bibliothèque — et
 * c'est `WorkoutsScreen` qui le rend. Ici, la largeur ne sert donc pas à ajouter une colonne : elle
 * borne la colonne (méthode §7, « le desktop n'est pas un mobile étiré »).
 */
export function WorkoutDetailView({ workout, trail, profile, onBack }: WorkoutDetailViewProps) {
  const breakpoint = useBreakpoint()

  return (
    <>
      <AppHeader variant="detail" trail={trail} desktopTitle={workout.title} onBack={onBack} />
      <div className={breakpoint === 'mobile' ? styles.column : styles.columnBounded}>
        <WorkoutDetailContent workout={workout} profile={profile} />
      </div>
    </>
  )
}

/**
 * Route `/workouts/:id` — fiche de séance autonome (artboards 05 natation, 28 vélo, 29 course, et
 * le repli sans artboard pour la discipline R).
 */
export function WorkoutDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { workouts, loading } = useWorkouts()
  const { profile } = useProfile()

  // Les séances d'un plan généré sont des instances propres au plan, enregistrées en base : elles
  // priment sur le gabarit de bibliothèque, dont elles portent le contenu mais pas l'identifiant.
  const stored = workouts.find((w) => w.id === id)
  const workout: Workout | undefined = stored ?? SEED_WORKOUTS.find((w) => w.id === id)

  if (!workout) {
    // Tant que la base n'est pas lue, l'absence n'est pas prouvée : on ne dit pas « introuvable »
    // à la place d'un identifiant qui pourrait appartenir à un plan généré.
    if (loading) return null
    return (
      <>
        <AppHeader variant="detail" trail={['Séances', 'Introuvable']} onBack={() => navigate(-1)} />
        <div className={styles.notFound}>
          <p>Séance introuvable.</p>
        </div>
      </>
    )
  }

  const trail = buildTrail(stored === undefined, (location.state as DetailLocationState | null)?.from)

  return (
    <WorkoutDetailView
      workout={workout}
      trail={trail}
      profile={profile ?? undefined}
      onBack={() => navigate(-1)}
    />
  )
}
