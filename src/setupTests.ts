import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * jsdom n'implémente pas `matchMedia`, dont `useBreakpoint` dépend — et depuis que chaque écran
 * rend son propre bandeau (`AppHeader`), c'est presque tout l'arbre qui l'appelle. Défaut =
 * mobile, la largeur de référence du canevas ; les tests desktop remplacent ce stub.
 */
function stubMatchMedia() {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

stubMatchMedia()

beforeEach(() => {
  stubMatchMedia()
})

afterEach(() => {
  cleanup()
})
