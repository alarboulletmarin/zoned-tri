import type { EvidenceNoteData } from '../../../domain/types'
import { ProofGauge } from '../../../components/ui/ProofBadge/ProofBadge'
import styles from './WorkoutWhySection.module.css'

export interface WorkoutWhySectionProps {
  title: string
  why: EvidenceNoteData
  /** 05 écrit sa prose en 14 px, 28 et 29 en 13 px. */
  proseSize?: 'lg' | 'sm'
}

/**
 * Encart « Pourquoi cette séance » — canevas 05 l. 603-609, 28 l. 3096-3102, 29 l. 3155-3161.
 *
 * La qualification est le `ProofGauge` des treize composants : un rectangle de 22 × 9 px suivi du
 * mot, dont la forme porte le niveau — aplat d'encre pour SOLIDE (05 l. 606), contour de 2 px vide
 * pour MODÉRÉE (28 l. 3099), hachures à 45° pour ce qui n'est pas démontré (05 l. 550).
 *
 * La note de source, elle, n'appartient pas à cet encart : le canevas la pose en bas de l'écran,
 * au-dessus de l'action (05 l. 613-616). Seul l'appel de note reste ici.
 */
export function WorkoutWhySection({ title, why, proseSize = 'lg' }: WorkoutWhySectionProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <ProofGauge level={why.level} />
      </div>
      <p className={proseSize === 'lg' ? styles.proseLg : styles.proseSm}>
        {why.text}
        {why.sourceRef && <sup className={styles.sup}>1</sup>}
      </p>
    </div>
  )
}
