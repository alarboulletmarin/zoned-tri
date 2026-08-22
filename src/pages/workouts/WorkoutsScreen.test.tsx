import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { demoAthleteProfile } from '../../domain/demoData'
import { RailBlockProvider, useRailBlock } from '../../context/RailBlockContext'
import type { WorkoutFilters } from '../../domain/workoutFilters'
import { EMPTY_FILTERS } from '../../domain/workoutFilters'
import { WorkoutsScreen } from './WorkoutsScreen'

vi.mock('../../context/AppDataContext', () => ({
  useProfile: () => ({ profile: demoAthleteProfile, saveProfile: vi.fn(), loading: false }),
}))

const NATATION = SEED_WORKOUTS.filter((workout) => workout.discipline === 'N').length

/** `useBreakpoint` interroge `min-width: 768px` puis `min-width: 1024px` (voir setupTests.ts). */
function mockWidth(width: number) {
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

beforeEach(() => mockWidth(390))

function renderScreen(props: Parameters<typeof WorkoutsScreen>[0] = {}) {
  return render(
    <MemoryRouter>
      <WorkoutsScreen {...props} />
    </MemoryRouter>,
  )
}

/** Artboard 26 : natation · Z6 · 18–30 min · eau libre — quatre filtres, aucune séance. */
const DEAD_END: WorkoutFilters = {
  ...EMPTY_FILTERS,
  disciplines: ['N'],
  zones: ['Z6'],
  duration: { min: 18, max: 30 },
  locations: ['open_water'],
}

describe('WorkoutsScreen · artboard 07', () => {
  it('compte sur le catalogue réel, jamais sur les 312 de la maquette', () => {
    renderScreen()
    expect(screen.getByText(new RegExp(`sur ${SEED_WORKOUTS.length} ·`))).toBeInTheDocument()
    expect(screen.queryByText(/312/)).not.toBeInTheDocument()
  })

  it('coupe le titre d’affiche sans `<br>` : « Bibliothèque » reste un mot pour l’assistance', () => {
    const { container } = renderScreen()
    expect(screen.getByRole('heading', { name: 'Bibliothèque' })).toBeInTheDocument()
    expect(container.querySelector('br')).toBeNull()
  })

  /**
   * Le cœur de la reprise : le canevas ne met NI carré de discipline sur chaque ligne, NI jeton
   * « BRICK ». Brick est une étiquette transverse, filtrable dans la feuille 40 et nulle part
   * ailleurs. Ce test existe pour que les deux ne reviennent pas.
   */
  it('ne pose ni carré de discipline ni jeton BRICK sur les lignes de la liste', () => {
    renderScreen()
    expect(screen.queryByText('BRICK')).not.toBeInTheDocument()
    const brick = SEED_WORKOUTS.find((workout) => workout.isBrick)
    expect(brick).toBeDefined()
    const row = screen.getByRole('button', { name: new RegExp(brick!.title) })
    expect(within(row).queryByLabelText(/^Discipline/)).not.toBeInTheDocument()
    expect(within(row).getByLabelText(/^Zone|Aucune zone/)).toBeInTheDocument()
  })

  it('ouvre la feuille de filtres et resserre la liste sur une discipline', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /^Filtres/ }))
    const sheet = screen.getByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: `N ${NATATION}` }))
    await user.click(within(sheet).getByRole('button', { name: 'Fermer les filtres' }))

    expect(screen.getByText(new RegExp(`^${NATATION} séances sur`))).toBeInTheDocument()
  })

  it('retire un seul jeton sans effacer les autres', async () => {
    const user = userEvent.setup()
    renderScreen({ initialFilters: { ...EMPTY_FILTERS, disciplines: ['N'], zones: ['Z2'] } })

    await user.click(screen.getByRole('button', { name: 'Retirer le filtre Z2' }))
    expect(screen.getByText(new RegExp(`^${NATATION} séances sur`))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer le filtre Natation' })).toBeInTheDocument()
  })
})

