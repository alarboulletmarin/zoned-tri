import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Workout } from '../../domain/types'
import {
  LOCATION_LABELS,
  formatDurationCompact,
  formatDurationMin,
  formatWorkoutDistance,
  zoneToNumber,
} from '../../domain/workoutFormat'
import { DisciplineTag, ZoneTag } from '../../components/ui/Badge/Badge'
import styles from './WorkoutListRow.module.css'

/**
 * Trois artboards dessinent une ligne de séance, et ils ne dessinent PAS la même :
 *
 * - `library` — 07 l. 999-1004 : jeton de ZONE à gauche, titre 15 px, `55 min · bassin 25 m`.
 *   Aucun jeton de discipline : la bande de répartition au-dessus dit déjà de quoi la liste est
 *   faite, et la liste filtrée ne mélange pas les disciplines.
 * - `search` — 25 l. 2902-2905 : jeton de DISCIPLINE à gauche, titre 14 px, `1 h 05 · Z4 ·
 *   home-trainer`. La recherche traverse les disciplines : c'est elle qu'il faut distinguer, et la
 *   zone redescend dans la ligne de détail.
 * - `master` — S5 l. 1700-1707 : discipline à gauche, ZONE à droite, titre 15 px,
 *   `2 400 m · 55′ · bassin 25 m`. La colonne est large : elle porte les deux jetons et la distance.
 *
 * Ce qu'AUCUN des trois ne porte, et qu'il ne faut donc pas rendre : un carré de couleur de
 * discipline sur chaque ligne, et un jeton « BRICK ». Brick est une étiquette transverse, filtrable
 * dans la feuille 40, jamais une cinquième discipline affichée dans la liste.
 */
export type WorkoutRowVariant = 'library' | 'search' | 'master'

export interface WorkoutListRowProps {
  workout: Workout
  variant?: WorkoutRowVariant
  /** Adresse de la fiche. La ligne EST un lien : elle se copie, s'ouvre dans un onglet, s'annonce. */
  to: string
  /**
   * Ce que fait un clic gauche simple EN PLUS de suivre le lien. Le patron liste + fiche de S5
   * ouvre la fiche dans la colonne de droite sans quitter la liste : la ligne appelle alors
   * `onSelect` et empêche la navigation. Un clic milieu, un Ctrl-clic ou un « ouvrir dans un
   * onglet » ne passent pas par là et suivent le `href` — ce qui est exactement ce qu'on veut.
   */
  onSelect?: () => void
  /** Titre déjà découpé pour porter le surlignage du terme cherché (artboard 25). */
  titleContent?: ReactNode
  /** Ligne sélectionnée du patron liste + fiche (S5) : aplat d'encre bord à bord. */
  isSelected?: boolean
}

/**
 * Détail d'une ligne, par artboard. Le tiret ne remplace jamais une donnée par une invention :
 * il dit « pas de lieu enregistré », et rien d'autre.
 */
function rowMeta(workout: Workout, variant: WorkoutRowVariant): string {
  const place = workout.location ? LOCATION_LABELS[workout.location].toLowerCase() : '—'

  if (variant === 'search') {
    // 25 l. 2903 : `1 h 05 · Z4 · home-trainer` — la zone est DANS le détail, le jeton de gauche
    // portant la discipline.
    return [formatDurationMin(workout.durationMin), workout.zone, place].filter(Boolean).join(' · ')
  }

  if (variant === 'master') {
    // S5 l. 1701 : `2 400 m · 55′ · bassin 25 m`. Sans distance enregistrée, la ligne se réduit —
    // on n'estime pas des mètres à partir d'une durée.
    const distance = workout.distanceM ? formatWorkoutDistance(workout.discipline, workout.distanceM) : null
    return [distance, formatDurationCompact(workout.durationMin), place].filter(Boolean).join(' · ')
  }

  // 07 l. 1000 : `55 min · bassin 25 m`.
  return `${formatDurationMin(workout.durationMin)} · ${place}`
}

/** Un clic que le navigateur traiterait comme « ouvrir ici », par opposition à un nouvel onglet. */
function isPlainLeftClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function WorkoutListRow({
  workout,
  variant = 'library',
  to,
  onSelect,
  titleContent,
  isSelected,
}: WorkoutListRowProps) {
  const zone = workout.zone ? zoneToNumber(workout.zone) : null

  return (
    <Link
      className={[styles.row, styles[variant], isSelected ? styles.rowSelected : ''].filter(Boolean).join(' ')}
      to={to}
      state={{ from: 'Bibliothèque' }}
      aria-current={isSelected ? 'true' : undefined}
      onClick={(event) => {
        if (!onSelect || !isPlainLeftClick(event)) return
        event.preventDefault()
        onSelect()
      }}
    >
      {variant === 'library' ? (
        <span className={styles.badgeSlot}>
          {zone ? (
            <ZoneTag zone={zone} />
          ) : (
            /* Une séance sans zone (repos, renfort) garde sa place dans la colonne des jetons :
               sans elle, les titres de la liste ne s'aligneraient plus. */
            <span className={styles.noZoneBadge} aria-label="Aucune zone enregistrée">
              —
            </span>
          )}
        </span>
      ) : (
        <DisciplineTag discipline={workout.discipline} size={variant === 'master' ? 'md' : 'sm'} />
      )}

      <span className={styles.texts}>
        <span className={styles.title}>{titleContent ?? workout.title}</span>
        <span className={styles.meta}>{rowMeta(workout, variant)}</span>
      </span>

      {variant === 'master' && zone && <ZoneTag zone={zone} size="md" />}
    </Link>
  )
}
