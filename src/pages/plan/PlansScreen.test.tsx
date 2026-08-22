import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { demoPastRace, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import type { TrainingPlan } from '../../domain/types'
import { PlansScreen } from './PlansScreen'

/** Lundi de la semaine 07 du plan de démonstration. */
const TODAY = '2026-06-15'

const finishedPlan: TrainingPlan = {
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

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderScreen(plans: TrainingPlan[], overrides: Partial<Parameters<typeof PlansScreen>[0]> = {}) {
  const props = {
    plans,
    races: [demoRace, demoPastRace],
    workouts: demoWorkouts,
    today: TODAY,
    onResume: () => undefined,
    onGenerate: () => undefined,
    onReopen: () => undefined,
    ...overrides,
  }
  return render(
    <MemoryRouter>
      <PlansScreen {...props} />
    </MemoryRouter>,
  )
}

describe('PlansScreen · artboard 41', () => {
  it('résume ce que porte l’appareil et propose de reprendre le plan actif', () => {
    renderScreen([demoPlan, finishedPlan])

    expect(screen.getByText('1 en cours · 1 archivé')).toBeInTheDocument()
    expect(screen.getByText(/En cours · 70\.3 Vichy/)).toBeInTheDocument()
    expect(screen.getByText('Semaine 07 / 18')).toBeInTheDocument()
    expect(screen.getByText(/prochaine séance :/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeInTheDocument()
  })

  it('liste les plans archivés et demande la réouverture sans l’exécuter', async () => {
    const onReopen = vi.fn()
    renderScreen([demoPlan, finishedPlan], { onReopen })

    expect(screen.getByText('Sprint de Senlis')).toBeInTheDocument()
    expect(screen.getByText('12 sem. · terminé le 18 mai')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Rouvrir' }))
    expect(onReopen).toHaveBeenCalledWith('plan-senlis')
  })

  it('annonce la règle avant le geste : générer n’écrase rien', () => {
    renderScreen([demoPlan])

    expect(screen.getByText('Si tu en génères un second')).toBeInTheDocument()
    expect(screen.getByText(/n’est pas écrasé/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Générer un nouveau plan' })).toBeInTheDocument()
  })

  it('nomme le vide quand aucun plan n’est archivé', () => {
    renderScreen([demoPlan])
    expect(screen.getByText(/aucun plan archivé/)).toBeInTheDocument()
  })

  it('nomme le vide quand aucun plan n’est actif, et ne montre alors aucune frise', () => {
    renderScreen([finishedPlan])

    expect(screen.getByText('Aucun plan actif')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reprendre' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Natation/ })).not.toBeInTheDocument()
  })

  it('retombe sur le format du plan quand aucune course ne le nomme', () => {
    const unnamed: TrainingPlan = { ...finishedPlan, id: 'plan-hiver', format: 'Olympique', weeksCount: 16 }
    delete unnamed.raceId
    renderScreen([demoPlan, unnamed])

    expect(screen.getByText('Olympique')).toBeInTheDocument()
  })

  it('découpe la frise sur la répartition du plan en cours', () => {
    renderScreen([demoPlan])
    expect(screen.getByRole('img', { name: /Natation 22 %, Vélo 46 %, Course 33 %/ })).toBeInTheDocument()
  })
})
