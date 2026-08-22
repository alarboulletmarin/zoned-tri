import styles from './BackSquare.module.css'

export interface BackSquareProps {
  onClick: () => void
  /** Intitulé accessible — « Étape précédente » dans le générateur, « Retour » ailleurs. */
  label?: string
}

/**
 * Bouton de retour des bandeaux non racines (canevas 03, 05, G1) : carré de 38×38 bordé de 2 px
 * en `currentColor`, contenant la flèche SVG de 20 px. Jamais un glyphe « ← » : le canevas dessine
 * bien un carré et un tracé vectoriel.
 */
export function BackSquare({ onClick, label = 'Retour' }: BackSquareProps) {
  return (
    <button type="button" className={styles.square} onClick={onClick} aria-label={label}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  )
}
