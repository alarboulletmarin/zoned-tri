import { useEffect } from 'react'
import { documentTitleFromTrail, type TrailSegment } from '../navigation'

/**
 * Titre de l'onglet, construit depuis le fil d'Ariane de l'écran : « Semaine 07 · Plan · Zoned Tri ».
 *
 * Il vit dans un hook et non dans le rendu : écrire `document.title` pendant le rendu est un effet
 * de bord que React rejoue en mode strict, et qui s'exécuterait avant même que l'écran soit
 * affiché. `AppHeader` l'appelle pour tous les écrans ; les rares surfaces qui n'ont pas de
 * bandeau — la feuille d'export, qui est une feuille et non un écran — l'appellent elles-mêmes.
 */
export function useDocumentTitle(trail: TrailSegment[]): void {
  const title = documentTitleFromTrail(trail)
  useEffect(() => {
    document.title = title
  }, [title])
}
