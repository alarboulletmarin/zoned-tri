import { useEffect, useRef } from 'react'
import styles from './UndoToast.module.css'

const UNDO_DELAY_MS = 6000

export interface UndoToastProps {
  message: string
  onUndo: () => void
  /** Appelé une seule fois, exactement 6000ms après le montage, si onUndo n'a pas été cliqué avant. */
  onExpire: () => void
}

export function UndoToast({ message, onUndo, onExpire }: UndoToastProps) {
  const expiredRef = useRef(false)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (expiredRef.current) return
      expiredRef.current = true
      onExpire()
    }, UNDO_DELAY_MS)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleUndo() {
    expiredRef.current = true
    onUndo()
  }

  return (
    <div className={styles.toast} role="status">
      <div className={styles.timerTrack}>
        <div className={styles.timerFill} />
      </div>
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.undoButton} onClick={handleUndo}>
        Annuler
      </button>
    </div>
  )
}
