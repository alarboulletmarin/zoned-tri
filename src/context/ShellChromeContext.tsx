import { useMemo, type ReactNode } from 'react'
import { ShellChromeContext, type ShellChrome } from './shellChrome'

/**
 * Fente inverse de `RailBlockContext` : le bandeau appartient à l'écran (le canevas ouvre chaque
 * artboard par le sien), mais les deux commandes qu'il porte — burger et recherche — appartiennent
 * à la coquille, qui seule connaît l'état du panneau S1 et de la recherche plein écran.
 *
 * Le contexte et son hook vivent dans `shellChrome.ts` : ce fichier n'exporte qu'un composant,
 * condition du rafraîchissement à chaud de Vite.
 */
export function ShellChromeProvider({
  openMenu,
  openSearch,
  children,
}: ShellChrome & { children: ReactNode }) {
  const value = useMemo(() => ({ openMenu, openSearch }), [openMenu, openSearch])
  return <ShellChromeContext.Provider value={value}>{children}</ShellChromeContext.Provider>
}
