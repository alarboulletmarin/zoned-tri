import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

/**
 * `EmptyState` — README §3 règle 4 : « Un vide se nomme. Toute case, colonne ou liste vide porte un
 * cadre pointillé et une phrase. Jamais de blanc muet. »
 *
 * Le composant rend la règle impossible à contourner : `sentence` est obligatoire. Un vide sans
 * phrase ne compile pas, ce qui est exactement l'intention du système.
 *
 * Deux tons, repris du canevas :
 * - `empty` (pointillé clair `#CFCCC0`) : il n'y a rien ici, et c'est un état normal —
 *   « jour libre · déposer une séance ici », « rien à ce croisement » ;
 * - `hypothesis` (pointillé d'encre) : il y a quelque chose, mais ce n'est pas encore écrit —
 *   aperçu d'un dépôt, simulation. Le pointillé d'encre veut dire « pas encore vrai ».
 *
 * Et deux tailles, elles aussi relevées sur le canevas : un vide qui occupe une case étroite n'a
 * qu'une phrase mono de 10 px (colonne libre de la semaine, S6) ; un vide qui occupe une carte
 * porte d'abord un titre en capitales de 22 px, éteint en `#3B3A33` (artboards 01b et S9b) — le
 * titre dit *quoi*, la phrase dit *pourquoi c'est normal*.
 */
/**
 * Troisième ton, et le seul que le canevas monte en affiche : `dead-end`, artboard 26 l. 2952-2960.
 * Quand le vide n'occupe pas une case mais TOUT l'écran — un croisement de filtres qui ne rend
 * rien — le cadre passe en pointillé d'encre sur l'aplat `#E4E1D6`, le titre monte à 32 px en encre
 * pleine et la phrase quitte la mono pour la General Sans de 14 px : ce n'est plus une note en marge,
 * c'est le message de l'écran, et il doit se lire comme une phrase.
 */
export type EmptyStateTone = 'empty' | 'hypothesis' | 'dead-end'

export interface EmptyStateProps {
  /** Titre du vide, General Sans 700 capitales. Absent = forme courte, la phrase suffit. */
  headline?: string
  /** La phrase qui nomme le vide. Obligatoire — c'est tout l'objet du composant. */
  sentence: ReactNode
  /** Sortie proposée depuis le vide (« Voir les 37 séances », « Retirer ce filtre »). */
  action?: ReactNode
  tone?: EmptyStateTone
  className?: string
}

export function EmptyState({ headline, sentence, action, tone = 'empty', className }: EmptyStateProps) {
  const classes = [styles.frame, styles[tone], className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {headline && <div className={styles.headline}>{headline}</div>}
      <p className={styles.sentence}>{sentence}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
