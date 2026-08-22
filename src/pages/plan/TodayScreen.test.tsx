import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RailBlockProvider, useRailBlock } from '../../context/RailBlockContext'
import { TodayScreen } from './TodayScreen'
import { demoAthleteProfile, demoBikeWorkout, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import type { TrainingPlan, Workout } from '../../domain/types'

const saveWorkout = vi.fn()
const savePlan = vi.fn()
let catalogue: Workout[] = demoWorkouts

vi.mock('../../context/AppDataContext', () => ({
  useWorkouts: () => ({ workouts: catalogue, saveWorkout, deleteWorkout: vi.fn(), loading: false }),
  usePlans: () => ({ plans: [], savePlan, deletePlan: vi.fn(), loading: false }),
  useProfile: () => ({ profile: demoAthleteProfile, saveProfile: vi.fn(), loading: false }),
  useRaces: () => ({ races: [demoRace], saveRace: vi.fn(), deleteRace: vi.fn(), loading: false }),
}))

// Semaine 07 du plan de démonstration : lundi 15 → dimanche 21 juin 2026.
const NOW = new Date('2026-06-16T18:00:00.000Z')

/** `useBreakpoint` interroge `min-width: 768px` puis `min-width: 1024px` (voir setupTests.ts). */
function mockMatchMediaWidth(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidth = query.match(/min-width:\s*(\d+)px/)
    return {
      matches: minWidth ? width >= Number(minWidth[1]) : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList
  })
}

/** Rend ce que l'écran publie dans le rail de la coquille, sans monter la coquille entière. */
function RailProbe() {
  const block = useRailBlock()
  if (!block) return null
  return (
    <div data-testid="rail">
      {block.title} · {block.percent} % · {block.lines.join(' ')}
    </div>
  )
}

function renderScreen(today: string, plan: TrainingPlan = demoPlan) {
  return render(
    <MemoryRouter>
      <TodayScreen plan={plan} today={today} now={NOW} />
    </MemoryRouter>,
  )
}

function completed(workout: Workout, completedAt: string): Workout {
  return { ...workout, status: 'completed', completedAt }
}

beforeEach(() => {
  catalogue = demoWorkouts
  saveWorkout.mockReset()
  savePlan.mockReset()
})

describe('TodayScreen · en-tête', () => {
  it('names the week, the day and the weekly volume', () => {
    renderScreen('2026-06-16')
    expect(screen.getByText('Semaine 07 / 18')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mardi 16 juin')
    expect(screen.getByText('8 h 10')).toBeInTheDocument()
  })

  it('describes the discipline bar for screen readers', () => {
    renderScreen('2026-06-16')
    expect(screen.getByRole('img', { name: /Natation \d+ %/ })).toBeInTheDocument()
  })
})

describe('TodayScreen · une séance (02)', () => {
  it('shows the session, its badges and its planned metrics', () => {
    renderScreen('2026-06-16')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('3 × 12′ au seuil')
    expect(screen.getAllByRole('img', { name: 'Discipline V' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: 'Zone 4' })).toBeInTheDocument()
    expect(screen.getByText(/1 h 05 · 96 % FTP/)).toBeInTheDocument()
  })

  it('links to the week screen from the remaining sessions', () => {
    renderScreen('2026-06-16')
    expect(screen.getByRole('link', { name: 'voir la semaine →' })).toHaveAttribute('href', '/plan/semaine')
  })

  it('lists what remains this week with three-letter day labels', () => {
    renderScreen('2026-06-16')
    expect(screen.getByText('MER')).toBeInTheDocument()
    expect(screen.getByText('JEU')).toBeInTheDocument()
  })

  // Artboard 02 : la preuve est un appel de note en pied d'écran — « 1. » puis la phrase, la
  // qualification revenant en encre à la fin. Ni encart, ni pilule.
  it('renders the evidence note of the session as a numbered footnote', () => {
    renderScreen('2026-06-16')
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('preuve modérée')).toBeInTheDocument()
  })

  it('persists the session as completed when the box is ticked', async () => {
    const user = userEvent.setup()
    renderScreen('2026-06-16')
    await user.click(screen.getByRole('checkbox', { name: 'Marquer comme faite' }))
    expect(saveWorkout).toHaveBeenCalledOnce()
    const saved = saveWorkout.mock.calls[0][0] as Workout
    expect(saved.id).toBe(demoBikeWorkout.id)
    expect(saved.status).toBe('completed')
    expect(saved.completedAt).toBeTruthy()
  })
})

