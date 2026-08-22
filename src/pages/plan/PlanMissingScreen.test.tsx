import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import * as repo from '../../storage/repository'
import { demoPastRace, demoPlan } from '../../domain/demoData'
import type { TrainingPlan } from '../../domain/types'
import { PlanRoute, PlanMacroRoute } from './PlanRoute'
import { PlanSettingsRoute, PlanJournalRoute } from '../planSettings/PlanSettingsRoutes'

const archived: TrainingPlan = {
  ...demoPlan,
  id: 'plan-senlis',
  raceId: demoPastRace.id,
  status: 'archived_completed',
  phases: [],
  weeks: [],
}

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

function renderRoute(element: React.ReactNode, path = '/plan') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppDataProvider>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </AppDataProvider>
    </MemoryRouter>,
  )
}

/**
 * Le cœur de la reprise : sept routes du Plan répondaient à une base sans plan actif par un
 * `<Navigate to="/" replace />` muet. Cliquer « Plan » dans le rail ramenait à l'accueil sans un
 * mot — le clic semblait n'avoir pas marché. Ces tests existent pour que le renvoi muet ne revienne
 * pas : l'écran demandé s'ouvre, garde son nom, dit ce qui manque et propose la sortie.
 */
describe('Une section du Plan sans plan actif', () => {
  it('ouvre l’écran demandé, vide, plutôt que de renvoyer à l’ouverture', async () => {
    renderRoute(<PlanRoute />)

    expect(await screen.findByRole('heading', { name: /Aucun plan\s+sur cet\s+appareil/ })).toBeInTheDocument()
    expect(screen.getByText(/lit le plan actif/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Générer un plan' })).toHaveAttribute(
      'href',
      '/generate-plan',
    )
  })

  it('garde le nom de l’écran demandé dans le bandeau, sans le renommer', async () => {
    renderRoute(<PlanMacroRoute />, '/plan/macro')

    // Le fil est celui de la Saison : on ne rebaptise pas la page parce qu'elle est vide.
    expect(await screen.findByRole('link', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByText('Saison')).toBeInTheDocument()
  })

  it('propose de rouvrir un plan archivé quand il y en a un, et le compte', async () => {
    await repo.putPlan(archived)
    renderRoute(<PlanSettingsRoute />, '/plan/reglages')

    expect(await screen.findByRole('link', { name: 'Rouvrir mon plan archivé' })).toHaveAttribute(
      'href',
      '/plans',
    )
  })

  it('ne propose pas de rouvrir quoi que ce soit quand rien n’est archivé', async () => {
    renderRoute(<PlanJournalRoute />, '/plan/journal')

    expect(await screen.findByRole('link', { name: 'Générer un plan' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Rouvrir/ })).not.toBeInTheDocument()
  })
})
