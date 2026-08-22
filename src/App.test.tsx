import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

describe('App', () => {
  // La racine ouvre sur l'écran d'ouverture, qui attend la persistance avant de choisir son état :
  // base vide en test, donc l'état « première visite ».
  it('opens on the opening screen, in its first-visit state', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /Un plan.*qui dit.*pourquoi/s })).toBeInTheDocument()
    expect(screen.getByText('aucun plan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Commencer/ })).toBeInTheDocument()
  })

  it('navigates from the burger menu to another root section', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('link', { name: /Outils/ }))

    // La section Outils s'ouvre sur l'artboard 12, dont le titre est « Mes références » —
    // le libellé « Outils » reste celui du bandeau et de la navigation, pas celui de l'écran.
    // La section Outils s'ouvre sur l'artboard 12, dont le titre est « Mes références » — le mot
    // « Outils » reste celui du bandeau et de la navigation, pas celui de l'écran.
    expect(screen.getByRole('heading', { name: /Mes\s+références/ })).toBeInTheDocument()
  })
})