// Canevas S4 : `showSets` et `showWeekBars` sont faux en mobile, vrais dès la tablette. Ce que la
// largeur ajoute doit donc être absent à 390 px et présent à 834 comme à 1280.
describe('TodayScreen · deux colonnes (S4)', () => {
  it('keeps the block table and the week histogram out of the mobile flow', () => {
    renderScreen('2026-06-16')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Charge de la semaine/ })).not.toBeInTheDocument()
  })

  it.each([
    ['tablette', 834],
    ['desktop', 1280],
  ])('adds the block table and the week context on %s', (_name, width) => {
    mockMatchMediaWidth(width)
    renderScreen('2026-06-16')

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Bloc' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Cible' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Repos' })).toBeInTheDocument()
    // Une ligne par bloc de la séance, plus la ligne d'en-tête.
    expect(within(table).getAllByRole('row')).toHaveLength(demoBikeWorkout.blocks.length + 1)

    expect(screen.getByRole('img', { name: /Charge de la semaine/ })).toBeInTheDocument()
    expect(screen.getByText(/colonne en pointillé/)).toBeInTheDocument()
    expect(screen.getByText(/Prochaine référence/)).toBeInTheDocument()
  })

  it('offers the inert .FIT export at the bottom of the session column', () => {
    mockMatchMediaWidth(1280)
    renderScreen('2026-06-16')
    expect(screen.getByRole('button', { name: '.FIT' })).toBeDisabled()
  })

  it('names how many sessions remain in the desktop band', () => {
    mockMatchMediaWidth(1280)
    renderScreen('2026-06-16')
    expect(screen.getByText('5 séances restantes cette semaine')).toBeInTheDocument()
  })

  it('writes the day on a single line, as S4 does', () => {
    mockMatchMediaWidth(1280)
    renderScreen('2026-06-16')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mardi 16 juin')
  })

  // Canevas S4 l. 1556-1560 : le rail porte l'intitulé de semaine, la barre d'avancement du plan
  // et le décompte. L'écran les publie, la coquille les rend.
  it('publishes the week, the plan progress and the countdown to the rail', () => {
    render(
      <MemoryRouter>
        <RailBlockProvider>
          <TodayScreen plan={demoPlan} today="2026-06-16" now={NOW} />
          <RailProbe />
        </RailBlockProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('rail')).toHaveTextContent('Semaine 07 / 18 · 39 % · J-75')
  })
})

