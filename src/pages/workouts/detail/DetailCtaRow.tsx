import { Link } from 'react-router-dom'
import { PrimaryAction } from '../../../components/ui/PrimaryAction/PrimaryAction'
import { exportCardPath, exportSheetPath } from '../../exports/exportsRoutes'
import styles from './DetailCtaRow.module.css'

export interface DetailCtaRowProps {
  exportChips: string[]
  /** Séance de la fiche : c'est elle que les formats visent. */
  workoutId: string
  /** Source de la note « pourquoi » — le canevas la pose ICI, pas sous la prose (05 l. 613-615). */
  sourceRef?: string
}

/**
 * Destination d'un format, depuis la fiche d'une séance.
 *
 * Le `.PNG` a son propre écran — la carte 1080 × 1080 de l'artboard 23, qui s'écrit depuis un
 * canevas. Les autres passent par la feuille d'export, qui annonce ce que contient chaque fichier
 * avant de l'écrire. Le `.FIT` y est rendu inerte avec SON motif (binaire Garmin non écrit) :
 * c'est la feuille qui le dit, une fois, plutôt que chaque puce du produit.
 */
function chipDestination(chip: string, workoutId: string): string {
  return chip === '.PNG' ? exportCardPath(workoutId) : exportSheetPath({ workoutId })
}

/**
 * Pied de fiche, collé en bas de l'écran (`margin-top:auto`) : la note de source quand il y en a
 * une, puis l'action et les formats d'export. Canevas 05 l. 612-620, 28 l. 3104-3107,
 * 29 l. 3164-3167.
 *
 * L'action est le `PrimaryAction` d'encre à ombre orange des treize composants, et non l'ancien
 * `Button` (méthode §5). Elle reste **désactivée** : marquer une séance faite appartient à une
 * séance de plan (IndexedDB), pas au gabarit de bibliothèque consulté ici — pas de fausse
 * confirmation de complétion, et un `title` qui dit pourquoi (méthode §4).
 *
 * Les formats d'export sont des LIENS : chacun mène là où son fichier s'écrit — la carte 1080 pour
 * le `.PNG`, la feuille d'export pour les autres. Le canevas les dessine `border:2px;
 * min-height:46px; padding:0 9px`, et c'est cette forme-là qui est rendue — un `SecondaryAction`
 * désactivé les voilerait à 50 % d'opacité, ce que le canevas n'écrit nulle part.
 */
export function DetailCtaRow({ exportChips, workoutId, sourceRef }: DetailCtaRowProps) {
  return (
    <div className={styles.footer}>
      {sourceRef && (
        <div className={styles.sourceRow}>
          <span className={styles.sourceNumber}>1.</span>
          <span className={styles.sourceText}>{sourceRef}</span>
        </div>
      )}
      <div className={sourceRef ? styles.rowUnderSource : styles.row}>
        <PrimaryAction
          tone="ink-shadow"
          className={styles.markDone}
          disabled
          title="Disponible une fois la séance intégrée à un plan"
        >
          Marquer comme faite
        </PrimaryAction>
        <span className={styles.exportChips}>
          {exportChips.map((chip) => (
            <Link key={chip} className={styles.exportChip} to={chipDestination(chip, workoutId)}>
              {chip}
            </Link>
          ))}
        </span>
      </div>
    </div>
  )
}
