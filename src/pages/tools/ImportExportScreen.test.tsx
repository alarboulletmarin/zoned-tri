import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { demoPlan } from '../../domain/demoData'
import { ImportExportScreen } from './ImportExportScreen'

// L'écran porte désormais le parcours d'import, qui lit les quatre corpus pour comparer l'avant
// et l'après : le mock du contexte doit les servir tous.
vi.mock('../../context/AppDataContext', () => ({
  usePlans: () => ({ plans: [demoPlan], savePlan: vi.fn(), deletePlan: vi.fn(), loading: false }),
  useWorkouts: () => ({ workouts: [], saveWorkout: vi.fn(), deleteWorkout: vi.fn(), loading: false }),
  useRaces: () => ({ races: [], saveRace: vi.fn(), deleteRace: vi.fn(), loading: false }),
  useJournal: () => ({ journal: [], addJournalEntry: vi.fn(), undoJournalEntry: vi.fn(), loading: false }),
}))

vi.mock('../../storage/backup', () => ({ exportBackup: vi.fn(), importBackup: vi.fn() }))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderScreen() {
  return render(
    <MemoryRouter>
      <ImportExportScreen />
    </MemoryRouter>,
  )
}

describe('ImportExportScreen · artboard 14', () => {
  it('titles the screen as the artboard does', () => {
    renderScreen()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Import / export')
    expect(screen.getByText('Ce qui remplace la synchro')).toBeInTheDocument()
  })

  it('lists the four outputs of the Sortie / Format table', () => {
    renderScreen()
    for (const title of ['Séance → montre', 'Séance → home-trainer', 'Plan → agenda', 'Sauvegarde complète']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })

  it('counts the plan’s dated sessions on the .ICS line', () => {
    renderScreen()
    // La semaine 07 du plan de démonstration porte 7 séances datées.
    expect(screen.getByText('7 séances datées')).toBeInTheDocument()
  })

  it('leaves the three unwritten formats inert, each with its reason', () => {
    renderScreen()
    for (const format of ['.FIT', '.ZWO', '.ICS']) {
      const action = screen.getByRole('button', { name: new RegExp(`en \\${format}$`) })
      expect(action).toBeDisabled()
      expect(action).toHaveAttribute('title', expect.stringContaining('pas encore implémentée'))
    }
    expect(screen.getByRole('button', { name: /en \.JSON$/ })).toBeEnabled()
  })

  it('quotes the five engine sources of the artboard, kept and discarded alike', () => {
    renderScreen()
    expect(screen.getByText('Affûtage — Bosquet 2007')).toBeInTheDocument()
    expect(screen.getByText('Vitesse critique — Wakayoshi 1992')).toBeInTheDocument()
    expect(screen.getByText('Règle des 10 %')).toBeInTheDocument()
    expect(screen.getByText('contesté depuis 2019 · écartée')).toBeInTheDocument()
  })

  it('closes on the ink pledge', () => {
    renderScreen()
    expect(screen.getByText(/coach en boîte noire/)).toBeInTheDocument()
  })
})
