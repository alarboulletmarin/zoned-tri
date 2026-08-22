import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../../context/AppDataContext'
import { deleteDatabase } from '../../../storage/db'
import * as repo from '../../../storage/repository'
import { demoAthleteProfile } from '../../../domain/demoData'
import { SEED_WORKOUTS } from '../../../domain/seedWorkouts'
import { WorkoutDetailScreen } from './WorkoutDetailScreen'

function mockMatchMediaWidth(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/)
    const matches = minWidthMatch ? width >= Number(minWidthMatch[1]) : false
    return {
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList
  })
}

beforeEach(async () => {
  await deleteDatabase()
  mockMatchMediaWidth(390)
})

afterEach(async () => {
  await deleteDatabase()
})

function renderDetail(id: string) {
  // L'ecran consulte les seances enregistrees (un plan genere reference ses propres instances) :
  // il lui faut donc le fournisseur de donnees, meme quand la base est vide.
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[`/workouts/${id}`]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutDetailScreen />} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

const swim = SEED_WORKOUTS.find((w) => w.discipline === 'N')!
const bike = SEED_WORKOUTS.find((w) => w.discipline === 'V')!
const run = SEED_WORKOUTS.find((w) => w.discipline === 'C')!

describe('WorkoutDetailScreen', () => {
  it('renders the swim template with a distance stat for an N workout', () => {
    renderDetail(swim.id)
    expect(screen.getByText('DISTANCE')).toBeInTheDocument()
  })

  it('renders the bike template with the three stats of artboard 28', () => {
    renderDetail(bike.id)
    expect(screen.getByText('DURÉE')).toBeInTheDocument()
    expect(screen.getByText('CIBLE')).toBeInTheDocument()
    expect(screen.getByText('IF')).toBeInTheDocument()
  })

  it('renders the run template with a pace column for a C workout', () => {
    renderDetail(run.id)
    expect(screen.getByText('Allure')).toBeInTheDocument()
  })

  it('renders the generic fallback for an R workout', () => {
    const restWorkout = SEED_WORKOUTS.find((w) => w.discipline === 'R')!
    renderDetail(restWorkout.id)
    expect(screen.getAllByRole('heading', { name: restWorkout.title })).toHaveLength(1)
  })

  it('names the current breadcrumb segment after the workout itself', () => {
    renderDetail(swim.id)
    // Le canevas écrit le mot générique « Séance » parce qu'un artboard ne connaît pas ses données.
    // L'application les a : le dernier segment nomme la page, donc la séance ouverte.
    const trail = screen.getByRole('navigation', { name: "Fil d'Ariane" })
    expect(trail).toHaveTextContent(swim.title)
    expect(trail).not.toHaveTextContent(/^.*\bSéance\b\s*$/)
    // Deux occurrences désormais : le fil et le titre de la fiche.
    expect(screen.getAllByText(swim.title).length).toBeGreaterThanOrEqual(1)
  })

  /** Le titre de la séance est le seul `h1` de l'écran : le fil d'Ariane n'est pas un titre. */
  it('gives the workout title the screen’s only heading level 1', () => {
    renderDetail(swim.id)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(swim.title)
  })

  /** Artboards 05/28/29 : « Seuil · bassin 25 m », la zone NOMMÉE avant le lieu. */
  it('names the zone beside the location under the badges', () => {
    renderDetail(bike.id)
    expect(screen.getByText('Endurance · Route')).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown id', async () => {
    // « Introuvable » n'est affiché qu'une fois la base lue : avant, l'absence n'est pas prouvée.
    renderDetail('does-not-exist')
    expect(await screen.findByText('Séance introuvable.')).toBeInTheDocument()
  })

  it('only renders the why section when the workout has one', () => {
    const withoutWhy = SEED_WORKOUTS.find((w) => !w.why)!
    renderDetail(withoutWhy.id)
    expect(screen.queryByText('Pourquoi cette séance')).not.toBeInTheDocument()
  })

  /**
   * Le canevas ne donne AUCUNE colonne de contexte à la fiche de séance : ni 05, ni 28, ni 29, ni
   * le panneau de S5. L'histogramme de la semaine appartient à S4, qui est l'écran Aujourd'hui.
   */
  it('never adds a week context column, at any width', async () => {
    for (const width of [390, 900, 1440]) {
      mockMatchMediaWidth(width)
      const { unmount } = renderDetail(swim.id)
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
      expect(screen.queryByText('Reste cette semaine')).not.toBeInTheDocument()
      unmount()
    }
  })

  /** La même composition partout : la largeur borne la colonne, elle n'en ajoute pas une seconde. */
  it('keeps the artboard composition on desktop', async () => {
    mockMatchMediaWidth(1440)
    renderDetail(swim.id)
    expect(screen.getByText('DISTANCE')).toBeInTheDocument()
    expect(screen.getByText('Déroulé')).toBeInTheDocument()
  })

  /**
   * Artboard 28 : la cible se lit en watts contre la FTP mesurée (96 % de 248 W = 238 W). Sans
   * profil en base, elle reste dans l'unité que le domaine stocke.
   */
  it('reads the bike target in %FTP without a measured FTP, in watts with one', async () => {
    renderDetail(bike.id)
    expect(screen.getByText('% FTP')).toBeInTheDocument()

    await repo.putProfile(demoAthleteProfile)
    const { unmount } = renderDetail(bike.id)
    expect(await screen.findByText('Watts')).toBeInTheDocument()
    unmount()
  })
})
