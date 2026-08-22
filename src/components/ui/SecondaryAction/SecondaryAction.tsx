import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './SecondaryAction.module.css'

/**
 * `SecondaryAction` — README §4 : « contour 2 px ».
 *
 * Trois formes dans le canevas, une seule intention — proposer sans imposer :
 * - `chip` : le petit bouton bordé en fin de ligne (« Voir », « Rouvrir »), mono 9 px,
 *   `padding:5px 8px`. Artboard 01, ligne des plans archivés ;
 * - `block` : le même contour, pleine largeur et 48 px de haut, quand l'action est seule ;
 * - `link` : le lien souligné en General Sans 15 px / 600, `text-underline-offset:4px`
 *   (« Parcourir les 312 séances »). Pas de contour : ce n'est pas un bouton, c'est une sortie.
 *
 * Le `chip` mesure 21 px à l'œil, sous les 44 px exigés par le README §3 règle 3. Le composant
 * garde l'apparence de l'artboard et étend la **cible** à 44 px par un pseudo-élément centré :
 * le doigt touche 44 px, l'œil voit le jeton. Aucune des deux règles n'est sacrifiée.
 */
export type SecondaryActionShape = 'chip' | 'block' | 'link'

export interface SecondaryActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  shape?: SecondaryActionShape
  /** Posée sur un aplat d'encre (colonne sombre de S9) : le contour et le texte passent en papier. */
  onInk?: boolean
  children: ReactNode
}

export function SecondaryAction({
  shape = 'chip',
  onInk = false,
  className,
  children,
  ...rest
}: SecondaryActionProps) {
  const classes = [styles.action, styles[shape], onInk ? styles.onInk : '', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}
