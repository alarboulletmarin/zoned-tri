import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { demoRace } from '../../domain/demoData'
import { SearchOverlay } from './SearchOverlay'

vi.mock('../../context/AppDataContext', () => ({
  useSearchableData: () => ({ races: [demoRace] }),
}))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderOverlay(query = '') {
  return render(
    <MemoryRouter>
      <SearchOverlay initialQuery={query} onClose={() => undefined} />
    </MemoryRouter>,
  )
}

/**
 * La loupe est la seule commande globale du produit — celle qu'on atteint depuis n'importe quel
 * écran, à toutes les largeurs. Elle ne cherchait que dans le catalogue de séances et les douze
 * calculateurs : ni les courses enregistrées, ni les écrans. Sur une application dont l'utilisateur
 * dit avoir « du mal à naviguer et explorer », c'était le raccourci qui aurait dû réparer ça.
 */
describe('SearchOverlay · ce que la loupe atteint', () => {
  it('trouve une course enregistrée par son nom', () => {
    renderOverlay(demoRace.name.slice(0, 5))

    const group = screen.getByRole('heading', { name: /^Courses · / }).parentElement!
    expect(within(group).getByRole('link', { name: new RegExp(demoRace.name) })).toHaveAttribute(
      'href',
      `/races/${demoRace.id}`,
    )
  })

  it('trouve un écran du produit, et y mène', () => {
    renderOverlay('journal')

    expect(screen.getByRole('link', { name: /Journal du plan/ })).toHaveAttribute(
      'href',
      '/plan/journal',
    )
  })

  it('trouve un écran par un mot qu’il ne porte pas dans son titre, sans rien surligner', () => {
    const { container } = renderOverlay('sauvegarde')

    const row = screen.getByRole('link', { name: /Import \/ export/ })
    expect(row).toHaveAttribute('href', '/import-export')
    // Rien n'est surligné : « sauvegarde » n'est pas écrit dans le titre, et on ne surligne pas
    // à l'approximation.
    expect(container.querySelector('mark')).toBeNull()
  })

  it('trouve une séance accentuée depuis un terme sans accent, et surligne le titre exact', () => {
    const { container } = renderOverlay('velo')

    const marks = [...container.querySelectorAll('mark')].map((mark) => mark.textContent)
    expect(marks.length).toBeGreaterThan(0)
    expect(marks).toContain('vélo')
  })

  it('compte ses natures, et ne compte que celles qui ont un résultat', async () => {
    const user = userEvent.setup()
    renderOverlay()

    await user.type(screen.getByRole('searchbox'), 'journal')
    expect(screen.getByText(/^1 résultat · 1 nature$/)).toBeInTheDocument()
  })

  it('nomme le vide en citant les quatre natures fouillées', () => {
    renderOverlay('xyzzy')

    expect(screen.getByText(/ni un écran de l’application/)).toBeInTheDocument()
  })
})
