import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RailBlockProvider, useRailBlock } from '../../context/RailBlockContext'
import { TodayScreen } from './TodayScreen'
import { demoAthleteProfile, demoBikeWorkout, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import type { AthleteProfile, TrainingPlan, Workout } from '../../domain/types'

const saveWorkout = vi.fn()
const savePlan = vi.fn()
let catalogue: Workout[] = demoWorkouts
// Mutable : un plan généré sans profil enregistré est un cas réel, et il ne doit pas faire
// disparaître la colonne de contexte de S4.
let storedProfile: AthleteProfile | undefined = demoAthleteProfile

vi.mock('../../context/AppDataContext', () => ({
  useWorkouts: () => ({ workouts: catalogue, saveWorkout, deleteWorkout: vi.fn(), loading: false }),
  usePlans: () => ({ plans: [], savePlan, deletePlan: vi.fn(), loading: false }),
  useProfile: () => ({ profile: storedProfile, saveProfile: vi.fn(), loading: false }),
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
  storedProfile = demoAthleteProfile
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

// Le nouvel artboard 02 pose le déroulé chiffré dès 390 px — il ne dépend plus de la largeur.
// Ce que la largeur ajoute, c'est la colonne de contexte de S4 (`showWeekBars`).
describe('TodayScreen · deux colonnes (S4)', () => {
  it('writes the block table in the mobile flow, but not the week histogram', () => {
    renderScreen('2026-06-16')
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: /Déroulé/ })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Charge de la semaine/ })).not.toBeInTheDocument()
  })

  it.each([
    ['tablette', 834],
    ['desktop', 1280],
  ])('keeps the block table and adds the week context on %s', (_name, width) => {
    mockMatchMediaWidth(width)
    renderScreen('2026-06-16')

    const table = screen.getByRole('table')
    // Le canevas compte les blocs dans l'en-tête, puis nomme l'allure et le repos.
    expect(
      within(table).getByRole('columnheader', { name: `Déroulé · ${demoBikeWorkout.blocks.length} blocs` }),
    ).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Allure' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Repos' })).toBeInTheDocument()
    // Une ligne par bloc de la séance, plus la ligne d'en-tête.
    expect(within(table).getAllByRole('row')).toHaveLength(demoBikeWorkout.blocks.length + 1)

    expect(screen.getByRole('img', { name: /Charge de la semaine/ })).toBeInTheDocument()
    expect(screen.getByText(/colonne en pointillé/)).toBeInTheDocument()
    expect(screen.getByText(/Prochaine référence/)).toBeInTheDocument()
  })

  it('shows the three figures of the session and the way to its whole sheet', () => {
    renderScreen('2026-06-16')
    // La séance de vélo de démonstration n'a pas de distance enregistrée : la cellule cède la
    // place à la zone plutôt que d'afficher un tiret, et la cible s'annonce en intensité.
    expect(screen.getByText('Zone')).toBeInTheDocument()
    expect(screen.getByText('Durée')).toBeInTheDocument()
    expect(screen.getByText(/Intensité cible/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Séance entière/ })).toHaveAttribute(
      'href',
      `/workouts/${demoBikeWorkout.id}`,
    )
  })

  it('reads the target of a bike session off its power, not off a pace it does not carry', () => {
    renderScreen('2026-06-16')
    const table = screen.getByRole('table')
    // Avant, toute séance de vélo n'affichait que des tirets : seul `pace` était lu.
    expect(within(table).getAllByText(/% FTP/).length).toBeGreaterThan(0)
  })

  // Les états sans artboard large — 02a, 02b, 02c — restaient sur leur colonne mobile bornée,
  // soit 540 px perdus au milieu d'un écran de 1 850. Ils prennent le même cadre que S4, et la
  // liste de la semaine passe à droite au lieu d'être écrite deux fois.
  it.each([
    ['jour de repos', '2026-06-18', 'Reste cette semaine'],
    ['journée finie', '2026-06-15', 'Prochaine échéance'],
  ])('gives the %s state the two-column frame, without doubling its week list', (_name, day, label) => {
    mockMatchMediaWidth(1280)
    catalogue = demoWorkouts.map((workout) =>
      day === '2026-06-15' ? completed(workout, '2026-06-15T08:00:00.000Z') : workout,
    )
    renderScreen(day)

    expect(screen.getByRole('img', { name: /Charge de la semaine/ })).toBeInTheDocument()
    expect(screen.getAllByText(label)).toHaveLength(1)
  })

  // Un plan généré sans profil enregistré faisait disparaître la colonne de contexte, et donc la
  // disposition à deux colonnes : l'écran retombait sur son flux mobile au milieu du desktop.
  it('keeps the week context on desktop even without an athlete profile', () => {
    storedProfile = undefined
    mockMatchMediaWidth(1280)
    renderScreen('2026-06-16')

    expect(screen.getByRole('img', { name: /Charge de la semaine/ })).toBeInTheDocument()
    expect(screen.getByText('Reste cette semaine')).toBeInTheDocument()
    // Seule la ligne qui dépend vraiment du profil se tait.
    expect(screen.queryByText(/Prochaine référence/)).not.toBeInTheDocument()
  })

  it('mène le .FIT au bas de la colonne vers la feuille d’export de CETTE séance', () => {
    mockMatchMediaWidth(1280)
    renderScreen('2026-06-16')
    expect(screen.getByRole('link', { name: '.FIT' }).getAttribute('href')).toMatch(/^\/exports\?seance=/)
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

  it('mène les trois exports de la journée à la feuille, semaine et séance nommées', () => {
    renderScreen('2026-06-20')
    for (const format of ['.ICS', '.PDF']) {
      expect(screen.getByRole('link', { name: format }).getAttribute('href')).toMatch(/^\/exports\?semaine=/)
    }
    expect(screen.getAllByRole('link', { name: '.FIT' })[0].getAttribute('href')).toMatch(/^\/exports\?seance=/)
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

  /**
   * « Ajouter une séance légère » était grise sous un `title` qu'aucun doigt ne survole, et rien
   * dans le produit ne sait insérer une séance dans une semaine. Une commande morte de moins, une
   * sortie qui marche de plus.
   */
  it('mène à la bibliothèque plutôt que d’offrir une commande morte', () => {
    renderScreen('2026-06-19')
    expect(screen.queryByRole('button', { name: 'Ajouter une séance légère' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Parcourir la bibliothèque' })).toBeEnabled()
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
