import { useEffect, useState } from 'react'

/**
 * Seuil au-delà duquel une attente mérite d'être montrée.
 *
 * IndexedDB répond le plus souvent en moins de cent millisecondes : afficher un état de chargement
 * à chaque navigation ferait clignoter l'écran plus qu'il ne l'informerait. Trois cents
 * millisecondes est le palier au-dessus duquel une attente cesse d'être perçue comme instantanée —
 * en dessous, on ne montre rien parce qu'il n'y a rien à montrer.
 */
export const LOADING_VISIBLE_DELAY_MS = 300

/**
 * `false` d'abord, puis `true` passé le délai. Le hook ne connaît pas l'état de chargement : c'est
 * l'appelant qui décide de le monter, et son montage EST le début de l'attente.
 */
export function useDeferredVisibility(delayMs: number = LOADING_VISIBLE_DELAY_MS): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  return visible
}
