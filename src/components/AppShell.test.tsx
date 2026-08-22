import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../context/AppDataContext'
import { AppShell } from './AppShell'
import { AppHeader } from './ui/AppHeader/AppHeader'

function mockMatchMediaWidth(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/)
    const matches = minWidthMatch ? width >= Number(minWidthMatch[1]) : false
    return {
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList
  })
}

/**
 * `withData` : seul le menu ouvert lit la base (ses compteurs) — la coquille elle-même n'en a
 * pas besoin, les autres cas s'en passent donc.
 */
function renderShell({ withData = false }: { withData?: boolean } = {}) {
  const tree = (
    <MemoryRouter initialEntries={['/plan']}>
      <Routes>
        <Route element={<AppShell />}>
          {/* Depuis la refonte du chrome, le bandeau appartient à l'écran : la coquille ne
              fournit que le burger et la recherche, via `ShellChromeContext`. */}
          <Route
            path="/plan"
            element={
              <>
                <AppHeader variant="root" label="Plan" />
                <div>Contenu Plan</div>
              </>
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>
  )
  return render(withData ? <AppDataProvider>{tree}</AppDataProvider> : tree)
}

/**
 * Le test qui empêche le rail de redevenir un sous-ensemble du burger. Les deux navigations lisent
 * la même liste (`MENU_ACTIONS`) : ce test le prouve du dehors, en comparant les destinations
 * réellement rendues aux deux largeurs. Trois destinations — générer un plan, mes plans,
 * import/export — n'existaient qu'en dessous de 1024 px.
 */
describe('AppShell · parité des deux navigations', () => {
  const ATTENDUES = [
    '/plan',
    '/workouts',
    '/races',
    '/tools',
    '/generate-plan',
    '/plans',
    '/import-export',
    '/settings',
  ]

  it('sert les mêmes destinations au rail desktop et au panneau burger', async () => {
    const user = userEvent.setup()

    mockMatchMediaWidth(1200)
    const desktop = renderShell()
    const rail = screen.getByRole('navigation', { name: 'Navigation principale' })
    const duRail = within(rail)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => href !== null && href !== '/')
    desktop.unmount()

    mockMatchMediaWidth(500)
    renderShell({ withData: true })
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const panneau = screen.getByRole('dialog', { name: 'Menu' })
    const duBurger = within(panneau)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => href !== null && href !== '/')

    expect([...new Set(duRail)].sort()).toEqual([...ATTENDUES].sort())
    expect([...new Set(duBurger)].sort()).toEqual([...ATTENDUES].sort())
  })
})

describe('AppShell', () => {
  it('renders no navigation rail on mobile, burger stays the only navigation', () => {
    mockMatchMediaWidth(500)
    renderShell()
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByText('Contenu Plan')).toBeInTheDocument()
  })

  it('renders no navigation rail on tablet either, burger still shown (écran S4 révisé : rail desktop uniquement)', () => {
    mockMatchMediaWidth(800)
    renderShell()
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })

  it('renders a labelled numbered rail on desktop and hides the burger (rail replaces it)', () => {
    mockMatchMediaWidth(1200)
    renderShell()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Plan').length).toBeGreaterThan(0)
    expect(screen.getByText('Réglages')).toBeInTheDocument()
  })

  it('renders exactly one banner, the screen\'s own — never a shell one on top of it', () => {
    mockMatchMediaWidth(500)
    renderShell()
    const banners = screen.getAllByRole('banner')
    expect(banners).toHaveLength(1)
    expect(within(banners[0]).getByText('Plan')).toBeInTheDocument()
    // Le mot-symbole est désormais DANS ce bandeau unique, à toutes les largeurs : c'est le logo
    // du produit et son retour à l'accueil, et il manquait sur quinze écrans sur seize.
    expect(within(banners[0]).getByRole('link', { name: 'Zoned Tri' })).toHaveAttribute('href', '/')
  })

  it('renders exactly one banner on desktop too, next to the rail wordmark', () => {
    mockMatchMediaWidth(1200)
    renderShell()
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getByText('Zoned Tri')).toBeInTheDocument()
  })

  it('opens the burger menu from the header and closes it again from its cross (écran S1)', async () => {
    const user = userEvent.setup()
    mockMatchMediaWidth(500)
    renderShell({ withData: true })

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(await screen.findByRole('dialog', { name: 'Menu' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fermer le menu' }))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })
})
