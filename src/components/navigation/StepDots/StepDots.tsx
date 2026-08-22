import styles from './StepDots.module.css'

export interface StepDotsProps {
  total: number
  /** Nombre de segments pleins, 1-indexé (étape 3 sur 6 → `current = 3`). */
  current: number
  /** Libellé lu par les technologies d'assistance (l'affichage, lui, est purement graphique). */
  label?: string
}

/**
 * Barre de progression à segments du parcours de génération (canevas G1→G6, `padding:14px 20px 0`,
 * six segments `height:6px`, `gap:4px`, plein `#0B0B0A` / vide `#CFCCC0`).
 *
 * Des segments, jamais un pourcentage ni un indicateur d'attente : le Design System (composant
 * `navigation/StepDots`) l'énonce explicitement. Le compteur mono « 01 / 06 » vit dans le fil
 * d'Ariane, pas ici.
 */
export function StepDots({ total, current, label }: StepDotsProps) {
  return (
    <div
      className={styles.dots}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={label ?? `Étape ${current} sur ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={index < current ? styles.filled : styles.empty}
          data-filled={index < current}
        />
      ))}
    </div>
  )
}
