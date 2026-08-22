import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useGoBack } from './useGoBack'

function Probe({ name }: { name: string }) {
  const goBack = useGoBack('/plan')
  const { pathname, key } = useLocation()
  return (
    <>
      <button type="button" onClick={goBack}>
        Retour
      </button>
      <span data-testid="ou">{name}</span>
      <span data-testid="chemin">{pathname}</span>
      <span data-testid="cle">{key}</span>
    </>
  )
}

function renderAt(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/plan" element={<Probe name="plan" />} />
        <Route path="/workouts" element={<Probe name="bibliothèque" />} />
        <Route path="/workouts/:id" element={<Probe name="séance" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('useGoBack', () => {
  it('rend le chemin parcouru quand on est arrivé depuis un autre écran', async () => {
    const user = userEvent.setup()
    renderAt(['/workouts', '/workouts/abc'])
    expect(screen.getByTestId('ou')).toHaveTextContent('séance')

    await user.click(screen.getByRole('button', { name: 'Retour' }))
    expect(screen.getByTestId('ou')).toHaveTextContent('bibliothèque')
  })

  /**
   * Le cas que le produit ratait : une fiche ouverte par un lien collé n'a rien derrière elle, et
   * `navigate(-1)` faisait sortir de Zoned Tri. Le retour remonte alors au parent que le fil
   * d'Ariane annonce — les deux commandes disent enfin la même chose.
   */
  it('remonte au parent quand l’écran est la première entrée de l’historique', async () => {
    const user = userEvent.setup()
    renderAt(['/workouts/abc'])
    expect(screen.getByTestId('cle')).toHaveTextContent('default')

    await user.click(screen.getByRole('button', { name: 'Retour' }))
    expect(screen.getByTestId('chemin')).toHaveTextContent('/plan')
  })
})
