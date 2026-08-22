import type { ReactNode } from 'react'
import styles from './InertNote.module.css'

/**
 * `InertNote` — le motif d'une commande inerte, **rendu à l'écran**.
 *
 * Le produit s'interdit « un bouton mort sans explication », et tenait la règle : chacune des
 * commandes inertes portait un `title` qui disait pourquoi. Mais un `title` ne s'affiche qu'au
 * survol d'une souris. Sur un téléphone — c'est-à-dire sur l'appareil que ce produit vise — ces
 * explications n'existaient tout simplement pas : l'utilisateur voyait une commande grise, la
 * touchait, et n'obtenait rien.
 *
 * Le composant est au motif ce qu'`EmptyState` est au vide : `children` est obligatoire, une note
 * sans phrase ne compile pas. Son `id` sert l'`aria-describedby` de la commande qu'elle explique —
 * sans quoi un lecteur d'écran lirait un bouton désactivé et une phrase sans lien entre eux.
 */
export interface InertNoteProps {
  /** Cible de l'`aria-describedby` de la commande inerte. */
  id: string
  children: ReactNode
  className?: string
}

export function InertNote({ id, children, className }: InertNoteProps) {
  return (
    <p id={id} className={[styles.note, className].filter(Boolean).join(' ')}>
      {children}
    </p>
  )
}
