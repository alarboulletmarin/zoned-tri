import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Contenu affiché à droite (ex. "→"), pousse le libellé à gauche sur toute la largeur. */
  endAdornment?: ReactNode
  children?: ReactNode
}

export function Button({ variant = 'primary', endAdornment, className, children, ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary
  const classes = [styles.button, variantClass, endAdornment ? styles.withEndAdornment : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={classes} {...rest}>
      {children}
      {endAdornment && <span className={styles.end}>{endAdornment}</span>}
    </button>
  )
}
