import type { ReactNode } from 'react'
import styles from './GeneratorRows.module.css'

/**
 * Primitives de ligne partagées par les 6 étapes du générateur.
 *
 * Le canevas répète exactement trois motifs de ligne (choix unique en aplat encre, bascule avec
 * marque ✓ / —, ligne étiquette-valeur) et un champ encadré à ombre portée. Ils sont écrits une
 * fois ici pour que G1→G6 ne dérivent pas les uns des autres.
 */

export interface SelectableRowProps {
  /** Intitulé principal (ex. « 70.3 »). */
  label: ReactNode
  /** Ligne mono secondaire (ex. « 1,9 km · 90 km · 21,1 km · 16 sem. min. »). */
  meta?: ReactNode
  selected: boolean
  onSelect: () => void
}

/** Ligne de liste à sélection unique — la ligne retenue passe en aplat encre avec une coche lime. */
export function SelectableRow({ label, meta, selected, onSelect }: SelectableRowProps) {
  return (
    <button
      type="button"
      className={selected ? styles.selectableSelected : styles.selectable}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.rowText}>
        <span className={styles.selectableLabel}>{label}</span>
        {meta && <span className={styles.selectableMeta}>{meta}</span>}
      </span>
      <span className={styles.check} aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
    </button>
  )
}

export interface ToggleRowProps {
  label: ReactNode
  meta?: ReactNode
  checked: boolean
  onToggle: (next: boolean) => void
}

/**
 * Bascule d'accès / de matériel (canevas G4). Absent = tiret mono, jamais un vide : « valeur
 * absente = tiret » est une règle documentée du Design System.
 */
export function ToggleRow({ label, meta, checked, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => onToggle(!checked)}
      aria-pressed={checked}
      data-checked={checked}
    >
      <span className={styles.rowText}>
        <span className={checked ? styles.toggleLabel : styles.toggleLabelOff}>{label}</span>
        {meta && <span className={styles.toggleMeta}>{meta}</span>}
      </span>
      <span className={checked ? styles.mark : styles.markOff} aria-hidden="true">
        {checked ? '✓' : '—'}
      </span>
    </button>
  )
}

export interface StatRowProps {
  label: ReactNode
  value: ReactNode
  /** Rend la ligne cliquable (G6 : « chaque ligne renvoie à son étape »). */
  onClick?: () => void
  /**
   * Étiquette mono en capitales à gauche plutôt qu'un intitulé de prose, et la ligne serrée à
   * `padding:10px` — c'est la forme du tableau du récapitulatif G6, qui vit dans un cadre de 2 px.
   */
  monoLabel?: boolean
}

/** Ligne étiquette / valeur (canevas G2 bas d'écran, G6 tableau du récapitulatif). */
export function StatRow({ label, value, onClick, monoLabel = false }: StatRowProps) {
  const content = (
    <>
      <span className={monoLabel ? styles.statLabelMono : styles.statLabel}>{label}</span>
      <span className={monoLabel ? styles.statValueStrong : styles.statValue}>{value}</span>
    </>
  )

  const dense = monoLabel ? ` ${styles.statDense}` : ''

  if (!onClick) return <div className={`${styles.stat}${dense}`}>{content}</div>

  return (
    <button type="button" className={`${styles.statButton}${dense}`} onClick={onClick}>
      {content}
    </button>
  )
}

export interface FramedFieldProps {
  children: ReactNode
  /** Taille du texte : `md` = 15px (G1), `lg` = 18px (G2). */
  size?: 'md' | 'lg'
}

/** Champ encadré 2px à ombre portée lime (canevas G1 « Course visée », G2 date). */
export function FramedField({ children, size = 'md' }: FramedFieldProps) {
  return <div className={size === 'lg' ? styles.framedLg : styles.framed}>{children}</div>
}

/** Ligne mono discrète sous un champ ou une section (« dans 11 semaines · dimanche »). */
export function MonoHint({ children }: { children: ReactNode }) {
  return <p className={styles.hint}>{children}</p>
}
