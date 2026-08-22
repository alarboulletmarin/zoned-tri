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
    // Le mot-symbole n'apparaît que dans l'ouverture (01) et dans le rail desktop.
    expect(within(banners[0]).queryByText('Zoned Tri')).not.toBeInTheDocument()
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