describe('WorkoutsScreen · artboard 26 · rien à ce croisement', () => {
  it('nomme le filtre coupable, chiffre ce que chacun coûte et propose les plus proches', () => {
    renderScreen({ initialFilters: DEAD_END })

    expect(screen.getByText('Rien à ce croisement')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ce que chaque filtre coûte' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Les plus proches' })).toBeInTheDocument()
    // Quatre étapes de cascade, la dernière à zéro.
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText(/Le filtre le plus strict est/)).toBeInTheDocument()
    expect(screen.getByText(/l’app propose, tu décides/)).toBeInTheDocument()
  })

  it('laisse retirer le filtre coupable depuis le vide', async () => {
    const user = userEvent.setup()
    renderScreen({ initialFilters: DEAD_END })

    await user.click(screen.getByRole('button', { name: 'Retirer la zone' }))
    expect(screen.queryByText('Rien à ce croisement')).not.toBeInTheDocument()
  })

  it('efface le titre d’affiche et la rangée de commandes, comme l’artboard', () => {
    renderScreen({ initialFilters: DEAD_END })
    expect(screen.queryByRole('heading', { name: 'Bibliothèque' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Filtres/ })).not.toBeInTheDocument()
  })
})

describe('WorkoutsScreen · artboard S5 · desktop', () => {
  beforeEach(() => mockWidth(1280))

  it('sélectionne la première séance et change de fiche sans quitter la liste', async () => {
    const user = userEvent.setup()
    renderScreen()

    const rows = screen.getAllByRole('button', { name: /Discipline/ })
    expect(rows[0]).toHaveAttribute('aria-current', 'true')

    await user.click(rows[2])
    expect(window.location.pathname).not.toMatch(/^\/workouts\/.+/)
    expect(rows[2]).toHaveAttribute('aria-current', 'true')
    expect(rows[0]).not.toHaveAttribute('aria-current')
  })

  it('abandonne le titre d’affiche et le décompte du corps, que la barre de jetons reprend', () => {
    renderScreen()
    expect(screen.queryByRole('heading', { name: 'Bibliothèque' })).not.toBeInTheDocument()
    expect(screen.queryByText(/triées par durée/)).not.toBeInTheDocument()
    expect(screen.getByText(`${SEED_WORKOUTS.length} séances sur ${SEED_WORKOUTS.length}`)).toBeInTheDocument()
  })

  it('porte les deux pieds de l’artboard : celui de la liste et celui de l’écran', () => {
    renderScreen()
    expect(screen.getByText(/La liste garde sa place/)).toBeInTheDocument()
    expect(screen.getByText(/montre ce que la semaine devient/)).toBeInTheDocument()
  })

  it('ne date l’allure que sur une séance de natation, et depuis la référence du profil', async () => {
    const user = userEvent.setup()
    renderScreen({ initialFilters: { ...EMPTY_FILTERS, disciplines: ['N'] } })

    expect(screen.getByText(/^Allure dérivée de ton CSS du /)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retirer le filtre Natation' }))
    const bike = screen.getAllByRole('button', { name: /Discipline V/ })[0]
    await user.click(bike)
    expect(screen.queryByText(/^Allure dérivée/)).not.toBeInTheDocument()
  })

  it('publie le décompte dans le bloc du rail, et seulement sur desktop', async () => {
    function RailProbe() {
      const block = useRailBlock()
      return <span data-testid="rail-block">{block ? `${block.title} · ${block.lines.join(' · ')}` : '—'}</span>
    }

    function renderWithRail() {
      return render(
        <MemoryRouter>
          <RailBlockProvider>
            <RailProbe />
            <WorkoutsScreen />
          </RailBlockProvider>
        </MemoryRouter>,
      )
    }

    mockWidth(390)
    const { unmount } = renderWithRail()
    expect(screen.getByTestId('rail-block')).toHaveTextContent('—')
    unmount()

    mockWidth(1280)
    const user = userEvent.setup()
    renderWithRail()
    expect(screen.getByTestId('rail-block')).toHaveTextContent(
      `Bibliothèque · ${SEED_WORKOUTS.length} séances · ${SEED_WORKOUTS.length} après filtres`,
    )

    await user.click(screen.getByRole('button', { name: /^Filtres/ }))
    const sheet = screen.getByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: `N ${NATATION}` }))
    await user.click(within(sheet).getByRole('button', { name: 'Fermer les filtres' }))

    expect(screen.getByTestId('rail-block')).toHaveTextContent(
      `Bibliothèque · ${SEED_WORKOUTS.length} séances · ${NATATION} après filtres`,
    )
  })
})
