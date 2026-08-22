import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import { getAllRaces, putRace } from '../../storage/repository'
import { demoRace } from '../../domain/demoData'
import { RaceTimelineScreen } from './RaceTimelineScreen'

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
      <MemoryRouter initialEntries={[`/races/${id}/jour-j/modifier`]}>
        <Routes>
          <Route path="/races/:id/jour-j/modifier" element={<RaceTimelineScreen />} />
          <Route path="/races/:id/jour-j" element={<p>Jour J</p>} />
          <Route path="/races" element={<p>Mes courses</p>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

/**
 * `Race.timeline` existait dans le modèle, `RaceDayScreen` savait l'afficher et `buildRaceIcs`
 * l'exporter — mais aucun écran ne savait l'écrire. Sur un appareil réel, « Timeline du jour J »
 * restait éteint pour toujours, et l'export .ICS d'une course était du code mort.
 */
describe('RaceTimelineScreen', () => {
  it('part de l’heure de départ déjà saisie, sans rien inventer d’autre', async () => {
    await putRace({ ...demoRace, timeline: undefined, startTime: '07:20' })
    renderScreen()

    expect(await screen.findByDisplayValue('07:20')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Départ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enregistrer 1 repère$/ })).toBeEnabled()
  })

  it('n’ouvre aucun repère quand la course n’a même pas d’heure de départ', async () => {
    await putRace({ ...demoRace, timeline: undefined, startTime: undefined })
    renderScreen()

    expect(await screen.findAllByText(/Aucun repère/)).toHaveLength(2)
  })

  it('ajoute un repère, l’écrit, et renvoie sur l’écran qui l’affiche', async () => {
    await putRace({ ...demoRace, timeline: undefined, startTime: undefined })
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: /Ajouter un repère · la veille/ }))
    await user.type(screen.getByLabelText('Heure du repère'), '19:00')
    await user.type(screen.getByLabelText('Nom du repère'), 'Dépôt du vélo')
    await user.click(screen.getByRole('button', { name: /Enregistrer 1 repère$/ }))

    // L'écriture passe par la base puis par la navigation : on attend le résultat écrit, qui est
    // ce que le test vérifie vraiment, avant d'attendre l'écran qui l'affiche.
    await waitFor(async () => {
      const [race] = await getAllRaces()
      expect(race?.timeline).toEqual([{ label: 'Dépôt du vélo', at: '19:00', phase: 'eve' }])
    })
    // L'écriture passe par IndexedDB puis par la navigation : sous charge, la seconde arrive
    // après le délai d'attente par défaut d'une seconde.
    expect(await screen.findByText('Jour J', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('refuse d’enregistrer un repère sans heure, en disant pourquoi à l’écran', async () => {
    await putRace({ ...demoRace, timeline: undefined, startTime: undefined })
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: /Ajouter un repère · à rebours/ }))
    expect(screen.getByRole('button', { name: /Enregistrer 1 repère$/ })).toBeDisabled()
    expect(screen.getByText(/une heure au format hh:mm et un nom/)).toBeInTheDocument()
  })

  it('retire un repère', async () => {
    await putRace({ ...demoRace, timeline: undefined, startTime: '07:20' })
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: /Retirer le repère Départ/ }))
    expect(screen.queryByDisplayValue('07:20')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer un déroulé vide' })).toBeEnabled()
  })

  it('ouvre l’écran « introuvable » sur une course qui n’existe pas', async () => {
    renderScreen('course-effacee')

    const heading = await screen.findByRole('heading', { name: /Course\s+introuvable/ })
    expect(heading).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir mes courses' })).toHaveAttribute('href', '/races')
  })

  it('n’autorise qu’un seul départ', async () => {
    await putRace({
      ...demoRace,
      timeline: [
        { label: 'Réveil', at: '05:30', phase: 'race_day' },
        { label: 'Départ', at: '07:20', phase: 'race_day', isStart: true },
      ],
    })
    const user = userEvent.setup()
    renderScreen()

    const rows = await screen.findAllByRole('button', { name: /C’est le départ/ })
    expect(rows[1]).toHaveAttribute('aria-pressed', 'true')

    await user.click(rows[0]!)
    expect(rows[0]).toHaveAttribute('aria-pressed', 'true')
    expect(rows[1]).toHaveAttribute('aria-pressed', 'false')
  })
})
