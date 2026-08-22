import { useLocation, useParams } from 'react-router-dom'
import { useGoBack } from '../../../hooks/useGoBack'

/** La bibliothèque : parent de toute fiche de séance, quelle que soit l'origine du clic. */
const WORKOUTS_PATH = '/workouts'
import { AppHeader } from '../../../components/ui/AppHeader/AppHeader'
import { useProfile, useWorkouts } from '../../../context/AppDataContext'
import { SEED_WORKOUTS } from '../../../domain/seedWorkouts'
import type { AthleteProfile, Workout } from '../../../domain/types'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { WorkoutDetailContent } from './WorkoutDetailContent'
import styles from './WorkoutDetailScreen.module.css'
import { NotFoundScreen } from '../../system/NotFoundScreen'

interface DetailLocationState {
  /** Écran d'origine, pour le segment du milieu (« Aujourd'hui » ou « Semaine »). */
  from?: string
}

/**
 * Fil d'Ariane des artboards : « Plan / Semaine / … » (28 l. 3055, 29 l. 3116). Le segment du
 * milieu nomme l'écran d'où l'on vient — c'est ce que dit la légende de 05, « depuis Aujourd'hui
 * ou Semaine → appui sur une séance ».
 *
 * L'origine n'est connue que si l'appelant la passe en `state`. À défaut, on ne l'invente pas : on
 * s'en tient à ce qui est certain, l'onglet propriétaire de la séance — le Plan quand elle est une
 * instance enregistrée du plan, les Séances quand elle vient du catalogue.
 *
 * Deux corrections par rapport au canevas, et elles se tiennent :
 *
 * - **Le dernier segment est le titre de la séance**, pas le mot « Séance ». Le canevas écrit le
 *   mot générique parce qu'un artboard ne connaît pas ses données ; l'application les a. Un fil
 *   qui finit par « Séance » ne nomme pas la page — il nomme son gabarit.
 * - **Un segment ne se répète pas.** « Aujourd'hui » passait `from: 'Plan'` sur une séance du
 *   plan : le fil rendu était « Plan / Plan / Séance ». Et depuis la bibliothèque, « Séances » et
 *   « Bibliothèque » sont deux noms du même écran, donc deux liens vers `/workouts`.
 */
function buildTrail(fromCatalogue: boolean, from: string | undefined, title: string): string[] {
  const root = fromCatalogue ? 'Séances' : 'Plan'
  const isOwnRoot = from === root || (fromCatalogue && from === 'Bibliothèque')
  const middle = from && !isOwnRoot ? [from] : []
  return [root, ...middle, title]
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
      <AppHeader variant="detail" trail={trail} onBack={onBack} />
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
  const location = useLocation()
  // Une fiche de séance est ce qu'on partage le plus volontiers : ouverte par un lien collé, elle
  // n'a rien derrière elle. Le retour remonte alors à la bibliothèque, jamais hors du produit.
  const goBack = useGoBack(WORKOUTS_PATH)
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
    // L'écran 18 est écrit exactement pour ce cas — « lien partagé vers une séance supprimée ·
    // toujours une sortie » : il nomme l'adresse, propose les séances qui s'en rapprochent et
    // donne deux issues. Rendre à sa place une phrase nue était le seul endroit du produit où un
    // lien mort ne menait nulle part.
    return <NotFoundScreen />
  }

  const trail = buildTrail(
    stored === undefined,
    (location.state as DetailLocationState | null)?.from,
    workout.title,
  )

  return (
    <WorkoutDetailView
      workout={workout}
      trail={trail}
      profile={profile ?? undefined}
      onBack={goBack}
    />
  )
}
