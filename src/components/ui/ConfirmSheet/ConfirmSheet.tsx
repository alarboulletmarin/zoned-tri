import { useRef, type ReactNode } from 'react'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { PrimaryAction } from '../PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../SecondaryAction/SecondaryAction'
import styles from './ConfirmSheet.module.css'

/**
 * `ConfirmSheet` — README §3 règle 5 et §6 : « Toute suppression passe par une confirmation », et
 * toute action qui modifie le plan « montre d'abord son effet ».
 *
 * La feuille reprend la composition de l'artboard 32 (« Dépôt coûteux · à confirmer ») : un titre,
 * **ce que l'action change** — c'est `effect`, et il n'est pas facultatif —, puis l'action de
 * confirmation en encre avec son ombre orange, et les sorties. L'ordre compte : on lit le coût
 * avant de voir le bouton.
 *
 * `alternatives` porte les autres issues quand il y en a (« Prendre samedi »). Fermer la feuille
 * n'exécute rien : c'est la sortie par défaut, atteignable à la souris, au clavier (Échap) et par
 * le bouton d'annulation.
 */
export interface ConfirmSheetProps {
  isOpen: boolean
  title: string
  /** Ce que la confirmation va changer. Obligatoire : rien ne se confirme à l'aveugle. */
  effect: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  cancelLabel?: string
  /** Autres issues que confirmer ou annuler (artboard 32 : « Prendre samedi »). */
  alternatives?: ReactNode
}

export function ConfirmSheet({
  isOpen,
  title,
  effect,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = 'Annuler',
  alternatives,
}: ConfirmSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useFocusTrap(sheetRef, isOpen, onCancel)

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <span id="confirm-sheet-title" className={styles.title}>
            {title}
          </span>
        </div>

        <div className={styles.effect}>{effect}</div>

        <div className={styles.actions}>
          <PrimaryAction tone="ink" onClick={onConfirm}>
            {confirmLabel}
          </PrimaryAction>
          <div className={styles.exits}>
            {alternatives}
            <SecondaryAction onClick={onCancel}>{cancelLabel}</SecondaryAction>
          </div>
        </div>
      </div>
    </div>
  )
}
