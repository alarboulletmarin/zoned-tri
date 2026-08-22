import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { demoAthleteProfile, demoPlan, demoWorkouts } from '../../domain/demoData'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import type { AthleteProfile } from '../../domain/types'
import { ToolsScreen } from './ToolsScreen'

let storedProfile: AthleteProfile | undefined = demoAthleteProfile

vi.mock('../../context/AppDataContext', () => ({
  useProfile: () => ({ profile: storedProfile, saveProfile: vi.fn(), loading: false }),
  usePlans: () => ({ plans: [], savePlan: vi.fn(), deletePlan: vi.fn(), loading: false }),
  useWorkouts: () => ({ workouts: demoWorkouts, saveWorkout: vi.fn(), deleteWorkout: vi.fn(), loading: false }),
}))

const TODAY = '2026-08-21'

function matchMediaReturning(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  storedProfile = demoAthleteProfile
  matchMediaReturning(false)
})

function renderScreen(profile: AthleteProfile | undefined) {
  return render(
    <MemoryRouter>
      <ToolsScreen profile={profile} plans={[]} catalogue={demoWorkouts} today={TODAY} />
    </MemoryRouter>,
  )
}

describe('ToolsScreen · artboard 12 (mobile)', () => {
  it('titles the screen and dates the last test', () => {
    renderScreen(demoAthleteProfile)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mes références')
    expect(screen.getByText('saisies à la main · dernier test 3 août')).toBeInTheDocument()
  })

  it('shows the three references with their unit and their right-hand column', () => {
    renderScreen(demoAthleteProfile)
    expect(screen.getByText('1:32')).toBeInTheDocument()
    expect(screen.getByText('test 400/200')).toBeInTheDocument()
    expect(screen.getByText('3,4 W/kg')).toBeInTheDocument()
    expect(screen.getByText('VMA 17,2')).toBeInTheDocument()
  })

  it('fills the Mesure / Valeur table', () => {
    renderScreen(demoAthleteProfile)
    expect(screen.getByText('Taux de sudation')).toBeInTheDocument()
    expect(screen.getByText('1,1 L/h')).toBeInTheDocument()
    expect(screen.getByText('186 bpm')).toBeInTheDocument()
  })

  it('carries note 7 under the FTP', () => {
    renderScreen(demoAthleteProfile)
    expect(screen.getByText('7.')).toBeInTheDocument()
    expect(screen.getByText(/heuristique de terrain, pas un protocole validé/)).toBeInTheDocument()
  })

  it('opens the calculators through the screen’s single primary action', () => {
    renderScreen(demoAthleteProfile)
    expect(screen.getByRole('button', { name: 'Ouvrir les calculateurs' })).toBeEnabled()
  })

  it('names the emptiness rather than showing a mute blank', () => {
    storedProfile = undefined
    renderScreen(undefined)
    expect(screen.getByText('Aucune référence')).toBeInTheDocument()
    expect(screen.getByText(/rien n’est estimé à la place/)).toBeInTheDocument()
  })
})

describe('ToolsScreen · artboard S8 (desktop)', () => {
  function renderDesktop(profile: AthleteProfile = demoAthleteProfile) {
    matchMediaReturning(true)
    const test = SEED_WORKOUTS.find((workout) => workout.id === 'bike-test-ftp-20min')!
    const plan = {
      ...demoPlan,
      weeks: [
        {
          ...demoPlan.weeks[0],
          weekNumber: 9,
          days: demoPlan.weeks[0].days.map((day, index) =>
            index === 4 ? { ...day, workoutIds: [test.id] } : { ...day, workoutIds: [] },
          ),
        },
      ],
    }
    return render(
      <MemoryRouter>
        <ToolsScreen profile={profile} plans={[plan]} catalogue={[test]} today={plan.weeks[0].days[0].date} />
      </MemoryRouter>,
    )
  }

  it('counts the twelve calculators and the measured references in the header', () => {
    renderDesktop()
    expect(screen.getByText('12 calculateurs · 3 références mesurées')).toBeInTheDocument()
  })

  it('lays the twelve calculators out as cards', () => {
    renderDesktop()
    expect(screen.getAllByRole('button', { name: /^Ouvrir le calculateur/ })).toHaveLength(12)
  })

  it('says where the references come from, with their age', () => {
    renderDesktop()
    // « CSS natation » est à la fois le titre d'une carte et la ligne de la colonne de droite.
    expect(screen.getAllByText('CSS natation').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/^testé le 3 août/)).toBeInTheDocument()
    expect(screen.getByText('Allure seuil course')).toBeInTheDocument()
  })

  it('names the next reference test found in the plan', () => {
    renderDesktop()
    expect(screen.getByText('Test FTP 20 minutes')).toBeInTheDocument()
    expect(screen.getByText('semaine 09 · dans 4 jours')).toBeInTheDocument()
  })

  it('shows a dash and its legend when the heart rate was never measured', () => {
    renderDesktop({ ...demoAthleteProfile, maxHeartRateBpm: 0 })
    expect(screen.getByText('Le tiret veut dire « pas de donnée »')).toBeInTheDocument()
    expect(screen.getByText(/aucune FC max n’est estimée d’après ton âge/)).toBeInTheDocument()
  })

  it('keeps the two unwired actions inert, each with its reason', () => {
    renderDesktop()
    const save = screen.getByRole('button', { name: 'Enregistrer une référence' })
    expect(save).toBeDisabled()
    expect(save).toHaveAttribute('title', expect.stringContaining('quelles séances bougent'))
    expect(screen.getByRole('button', { name: '.CSV' })).toBeDisabled()
  })
})
