import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/plan']}>
      <Routes>
        <Route element={<AppShell />}>
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
    </MemoryRouter>,
  )
}

describe('AppShell — recherche en place (écran 25)', () => {
  it('replaces the header and the page content with the search overlay, never a new route', async () => {
    mockMatchMediaWidth(500)
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Rechercher' }))

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Contenu Plan')).not.toBeInTheDocument()
    // La loupe ne cherche plus seulement des séances : elle porte les quatre natures du corpus
    // (séances, calculateurs, courses, écrans), et son libellé le dit.
    expect(screen.getByRole('searchbox', { name: 'Rechercher dans l’application' })).toBeInTheDocument()
  })

  it('restores the normal header and page content on cancel', async () => {
    mockMatchMediaWidth(500)
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Rechercher' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Contenu Plan')).toBeInTheDocument()
  })
})
