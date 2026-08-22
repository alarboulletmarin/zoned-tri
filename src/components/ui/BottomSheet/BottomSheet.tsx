import type { ReactNode } from 'react'
import { useRef } from 'react'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import styles from './BottomSheet.module.css'

/**
 * Deux formes de feuille dans le canevas, une seule mécanique de dialogue :
 *
 * - `sheet` — artboard 40 · Feuille de filtres. Elle monte du bas, s'arrête à 85 % de la hauteur
 *   et s'ouvre sur une poignée ;
 * - `cover` — artboard 20 · Feuille d'export. Elle prend TOUTE la hauteur et remplace sa poignée
 *   par une barre de 46 px : le fil d'Ariane de l'écran appelant à gauche, la fermeture à droite.
 *   C'est la forme d'une feuille « appelée depuis n'importe quel écran » : elle dit d'où elle
 *   vient, ce qu'une poignée anonyme ne dirait pas.
 */
export type BottomSheetVariant = 'sheet' | 'cover'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Titre de la feuille — General Sans 700 capitales, 24 px (artboard 40 l. 3784). */
  title: string
  /** Mention poussée à droite du titre, sur sa ligne de base (40 : « 37 sur 312 »). */
  titleAside?: ReactNode
  /** Intitulé accessible de la poignée, qui est la fermeture de la feuille. */
  closeLabel?: string
  variant?: BottomSheetVariant
  /**
   * Fil d'Ariane de la barre de `cover` (artboard 20 : `Plan / Semaine 07 / Exporter`). Le titre
   * de la feuille reste son nom accessible ; le fil dit d'où l'on vient.
   */
  trail?: string[]
  children: ReactNode
}

/**
 * Feuille montante — artboard 40 · Feuille de filtres (l. 3779-3834), seul artboard de feuille du
 * canevas à porter une poignée, et donc seule mesure disponible pour `sheet` :
 *
 * - le voile est un aplat d'encre à **0,12**, pas un noir à demi opaque : la page reste lisible
 *   dessous, la feuille ne prétend pas être un autre écran ;
 * - la feuille n'a qu'un filet HAUT de 2 px — elle sort du bord, elle n'est pas une carte posée ;
 * - elle s'ouvre sur une poignée de 44 × 4 px. Le canevas la dessine inerte ; ici elle EST la
 *   fermeture, ce qui évite d'ajouter un bouton « Fermer » que l'artboard ne montre pas ;
 * - elle ne porte aucune gouttière : le canevas fait courir ses rangées bord à bord et laisse
 *   chaque section poser sa marge de 20 px.
 *
 * `cover` (artboard 20, l. 2700-2705) garde tout cela et change deux choses : la hauteur pleine,
 * et la barre de 46 px filetée de 2 px — `padding:0 14px 0 12px`, fil d'Ariane en mono 10 px
 * `.12em` capitales `#5B594F`, fermeture en mono 13 px.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  titleAside,
  closeLabel,
  variant = 'sheet',
  trail,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useFocusTrap(sheetRef, isOpen, onClose)

  if (!isOpen) return null

  const isCover = variant === 'cover'
  const label = closeLabel ?? `Fermer ${title.toLowerCase()}`

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={isCover ? `${styles.sheet} ${styles.cover}` : styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={isCover ? undefined : 'bottom-sheet-title'}
        aria-label={isCover ? title : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {isCover ? (
          <div className={styles.coverBar}>
            <span className={styles.coverTrail}>{(trail ?? [title]).join(' / ')}</span>
            {/* Le canevas dessine une croix, pas le mot « Fermer » : le glyphe est décoratif,
                le nom accessible est porté par `aria-label`. */}
            <button type="button" className={styles.coverClose} onClick={onClose} aria-label={label}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : (
          <>
            <div className={styles.handleRow}>
              <button type="button" className={styles.handle} onClick={onClose} aria-label={label} />
            </div>
            <div className={styles.header}>
              <span id="bottom-sheet-title" className={styles.title}>
                {title}
              </span>
              {titleAside && <span className={styles.titleAside}>{titleAside}</span>}
            </div>
          </>
        )}
        {children}
      </div>
    </div>
  )
}