describe('TodayScreen · deux séances (15)', () => {
  it('numbers the two cards of the day and sums them', () => {
    renderScreen('2026-06-20')
    expect(screen.getByText('1 / 2 · première')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 · seconde')).toBeInTheDocument()
    expect(screen.getByText('Séance clé')).toBeInTheDocument()
    expect(screen.getAllByText('Enchaînement').length).toBeGreaterThan(0)
    expect(screen.getByText('1 h 30 cumulées')).toBeInTheDocument()
    expect(screen.getByText('2 séances')).toBeInTheDocument()
  })

  it('offers one checkbox per session', () => {
    renderScreen('2026-06-20')
    expect(screen.getAllByRole('checkbox', { name: 'Marquer comme faite' })).toHaveLength(2)
  })

  it('explains why both sessions share the day, with its proof level', () => {
    renderScreen('2026-06-20')
    expect(screen.getByText('Pourquoi les deux le même jour')).toBeInTheDocument()
    expect(screen.getByText(/jambes fatiguées/)).toBeInTheDocument()
  })

  it('keeps the day exports visible but inert', () => {
    renderScreen('2026-06-20')
    expect(screen.getByRole('button', { name: '.ICS' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '.PDF' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: '.FIT' })[0]).toBeDisabled()
  })
})

describe('TodayScreen · jour de repos (02a)', () => {
  it('says there is nothing to do, and that it is planned', () => {
    renderScreen('2026-06-19')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Rien aujourd’hui')
    expect(screen.getByText('Repos · prévu au plan')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('previews what the rest day prepares', () => {
    renderScreen('2026-06-19')
    const box = screen.getByText('Ce que ça prépare').parentElement as HTMLElement
    expect(box.textContent).toContain('demain')
    expect(box.textContent).toContain('puis ')
  })

  it('renders the light-session button but leaves it inert', () => {
    renderScreen('2026-06-19')
    expect(screen.getByRole('button', { name: 'Ajouter une séance légère' })).toBeDisabled()
  })
})

describe('TodayScreen · séance faite (02b)', () => {
  beforeEach(() => {
    catalogue = demoWorkouts.map((workout) =>
      workout.id === demoBikeWorkout.id ? completed(workout, '2026-06-16T16:00:00.000Z') : workout,
    )
  })

  it('marks the session done and dates it', () => {
    renderScreen('2026-06-16')
    expect(screen.getByText('Faite')).toBeInTheDocument()
    expect(screen.getByText('il y a 2 h')).toBeInTheDocument()
  })

  it('shows dashes instead of invented results', () => {
    renderScreen('2026-06-16')
    const box = screen.getByText('Ce que la séance a donné').parentElement as HTMLElement
    expect(within(box).getAllByText('—')).toHaveLength(3)
    expect(within(box).getByText(/pas de donnée/)).toBeInTheDocument()
  })

  it('restores the planned status when the completion is undone', async () => {
    const user = userEvent.setup()
    renderScreen('2026-06-16')
    await user.click(screen.getByRole('button', { name: 'Annuler « faite »' }))
    const saved = saveWorkout.mock.calls[0][0] as Workout
    expect(saved.status).toBe('planned')
    expect(saved.completedAt).toBeUndefined()
  })

  it('keeps the feeling note button inert', () => {
    renderScreen('2026-06-16')
    expect(screen.getByRole('button', { name: 'Noter le ressenti' })).toBeDisabled()
  })
})

describe('TodayScreen · semaine bloquée (02c)', () => {
  const pausedPlan: TrainingPlan = {
    ...demoPlan,
    weeks: [{ ...demoPlan.weeks[0], blockedReason: 'Déplacement pro' }],
  }

  it('states the pause without counting anything as missed', () => {
    renderScreen('2026-06-16', pausedPlan)
    expect(screen.getByText('Semaine 07 / 18 · en pause')).toBeInTheDocument()
    expect(screen.getByText('0 h 00')).toBeInTheDocument()
    expect(screen.getByText('depuis lundi')).toBeInTheDocument()
    expect(screen.getByText('« Déplacement pro »')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Semaine en pause, aucun volume prévu' })).toBeInTheDocument()
  })

  it('shows the waiting sessions struck through, and counts the rest', () => {
    renderScreen('2026-06-16', pausedPlan)
    expect(screen.getByText('Ce qui était prévu · en attente')).toBeInTheDocument()
    expect(screen.getByText('+ 5 autres séances en attente')).toBeInTheDocument()
  })

  it('clears the block of the current week when the plan is resumed', async () => {
    const user = userEvent.setup()
    renderScreen('2026-06-16', pausedPlan)
    await user.click(screen.getByRole('button', { name: 'Reprendre le plan' }))
    const saved = savePlan.mock.calls[0][0] as TrainingPlan
    expect(saved.weeks[0].blockedReason).toBeUndefined()
  })

  it('cannot block one more week when the plan holds no following one', () => {
    renderScreen('2026-06-16', pausedPlan)
    expect(screen.getByRole('button', { name: 'Bloquer une semaine de plus' })).toBeDisabled()
  })

  it('blocks the following week with the same reason when it exists', async () => {
    const user = userEvent.setup()
    const twoWeeks: TrainingPlan = {
      ...pausedPlan,
      weeks: [
        pausedPlan.weeks[0],
        {
          ...demoPlan.weeks[0],
          weekNumber: 8,
          days: demoPlan.weeks[0].days.map((day) => ({ ...day, date: `2026-06-2${day.date.slice(9)}` })),
        },
      ],
    }
    renderScreen('2026-06-16', twoWeeks)
    await user.click(screen.getByRole('button', { name: 'Bloquer une semaine de plus' }))
    const saved = savePlan.mock.calls[0][0] as TrainingPlan
    expect(saved.weeks[1].blockedReason).toBe('Déplacement pro')
  })
})

describe('TodayScreen · identifiants introuvables', () => {
  it('shows plan ids missing from the catalogue instead of hiding them', () => {
    catalogue = []
    renderScreen('2026-06-16')
    expect(screen.getByText(new RegExp(demoBikeWorkout.id))).toBeInTheDocument()
  })
})
