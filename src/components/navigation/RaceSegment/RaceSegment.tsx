import { NavLink } from 'react-router-dom'
import { racePath, type RaceSubScreen } from '../../../pages/races/routes'
import styles from '../segment.module.css'

/** Les quatre écrans d'une course, dans l'ordre où on les consulte le jour J. */
const LEVELS: { id: RaceSubScreen; label: string }[] = [
  { id: 'pacing', label: 'Pacing' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'jour-j', label: 'Jour J' },
  { id: 'checklist', label: 'Checklist' },
]

export interface RaceSegmentProps {
  raceId: string
  /** Écran affiché : il ne se lie pas à lui-même. */
  current: RaceSubScreen
  className?: string
}

/**
 * Segment PACING · NUTRITION · JOUR J · CHECKLIST, en tête des quatre sous-écrans d'une course.
 *
 * Ils n'avaient aucune navigation entre eux : il fallait remonter à la fiche à chaque fois, alors
 * qu'on les consulte ensemble — on lit son pacing, on vérifie ses glucides, on repasse la timeline.
 * C'est le même geste que le segment JOUR · SEMAINE · MOIS · SAISON du Plan, et donc la même forme :
 * une bande pleine largeur, quatre cellules de 44 px séparées d'un filet, l'écran courant en aplat
 * d'encre. Le CSS est littéralement le même fichier — un seul dessin, deux usages.
 */
export function RaceSegment({ raceId, current, className }: RaceSegmentProps) {
  return (
    <nav className={`${styles.segment} ${className ?? ''}`} aria-label="Écrans de la course">
      {LEVELS.map((level) =>
        level.id === current ? (
          <span key={level.id} className={`${styles.cell} ${styles.cellCurrent}`} aria-current="page">
            {level.label}
          </span>
        ) : (
          <NavLink key={level.id} to={racePath(raceId, level.id)} className={styles.cell}>
            {level.label}
          </NavLink>
        ),
      )}
    </nav>
  )
}
