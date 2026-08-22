import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

/**
 * `Card` — README §4 : « contour 2 px, ombre dure optionnelle ».
 *
 * Le canevas n'a que trois cartes, distinguées par leur ombre et rien d'autre :
 * - `plain` : contour seul (listes, blocs secondaires) ;
 * - `featured` : ombre lime `5px 5px 0` — la carte que l'écran veut faire lire en premier
 *   (artboard 01, carte du plan en cours ; S9 la passe à 6 px) ;
 * - `hypothesis` : contour en pointillé d'encre — la carte décrit un état qui n'est pas encore
 *   écrit (simulation 06, avant/après 38). Elle ne porte jamais d'ombre : rien de posé.
 *
 * Aucun rayon, jamais de flou : les deux interdits du système passent par les jetons.
 */
export type CardTone = 'plain' | 'featured' | 'hypothesis'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
  /** Ombre longue (8 px orange / 6 px lime) : uniquement les artboards desktop de l'ouverture. */
  large?: boolean
  children?: ReactNode
}

export function Card({ tone = 'plain', large = false, className, children, ...rest }: CardProps) {
  const classes = [styles.card, styles[tone], large ? styles.large : '', className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
