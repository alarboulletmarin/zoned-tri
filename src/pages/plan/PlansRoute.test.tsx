import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import * as repo from '../../storage/repository'
import { demoPastRace, demoPlan, demoRace } from '../../domain/demoData'
import type { TrainingPlan } from '../../domain/types'
import { PlansRoute } from './PlansRoute'

const archived: TrainingPlan = {
  ...demoPlan,
  id: 'plan-senlis',
  raceId: demoPastRace.id,
  format: 'Sprint',
  startDate: '2026-02-23',
  endDate: '2026-05-18',
  weeksCount: 12,
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

  await repo.putRace(demoRace)
  await repo.putRace(demoPastRace)
  await repo.putPlan(demoPlan)
  await repo.putPlan(archived)
})

afterEach(async () => {
  await deleteDatabase()
})

function renderRoute() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <PlansRoute />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

describe('PlansRoute · rouvrir un plan archivé', () => {
  it('montre l’effet avant d’écrire, et n’écrit rien tant qu’on n’a pas confirmé', async () => {
    renderRoute()

    await userEvent.click(await screen.findByRole('button', { name: 'Rouvrir' }))

    const sheet = await screen.findByRole('alertdialog')
    expect(sheet).toHaveAccessibleName('Rouvrir « Sprint de Senlis » ?')
    expect(screen.getByText(/redevient le plan actif/)).toBeInTheDocument()
    expect(screen.getByText(/passe en archive à la semaine/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    const plans = await repo.getAllPlans()
    expect(plans.find((plan) => plan.id === demoPlan.id)?.status).toBe('active')
    expect(plans.find((plan) => plan.id === archived.id)?.status).toBe('archived_completed')
  })

  it('bascule le plan actif une fois confirmé, et laisse 6 s pour revenir en arrière', async () => {
    renderRoute()

    await userEvent.click(await screen.findByRole('button', { name: 'Rouvrir' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Rouvrir ce plan' }))

    await screen.findByText('« Sprint de Senlis » est redevenu le plan actif')

    let plans = await repo.getAllPlans()
    expect(plans.find((plan) => plan.id === archived.id)?.status).toBe('active')
    expect(plans.find((plan) => plan.id === demoPlan.id)?.status).toBe('archived_abandoned')

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    plans = await repo.getAllPlans()
    expect(plans.find((plan) => plan.id === archived.id)?.status).toBe('archived_completed')
    expect(plans.find((plan) => plan.id === demoPlan.id)?.status).toBe('active')
  })
})
