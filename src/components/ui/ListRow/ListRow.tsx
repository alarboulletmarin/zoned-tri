import type { ReactNode } from 'react'
import { DisciplineBadge, type DisciplineCode } from '../Badge/Badge'
import styles from './ListRow.module.css'

export interface ListRowProps {
  discipline?: DisciplineCode
  title: ReactNode
  meta: ReactNode
  /** Valeur affichée à droite en mono ; absente => tiret mono, jamais un zéro. */
  value?: ReactNode
}

export function ListRow({ discipline, title, meta, value }: ListRowProps) {
  return (
    <div className={styles.row}>
      {discipline && <DisciplineBadge discipline={discipline} />}
      <div className={styles.texts}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>{meta}</span>
      </div>
      <span className={styles.value}>{value ?? '—'}</span>
    </div>
  )
}
