import type { ReactNode } from 'react'
import type { ProofLevel } from '../../../domain/types'
import { ProofBadge } from '../ProofBadge/ProofBadge'
import styles from './EvidenceNote.module.css'

export interface EvidenceNoteProps {
  level: ProofLevel
  source: ReactNode
  /** Numéro de note en pied d'écran (ex. 3), affiché en mono — c'est une quantité. */
  noteNumber?: number
}

export function EvidenceNote({ level, source, noteNumber }: EvidenceNoteProps) {
  return (
    <div className={styles.note}>
      <div className={styles.header}>
        <ProofBadge level={level} />
        {noteNumber !== undefined && (
          <span className={styles.noteNumber}>NOTE {noteNumber}</span>
        )}
      </div>
      <p className={styles.source}>{source}</p>
    </div>
  )
}
