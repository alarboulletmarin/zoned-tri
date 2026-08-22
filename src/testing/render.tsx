import type { ReactElement } from 'react'
import { render as rtlRender, type RenderOptions, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Rendu d'un écran isolé, routeur compris.
 *
 * `AppHeader` pose des liens — le mot-symbole, chaque segment parent du fil d'Ariane — et un lien
 * hors routeur lève. Les tests qui montent un écran seul (une étape du générateur, une feuille de
 * réglages) passent donc par ici plutôt que d'ouvrir un `<MemoryRouter>` chacun. Les tests qui
 * pilotent eux-mêmes des routes gardent leur propre routeur et le `render` de la bibliothèque.
 */
export function render(ui: ReactElement, options?: RenderOptions): RenderResult {
  const view = rtlRender(<MemoryRouter>{ui}</MemoryRouter>, options)
  // `rerender` remplace la racine : sans réemballage, le second rendu perdrait le routeur.
  return { ...view, rerender: (next: ReactElement) => view.rerender(<MemoryRouter>{next}</MemoryRouter>) }
}
