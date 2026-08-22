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

  /**
   * L'écran annonçait le .ZWO et le .ICS « pas encore implémentés » alors que `zwoFile.ts` et
   * `icsFile.ts` les écrivent, testés, depuis la reprise des artboards 20 et 24. Seul le .FIT
   * reste inerte — et son motif est le vrai, rendu à l'écran.
   */
  it('mène les deux formats écrits à la feuille d’export, et dit pourquoi le .FIT ne l’est pas', () => {
    renderScreen()

    for (const format of ['.ZWO', '.ICS']) {
      expect(screen.getByRole('link', { name: new RegExp(`en \\${format}$`) })).toHaveAttribute(
        'href',
        '/exports',
      )
    }

    const fit = screen.getByRole('button', { name: /en \.FIT$/ })
    expect(fit).toBeDisabled()
    expect(fit).not.toHaveAttribute('title')
    expect(fit).toHaveAccessibleDescription(/binaire Garmin/)

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

/**
 * `/import-export/import` n'existe que le temps d'un refus : l'écran vit dans l'état de navigation,
 * qu'un rechargement efface. Le renvoi vers cet écran-ci était muet — indistinguable, pour qui
 * venait de cliquer, d'un bouton qui n'a pas marché.
 */
describe('ImportExportScreen · retour d’un refus expiré', () => {
  it('dit pourquoi la page a changé, plutôt que de renvoyer sans un mot', () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/import-export', state: { importRefusalExpired: true } }]}
      >
        <ImportExportScreen />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/n’existe que le temps du refus/)
  })

  it('ne dit rien quand on arrive normalement', () => {
    renderScreen()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
