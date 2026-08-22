import { createContext, useContext } from 'react'

export interface ShellChrome {
  /** Ouvre le panneau d'encre S1. */
  openMenu: () => void
  /** Bascule la coquille sur la recherche plein écran. */
  openSearch: () => void
}

/** Hors provider (tests unitaires d'écran), les deux commandes sont inertes. */
const NOOP_CHROME: ShellChrome = { openMenu: () => {}, openSearch: () => {} }

export const ShellChromeContext = createContext<ShellChrome>(NOOP_CHROME)

export function useShellChrome(): ShellChrome {
  return useContext(ShellChromeContext)
}
