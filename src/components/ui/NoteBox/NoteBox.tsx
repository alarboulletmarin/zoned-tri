import type { ReactNode } from 'react'
import styles from './NoteBox.module.css'

/**
 * `NoteBox` — README §4 : « contour jaune, titre mono + explication ».
 *
 * L'encadré « ce qui va se passer ». Il ne signale ni une erreur ni un succès : il annonce l'effet
 * d'une action avant qu'elle ait lieu (« Générer n'écrase rien », artboard 01) ou explique une règle
 * du produit. C'est le support visible de la règle §3.5 — rien dans le dos de l'utilisateur.
 *
 * Le jaune `#E0B400` est un contour, jamais un fond : le système interdit l'aplat de zone
 * détourné en encart décoratif.
 */
/**
 * `hypothesis` — artboard 18 : `border:2px dashed #0B0B0A; padding:16px; background:#E4E1D6`,
 * intitulé mono 10 px `.14em` en `#5B594F`, corps en General Sans 13 px. Le pointillé d'encre du
 * système veut dire « pas encore vrai » ; ici il encadre une supposition sur le lecteur — « si tu
 * es arrivé là depuis ton plan ». Même encart, autre tonalité : ni alerte, ni vide.
 */
export type NoteBoxTone = 'yellow' | 'hypothesis'

export interface NoteBoxProps {
  /** Titre mono en capitales. Facultatif : quelques encarts du canevas n'ont qu'un corps. */
  title?: string
  tone?: NoteBoxTone
  children: ReactNode
  className?: string
}

export function NoteBox({ title, tone = 'yellow', children, className }: NoteBoxProps) {
  const classes = [styles.box, styles[tone], className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.body}>{children}</div>
    </div>
  )
}
