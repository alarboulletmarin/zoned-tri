import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { SessionCardRoute } from './ExportsRoutes'

vi.mock('../../context/AppDataContext', () => ({
  useWorkouts: () => ({ workouts: [], loading: false, saveWorkout: vi.fn() }),
  usePlans: () => ({ plans: [], loading: false }),
  useProfile: () => ({ profile: undefined, loading: false }),
  useRaces: () => ({ races: [], loading: false }),
}))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderCard(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/exports/carte/${id}`]}>
      <Routes>
        <Route path="/exports/carte/:id" element={<SessionCardRoute />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SessionCardRoute · une adresse qui ne désigne aucune séance', () => {
  it('ouvre l’écran, le nomme et cite l’identifiant demandé — au lieu de renvoyer à l’ouverture', () => {
    renderCard('seance-effacee')

    expect(screen.getByRole('heading', { name: /Séance\s+introuvable/ })).toBeInTheDocument()
    expect(screen.getByText('seance-effacee')).toBeInTheDocument()
  })

  it('laisse deux sorties, jamais un cul-de-sac', () => {
    renderCard('seance-effacee')

    expect(screen.getByRole('link', { name: 'Parcourir la bibliothèque' })).toHaveAttribute(
      'href',
      '/workouts',
    )
    expect(screen.getByRole('link', { name: 'Revenir au plan' })).toHaveAttribute('href', '/plan')
  })

  it('montre bien la carte quand la séance existe', () => {
    renderCard(SEED_WORKOUTS[0]!.id)

    expect(screen.queryByRole('heading', { name: /introuvable/ })).not.toBeInTheDocument()
  })
})
