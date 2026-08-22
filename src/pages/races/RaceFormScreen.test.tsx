import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import { getAllRaces, putPlan, putRace } from '../../storage/repository'
import { demoPlan, demoRace } from '../../domain/demoData'
import { RaceFormScreen } from './RaceFormScreen'

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

function renderForm(mode: 'create' | 'edit', entry: string) {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/races/nouvelle" element={<RaceFormScreen mode={mode} />} />
          <Route path="/races/:id/modifier" element={<RaceFormScreen mode={mode} />} />
          <Route path="/races/:id" element={<p>Fiche course</p>} />
          <Route path="/races" element={<p>Mes courses</p>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

/**
 * Une course n'entrait dans l'application que par le générateur : « Ajouter une course » menait au
 * générateur, donc ajouter une course voulait dire refaire un plan. Et rien ne permettait de
 * corriger une date, de saisir l'heure de départ que « Jour J » affiche, ni de supprimer.
 */
describe('RaceFormScreen · créer', () => {
  it('écrit une course avec les distances officielles de son format, sans les demander', async () => {
    const user = userEvent.setup()
    renderForm('create', '/races/nouvelle')

    await user.type(await screen.findByLabelText('Nom de la course'), 'Ironman Nice')
    await user.click(screen.getByRole('button', { name: /^Ironman/ }))
    await user.click(screen.getByRole('button', { name: 'Créer la course' }))

    expect(await screen.findByText('Fiche course')).toBeInTheDocument()
    const [race] = await getAllRaces()
    expect(race.name).toBe('Ironman Nice')
    expect(race.format).toBe('Ironman')
    expect(race.distances).toEqual({ swimM: 3800, bikeKm: 180, runKm: 42.2 })
  })

  it('dit ce qu’il attend sans accuser un formulaire qu’on vient d’ouvrir', async () => {
    renderForm('create', '/races/nouvelle')

    // Le motif de l'action indisponible est écrit à l'écran dès l'ouverture…
    expect(await screen.findByText(/Une course a un nom/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer la course' })).toBeDisabled()
  })

  it('passe à l’alerte une fois qu’on a touché au champ et laissé vide', async () => {
    const user = userEvent.setup()
    renderForm('create', '/races/nouvelle')

    const name = await screen.findByLabelText('Nom de la course')
    await user.type(name, 'V')
    await user.clear(name)

    expect(screen.getByRole('alert')).toHaveTextContent(/Une course a un nom/)
    expect(name).toHaveAttribute('aria-invalid', 'true')
  })

  it('n’ouvre les deux champs de prépa que sur une course de préparation', async () => {
    const user = userEvent.setup()
    renderForm('create', '/races/nouvelle')

    expect(screen.queryByLabelText(/Jours faciles avant/)).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /^Préparation/ }))
    expect(screen.getByLabelText(/Jours faciles avant/)).toBeInTheDocument()
  })
})

describe('RaceFormScreen · modifier et supprimer', () => {
  it('reprend la course de l’adresse et enregistre l’heure de départ', async () => {
    await putRace({ ...demoRace, startTime: undefined })
    const user = userEvent.setup()
    renderForm('edit', `/races/${demoRace.id}/modifier`)

    expect(await screen.findByLabelText('Nom de la course')).toHaveValue(demoRace.name)
    await user.type(screen.getByLabelText('Heure de départ'), '07:20')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    const [race] = await getAllRaces()
    expect(race.startTime).toBe('07:20')
  })

  it('montre ce que la suppression emporte, plan en cours compris', async () => {
    await putRace(demoRace)
    await putPlan({ ...demoPlan, raceId: demoRace.id, status: 'active' })
    const user = userEvent.setup()
    renderForm('edit', `/races/${demoRace.id}/modifier`)

    await user.click(await screen.findByRole('button', { name: 'Supprimer cette course' }))
    const sheet = await screen.findByRole('alertdialog')
    expect(within(sheet).getByText(/pas de corbeille/)).toBeInTheDocument()
    expect(within(sheet).getByText(/Ton plan en cours visait cette course/)).toBeInTheDocument()

    await user.click(within(sheet).getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByText('Mes courses')).toBeInTheDocument()
    expect(await getAllRaces()).toHaveLength(0)
  })

  it('ouvre l’écran « introuvable » plutôt qu’un formulaire vide sur une adresse morte', async () => {
    renderForm('edit', '/races/course-effacee/modifier')

    expect(await screen.findByRole('heading', { name: /Course\s+introuvable/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir mes courses' })).toHaveAttribute('href', '/races')
  })
})
