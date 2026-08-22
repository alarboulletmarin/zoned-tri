import styles from './StepDots.module.css'

export interface StepDotsProps {
  total: number
  /** Nombre de segments pleins, 1-indexé (étape 3 sur 6 → `current = 3`). */
  current: number
  /** Libellé lu par les technologies d'assistance (l'affichage, lui, est purement graphique). */
  label?: string
  /**
   * Rend les segments DÉJÀ franchis cliquables (index 1-indexé). Sans lui, la barre reste
   * l'indicateur purement graphique du canevas.
   *
   * Revenir sur une étape passée n'était possible qu'en reculant une à une, ou depuis le
   * récapitulatif : la barre montrait le chemin parcouru sans permettre d'y retourner. On ne rend
   * pas les segments À VENIR cliquables — sauter une question qu'on n'a pas encore vue produirait
   * un plan bâti sur une valeur par défaut jamais regardée.
   */
  onSelect?: (step: number) => void
  /** Nom de l'étape, pour le libellé du segment cliquable (« Revenir à l'étape 02 · Ta date »). */
  stepName?: (step: number) => string
}

/**
 * Barre de progression à segments du parcours de génération (canevas G1→G6, `padding:14px 20px 0`,
 * six segments `height:6px`, `gap:4px`, plein `#0B0B0A` / vide `#CFCCC0`).
 *
 * Des segments, jamais un pourcentage ni un indicateur d'attente : le Design System (composant
 * `navigation/StepDots`) l'énonce explicitement. Le compteur mono « 01 / 06 » vit dans le fil
 * d'Ariane, pas ici.
 */
export function StepDots({ total, current, label, onSelect, stepName }: StepDotsProps) {
  return (
    <div
      className={styles.dots}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={label ?? `Étape ${current} sur ${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const step = index + 1
        const filled = index < current
        // Le segment de l'étape courante n'est pas une destination : on y est déjà.
        const reachable = onSelect !== undefined && step < current

        if (!reachable) {
          return <span key={index} className={filled ? styles.filled : styles.empty} data-filled={filled} />
        }

        return (
          <button
            key={index}
            type="button"
            className={`${styles.filled} ${styles.reachable}`}
            data-filled={filled}
            aria-label={
              stepName ? `Revenir à l’étape ${String(step).padStart(2, '0')} · ${stepName(step)}` : `Revenir à l’étape ${step}`
            }
            onClick={() => onSelect(step)}
          />
        )
      })}
    </div>
  )
}
