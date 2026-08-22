import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import { getAllRaces, putRace } from '../../storage/repository'
import { demoRace } from '../../domain/demoData'
import { RaceChecklistEditScreen } from './RaceChecklistEditScreen'

beforeEach(async () => {
  await deleteDatabase()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

afterEach(async () => {
  await deleteDatabase()
})

function renderScreen(id = demoRace.id) {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[`/races/${id}/checklist/modifier`]}>
        <Routes>
          <Route path="/races/:id/checklist/modifier" element={<RaceChecklistEditScreen />} />
          <Route path="/races/:id/checklist" element={<p>Parc à vélo</p>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

/**
 * Même impasse que le déroulé du jour J : `Race.transitionChecklist` existait, l'écran 30 savait la
 * cocher et la compter, mais rien ne savait l'écrire.
 */
describe('RaceChecklistEditScreen', () => {
  it('propose une liste type quand il n’y a rien, sans l’imposer', async () => {
    await putRace({ ...demoRace, transitionChecklist: [] })
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: 'Partir de la liste type' }))

    expect(screen.getAllByLabelText('Ligne de checklist').length).toBeGreaterThan(8)
    // La liste type ne porte aucun chiffre : pression, grammage et pignon sont à l'athlète.
    const labels = screen.getAllByLabelText('Ligne de checklist').map((input) => (input as HTMLInputElement).value)
    expect(labels.some((label) => /\d/.test(label))).toBe(false)
  })

  it('écrit la liste et renvoie sur l’écran qui la coche', async () => {
    await putRace({ ...demoRace, transitionChecklist: [] })
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: /Ajouter une ligne · Sur le vélo/ }))
    await user.type(screen.getByLabelText('Ligne de checklist'), 'Bidon isotonique')
    await user.click(screen.getByRole('button', { name: /Enregistrer 1 ligne$/ }))

    await waitFor(async () => {
      const [race] = await getAllRaces()
      expect(race?.transitionChecklist).toEqual([
        { id: expect.any(String), section: 'bike', label: 'Bidon isotonique', done: false },
      ])
    })
    expect(await screen.findByText('Parc à vélo', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('reprend la liste existante et garde les cases déjà cochées', async () => {
    await putRace({
      ...demoRace,
      transitionChecklist: [{ id: 'casque', section: 'T1', label: 'Casque', done: true }],
    })
    const user = userEvent.setup()
    renderScreen()

    const row = await screen.findByLabelText('Ligne de checklist')
    await user.clear(row)
    await user.type(row, 'Casque et lunettes')
    await user.click(screen.getByRole('button', { name: /Enregistrer 1 ligne$/ }))

    await waitFor(async () => {
      const [race] = await getAllRaces()
      expect(race?.transitionChecklist).toEqual([
        { id: 'casque', section: 'T1', label: 'Casque et lunettes', done: true },
      ])
    })
  })

  it('oublie une ligne laissée vide plutôt que de la refuser', async () => {
    await putRace({ ...demoRace, transitionChecklist: [] })
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: /Ajouter une ligne · Emplacement T1/ }))
    expect(screen.getByRole('button', { name: 'Enregistrer une liste vide' })).toBeEnabled()
  })
})
