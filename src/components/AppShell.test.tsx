import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../context/AppDataContext'
import { deleteDatabase } from '../storage/db'
import * as repo from '../storage/repository'
import { demoPlan } from '../domain/demoData'
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

/**
 * La tablette (768–1023 px) n'avait AUCUNE navigation permanente : ni le rail, réservé au desktop,
 * ni rien d'autre — juste le burger, comme sur un téléphone. Changer de section coûtait donc trois
 * gestes sur un écran qui a la place d'une rangée. C'est la règle nº 3 prise dans l'autre sens.
 */
describe('AppShell · la rangée de sections des largeurs tablette', () => {
  it('montre les quatre sections en permanence, et marque celle qu’on regarde', () => {
    mockMatchMediaWidth(800)
    renderShell()

    const bar = screen.getByRole('navigation', { name: 'Sections' })
    const links = within(bar).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/plan',
      '/workouts',
      '/races',
      '/tools',
    ])
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(links[1]).not.toHaveAttribute('aria-current')
  })

  it('n’existe ni en mobile — le burger suffit — ni en desktop, où le rail la remplace', () => {
    mockMatchMediaWidth(500)
    const mobile = renderShell()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
    mobile.unmount()

    mockMatchMediaWidth(1200)
    renderShell()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('laisse le burger en place : il porte les quatre destinations que la rangée n’a pas', () => {
    mockMatchMediaWidth(800)
    renderShell()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })
})

/** `matchMedia` pilotable : les écouteurs sont retenus, et `setWidth` les rejoue comme le ferait
    un vrai redimensionnement de fenêtre. */
function mockResizableMatchMedia(initialWidth: number) {
  let width = initialWidth
  const listeners: (() => void)[] = []

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const min = query.match(/min-width:\s*(\d+)px/)
    return {
      get matches() {
        return min ? width >= Number(min[1]) : false
      },
      media: query,
      addEventListener: (_: string, handler: () => void) => listeners.push(handler),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList
  })

  return (next: number) => {
    width = next
    listeners.forEach((handler) => handler())
  }
}

describe('AppShell · le panneau burger et le redimensionnement', () => {
  it('se referme quand le rail prend le relais, au lieu de réapparaître au rétrécissement suivant', async () => {
    const user = userEvent.setup()
    const setWidth = mockResizableMatchMedia(500)
    renderShell({ withData: true })

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(await screen.findByRole('dialog', { name: 'Menu' })).toBeInTheDocument()

    // On élargit : le rail remplace le panneau, qui disparaît de l'écran…
    await act(async () => setWidth(1200))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()

    // … et il ne doit pas revenir tout seul au rétrécissement, sur un écran qu'on n'a pas demandé.
    await act(async () => setWidth(500))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })
})

/**
 * L'ouverture desktop n'avait aucun rail — le canevas S9 est explicite, « rien n'est encore
 * ouvert ». Mais S9b est l'écran de RETOUR de quelqu'un qui a déjà un plan : sans rail, l'écran
 * d'accueil du produit était, sur un écran de bureau, le seul d'où l'on n'atteignait ni Séances,
 * ni Courses, ni Outils.
 */
describe('AppShell · le rail sur l’ouverture desktop', () => {
  beforeEach(async () => {
    await deleteDatabase()
  })

  function renderOpening() {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <AppDataProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<div>Ouverture</div>} />
            </Route>
          </Routes>
        </AppDataProvider>
      </MemoryRouter>,
    )
  }

  it('reste absent tant que l’appareil est vide : il n’y a nulle part où aller', async () => {
    mockMatchMediaWidth(1200)
    renderOpening()
    expect(await screen.findByText('Ouverture')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
  })

  it('revient dès que l’appareil porte un plan', async () => {
    await repo.putPlan(demoPlan)
    mockMatchMediaWidth(1200)
    renderOpening()

    expect(await screen.findByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
  })
})
