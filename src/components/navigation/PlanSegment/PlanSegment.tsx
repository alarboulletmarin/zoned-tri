import { NavLink } from 'react-router-dom'
import { PLAN_MACRO_PATH, PLAN_MONTH_PATH, PLAN_PATH, WEEK_PATH } from '../../../navigation'
import styles from './PlanSegment.module.css'

/** Les quatre niveaux de zoom du plan, dans l'ordre du canevas. */
export type PlanZoomLevel = 'jour' | 'semaine' | 'mois' | 'saison'

interface Level {
  id: PlanZoomLevel
  label: string
  to: string
}

const LEVELS: Level[] = [
  { id: 'jour', label: 'Jour', to: PLAN_PATH },
  { id: 'semaine', label: 'Semaine', to: WEEK_PATH },
  { id: 'mois', label: 'Mois', to: PLAN_MONTH_PATH },
  { id: 'saison', label: 'Saison', to: PLAN_MACRO_PATH },
]

export interface PlanSegmentProps {
  /** Niveau affiché par l'écran qui rend le segment — il ne se lie pas à lui-même. */
  current: PlanZoomLevel
  className?: string
}

/**
 * Segment JOUR · SEMAINE · MOIS · SAISON, en tête de tous les écrans de la section Plan
 * (artboards 02, 02a/b/c, 03, 04m, 04).
 *
 * Le canevas en fait la deuxième des trois entrées permanentes de son « Plan de navigation », et
 * dit à quoi il sert : il « remplace l'ancien geste implicite — appuyer sur le titre de la
 * semaine ». Avant lui, la vue macro ne s'atteignait qu'en appuyant sur « Semaine 07 » depuis la
 * Semaine, et le Mois n'existait pas : deux niveaux de zoom que rien n'annonçait.
 *
 * Écart assumé sur le canevas : il dessine les cellules à 40 px de haut, sous les 44 px que la
 * méthode exige d'une cible tactile. Ce sont quatre cibles côte à côte sur toute la largeur —
 * exactement le cas où la hauteur compte. Elles font donc 44 px, et rien d'autre ne bouge.
 */
export function PlanSegment({ current, className }: PlanSegmentProps) {
  return (
    <nav className={`${styles.segment} ${className ?? ''}`} aria-label="Niveau de zoom du plan">
      {LEVELS.map((level) =>
        level.id === current ? (
          <span key={level.id} className={`${styles.cell} ${styles.cellCurrent}`} aria-current="page">
            {level.label}
          </span>
        ) : (
          <NavLink key={level.id} to={level.to} className={styles.cell}>
            {level.label}
          </NavLink>
        ),
      )}
    </nav>
  )
}
