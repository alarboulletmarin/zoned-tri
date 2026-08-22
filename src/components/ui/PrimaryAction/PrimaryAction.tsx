import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './PrimaryAction.module.css'

/**
 * `PrimaryAction` — README §4 : « lime, ombre orange ».
 *
 * L'action principale d'un écran. Le canevas n'en pose jamais deux sur le même écran : c'est le
 * seul aplat lime posé sur le papier, et la seule ombre orange. Artboard 01 :
 * `background:#D6F24B; color:#0B0B0A; box-shadow:6px 6px 0 #FF6A1F; min-height:52px; padding:0 18px`,
 * libellé mono 12 px, capitales, `letter-spacing:.1em`, et la flèche poussée à droite.
 *
 * Variante `ink` : le même bouton retourné — encre pleine, texte lime, sans ombre. C'est l'action
 * *d'une carte* (« Reprendre » sur la carte du plan en cours), pas celle de l'écran ; elle vit à
 * l'intérieur d'un contour et n'a donc pas d'ombre à porter.
 *
 * Variante `ink-shadow` : encre pleine, texte lime **et** ombre orange. Le Design System la nomme
 * lui-même — « une seule action encre-et-ombre par écran » — et c'est la forme de l'action de tous
 * les écrans qui n'ont pas d'aplat lime : G1→G6 « Continuer », G6 « Générer le plan »,
 * 06 « Utiliser ce plan », 38 « Appliquer aux 11 semaines », 18 et 19. Le canevas l'écrit
 * `padding:17px 18px` sur 12 px de mono, soit 51 px occupés.
 *
 * README §3 règle 3 : 48-56 px de haut. Les trois variantes tiennent la règle (52, 48 et 51).
 */
export type PrimaryActionTone = 'lime' | 'ink' | 'ink-shadow'

export interface PrimaryActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: PrimaryActionTone
  /** Signe poussé à droite (« → »). Sa présence aligne le libellé à gauche. */
  trailing?: ReactNode
  /** Ombre longue 8 px : uniquement la colonne sombre de l'ouverture desktop (S9). */
  large?: boolean
  children: ReactNode
}

export function PrimaryAction({
  tone = 'lime',
  trailing,
  large = false,
  className,
  children,
  ...rest
}: PrimaryActionProps) {
  const classes = [
    styles.action,
    styles[tone],
    trailing ? styles.withTrailing : '',
    large ? styles.large : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...rest}>
      <span className={styles.label}>{children}</span>
      {trailing && (
        <span className={styles.trailing} aria-hidden="true">
          {trailing}
        </span>
      )}
    </button>
  )
}
