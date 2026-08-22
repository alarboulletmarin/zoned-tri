import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGoBack } from '../../hooks/useGoBack'
import { useWorkouts } from '../../context/AppDataContext'
import { OPENING_PATH, sectionForPath } from '../../navigation'
import { LOCATION_LABELS, formatDurationMin, zoneToNumber } from '../../domain/workoutFormat'
import type { Workout } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { DisciplineTag, ZoneTag, type ZoneNumber } from '../../components/ui/Badge/Badge'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { nearestWorkouts } from './nearestWorkouts'
import styles from './NotFoundScreen.module.css'

const WORKOUTS_PATH = '/workouts'
const PLAN_PATH = '/plan'

export interface NotFoundScreenProps {
  /** Injecté par l'atelier d'aperçu et les tests ; par défaut l'adresse courante. */
  pathname?: string
  /** Injecté par l'atelier d'aperçu et les tests ; par défaut le catalogue enregistré. */
  catalogue?: Workout[]
}

/**
 * Écran 18 · Adresse introuvable — « lien partagé vers une séance supprimée · toujours une sortie ».
 *
 * L'écran ne s'excuse pas : il dit ce que l'adresse visait, propose ce qui s'en rapproche, rassure
 * sur ce qui n'a pas été touché, et donne deux sorties. Le mot d'ordre de la ligne grise du canevas
 * est là : **toujours une sortie**. Aucun cul-de-sac, jamais.
 *
 * LIMITATIONS assumées :
 * — l'artboard date le retrait (« retirée de la bibliothèque en juin 2026 »). Rien ne l'enregistre :
 *   une séance absente est absente, sans journal de retrait. La phrase garde sa structure et perd
 *   la date ;
 * — l'artboard qualifie ses deux rapprochements (« remplace la v2 », « même intention »). Aucun
 *   lien de succession n'existe dans le modèle : la ligne de contexte se limite à ce que la séance
 *   porte vraiment (durée, lieu).
 */
export function NotFoundScreen({ pathname, catalogue }: NotFoundScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { workouts } = useWorkouts()

  const address = pathname ?? location.pathname
  const resolved = catalogue ?? workouts
  const nearest = useMemo(() => nearestWorkouts(resolved, address), [resolved, address])

  // Le canevas écrit « Séances / Introuvable » parce que son adresse visait une séance. Quand
  // l'adresse appartient visiblement à une autre section, le fil dit celle-là : il doit décrire
  // le chemin réellement emprunté, pas celui de l'artboard.
  const section = sectionForPath(address)

  // Une adresse introuvable arrive presque toujours par un lien collé : il n'y a donc rien
  // derrière, et le carré de retour ferait sortir du produit. Il remonte à la section quand
  // l'adresse en désigne une, à l'ouverture sinon — jamais hors de l'application.
  const goBack = useGoBack(section?.to ?? OPENING_PATH)

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={section ? [section.label, 'Introuvable'] : ['Introuvable']}
        onBack={goBack}
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <span className={styles.errorTag}>Erreur 404</span>
          <StackedTitle className={styles.title} lines={['Cette', 'séance', 'n’existe', 'plus']} />
          <p className={styles.lead}>
            Le lien pointe vers <span className={styles.address}>{address}</span>, qui ne correspond à
            rien dans la bibliothèque. Rien n’a été supprimé de ton côté.
          </p>
        </div>

        <section className={styles.nearest}>
          <h2 className={styles.label}>Ce qui s’en rapproche le plus</h2>
          {nearest.length > 0 ? (
            <div className={styles.nearestList}>
              {nearest.map((workout) => (
                <button
                  key={workout.id}
                  type="button"
                  className={styles.nearestRow}
                  onClick={() => navigate(`${WORKOUTS_PATH}/${workout.id}`)}
                >
                  {workout.zone ? (
                    <ZoneTag zone={zoneToNumber(workout.zone) as ZoneNumber} size="sm" />
                  ) : (
                    <DisciplineTag discipline={workout.discipline} size="sm" />
                  )}
                  <span className={styles.nearestBody}>
                    <span className={styles.nearestTitle}>{workout.title}</span>
                    <span className={styles.nearestMeta}>{nearestMeta(workout)}</span>
                  </span>
                  <span className={styles.nearestArrow} aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* Un vide se nomme : sans mot reconnaissable dans l'adresse, aucun rapprochement n'est
               honnête, et l'écran le dit plutôt que de proposer les deux premières venues. */
            <EmptyState
              className={styles.nearestEmpty}
              sentence="Aucun mot de cette adresse ne se retrouve dans un titre de la bibliothèque : il n’y a rien d’honnête à te proposer ici."
            />
          )}
        </section>

        <NoteBox tone="hypothesis" className={styles.planNote} title="Si tu es arrivé là depuis ton plan">
          Une séance retirée du catalogue reste dans les plans qui l’utilisaient : elle n’est jamais
          effacée d’un plan déjà accepté.
        </NoteBox>

        <div className={styles.footer}>
          <PrimaryAction
            tone="ink-shadow"
            className={styles.libraryAction}
            onClick={() => navigate(WORKOUTS_PATH)}
          >
            Ouvrir la bibliothèque
          </PrimaryAction>
          <SecondaryAction shape="link" className={styles.planLink} onClick={() => navigate(PLAN_PATH)}>
            Revenir à mon plan
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}

/** `55 min · bassin 25 m` — la durée, puis le lieu quand la séance en porte un. Rien de plus. */
function nearestMeta(workout: Workout): string {
  const parts = [formatDurationMin(workout.durationMin)]
  if (workout.location) parts.push(LOCATION_LABELS[workout.location].toLowerCase())
  return parts.join(' · ')
}
