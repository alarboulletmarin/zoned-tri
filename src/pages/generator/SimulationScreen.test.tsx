import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TrainingPlan, Workout } from '../../domain/types'
import type { GeneratedPlan } from '../../domain/planGenerator/summary'
import { SimulationScreen } from './SimulationScreen'

// Plan fabriqué à la main : l'écran ne doit dépendre que du contrat `GeneratedPlan`, jamais du
// moteur de génération. Les durées sont choisies pour donner des compteurs vérifiables à l'œil :
// 600 min sur 2 semaines = 5 h/sem, 3 séances (le renfort « R » n'en est pas une), affûtage 2 sem,
// et 420 min faciles sur 540 min zonées = 78 % en Z1–Z2.
const workouts: Workout[] = [
  {
    id: 'w-swim',
    title: 'Endurance bassin',
    discipline: 'N',
    zone: 'Z2',
    durationMin: 120,
    blocks: [],
    status: 'planned',
  },
  {
    id: 'w-bike',
    title: 'Sortie longue',
    discipline: 'V',
    zone: 'Z2',
    durationMin: 300,
    blocks: [],
    status: 'planned',
  },
  {
    id: 'w-run',
    title: 'Seuil',
    discipline: 'C',
    zone: 'Z4',
    durationMin: 120,
    blocks: [],
    status: 'planned',
  },
  {
    id: 'w-rest',
    title: 'Mobilité',
    discipline: 'R',
    zone: null,
    durationMin: 60,
    blocks: [],
    status: 'planned',
  },
]

const plan: TrainingPlan = {
  id: 'sim-plan',
  format: 'Olympique',
  startDate: '2026-06-15',
  endDate: '2026-06-28',
  weeksCount: 2,
  status: 'active',
  settings: {
    weeklyVolumeTargetMin: 300,
    availableDays: [true, true, true, true, false, true, true],
    maxSessionsPerDiscipline: { N: 2, V: 3, C: 3 },
  },
  constraints: { blockedWeeks: [] },
  referencesSnapshot: {},
  phases: [
    { name: 'Base', weeksCount: 0, status: 'upcoming' },
    { name: 'Taper', weeksCount: 2, status: 'upcoming' },
  ],
  intensityDistribution: { z1z2Percent: 78, z3Percent: 0, z4PlusPercent: 22 },
  weeks: [
    {
      weekNumber: 1,
      phase: 'Taper',
      totalVolumeMin: 600,
      volumeByDiscipline: { N: 120, V: 300, C: 120, R: 60 },
      days: [
        { date: '2026-06-15', workoutIds: ['w-swim'] },
        { date: '2026-06-16', workoutIds: ['w-bike'] },
        { date: '2026-06-17', workoutIds: ['w-run'] },
        { date: '2026-06-18', workoutIds: ['w-rest'] },
      ],
      easyPercent: 78,
      hardPercent: 22,
    },
  ],
}

const fallback: GeneratedPlan = { plan, workouts }

function renderScreen(overrides: Partial<Parameters<typeof SimulationScreen>[0]> = {}) {
  const onAcceptFallback = vi.fn()
  const onForceRequested = vi.fn()
  render(
    <SimulationScreen
      requestedFormat="70.3"
      requestedRaceDate="2026-08-30"
      weeksAvailable={11}
      fallback={fallback}
      onAcceptFallback={onAcceptFallback}
      onForceRequested={onForceRequested}
      onBack={vi.fn()}
      {...overrides}
    />,
  )
  return { onAcceptFallback, onForceRequested }
}

/** Valeur du compteur portant ce libellé (le libellé et la valeur sont deux nœuds frères). */
function counterValue(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? ''
}

describe('SimulationScreen', () => {
  it('states plainly that nothing has been saved', () => {
    renderScreen()
    expect(screen.getByText('Simulation · aucune donnée enregistrée')).toBeInTheDocument()
  })

  it('shows counters derived from the plan that was actually built', () => {
    renderScreen()

    expect(counterValue('SÉANCES')).toBe('3')
    expect(counterValue('H / SEM')).toBe('5')
    expect(counterValue('AFFÛTAGE')).toBe('2 sem')
  })

  it('reads the intensity split off the placed sessions', () => {
    renderScreen()

    expect(screen.getByText('Z1–Z2 78 %')).toBeInTheDocument()
    expect(screen.getByText('Z3 0 %')).toBeInTheDocument()
    expect(screen.getByText('Z4+ 22 %')).toBeInTheDocument()
  })

  // Le canevas 06 ne pose PAS la qualification à côté de l'affirmation : il met un appel de note
  // (« Distribution pyramidale.³ ») et renvoie la preuve au pied de l'écran.
  it('sends the proof of the intensity claim to a footnote, as the artboard does', () => {
    renderScreen()

    expect(screen.getByText(/Distribution pyramidale\./)).toBeInTheDocument()
    expect(screen.getByText('3.')).toBeInTheDocument()
    expect(screen.getByText(/Distribution polarisée \/ pyramidale/)).toBeInTheDocument()
    expect(screen.getByText('preuve solide')).toBeInTheDocument()
  })

  it('names the requested format and the weeks it is missing', () => {
    renderScreen()

    expect(screen.getByText(/Ton 70\.3 du 30 août n'est pas jouable dans les délais/)).toBeInTheDocument()
    // 16 semaines de plancher pour un 70.3, 11 disponibles.
    expect(screen.getByText(/Il te manque 5 semaines sur les 16/)).toBeInTheDocument()
  })

  it('stays usable and honest when no format at all fits the remaining weeks', () => {
    renderScreen({ weeksAvailable: 4 })

    expect(screen.getByText(/Aucun format ne tient dans 4 semaines/)).toBeInTheDocument()
    expect(counterValue('SÉANCES')).toBe('3')
  })

  it('offers the fallback and the way past it, without deciding for the athlete', async () => {
    const user = userEvent.setup()
    const { onAcceptFallback, onForceRequested } = renderScreen()

    await user.click(screen.getByRole('button', { name: 'Utiliser ce plan Olympique' }))
    expect(onAcceptFallback).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Générer le 70.3 quand même' }))
    expect(onForceRequested).toHaveBeenCalledTimes(1)
  })
})
