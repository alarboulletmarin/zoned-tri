import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { render } from '../../testing/render'
import userEvent from '@testing-library/user-event'
import { createInitialForm } from '../../domain/planGenerator/form'
import { generatePlan } from '../../domain/planGenerator/generatePlan'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import type { PlanJournalEntry, Race, TrainingPlan } from '../../domain/types'
import { PlanSettingsScreen } from './PlanSettingsScreen'
import { PlanSettingChangeScreen } from './PlanSettingChangeScreen'
import { PlanJournalScreen } from './PlanJournalScreen'

const TODAY = '2026-06-15'

const RACE: Race = {
  id: 'race-vichy',
  name: 'Vichy',
  // Le bout du plan : c'est ainsi que `generatePlan` écrit la fiche de course.
  date: '2026-10-04',
  format: '70.3',
  role: 'primary_goal',
  distances: { swimM: 1900, bikeKm: 90, runKm: 21.1 },
}

function buildPlan(): TrainingPlan {
  const form = {
    ...createInitialForm(undefined, TODAY),
    raceName: 'Vichy',
    weeklyVolumeTargetMin: 450,
    constraints: {
      pool: true,
      openWater: false,
      homeTrainer: true,
      powerMeter: false,
      timeTrialBike: false,
      blockedWeeks: [
        { weekNumber: 4, reason: 'déplacement pro' },
        { weekNumber: 5, reason: 'déplacement pro' },
      ],
    },
  }
  return generatePlan(form, TODAY, SEED_WORKOUTS, { idPrefix: 'plan-test' }).plan
}

// --- 37 -----------------------------------------------------------------------------------

describe('37 · Réglages du plan', () => {
  function renderScreen(onOpenSetting = vi.fn()) {
    const plan = buildPlan()
    render(
      <PlanSettingsScreen
        plan={plan}
        race={RACE}
        onBack={vi.fn()}
        onOpenSetting={onOpenSetting}
        onOpenJournal={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    )
    return { plan, onOpenSetting }
  }

  it('rend les six réglages du canevas avec leur valeur', () => {
    renderScreen()

    expect(screen.getByText('Format et course')).toBeInTheDocument()
    expect(screen.getByText('70.3 Vichy')).toBeInTheDocument()
    expect(screen.getByText('Volume hebdo')).toBeInTheDocument()
    expect(screen.getByText('7 h 30')).toBeInTheDocument()
    expect(screen.getByText('6 · sauf ven.')).toBeInTheDocument()
    expect(screen.getByText('04 et 05')).toBeInTheDocument()
  })

  it('ouvre l’avant / après depuis la ligne, et seulement pour ce qui se rejoue', async () => {
    const { onOpenSetting } = renderScreen()

    await userEvent.click(screen.getByRole('button', { name: /Volume hebdo/ }))
    expect(onOpenSetting).toHaveBeenCalledWith('volume')

    // Format et date refont le plan entier : elles ne sont pas des boutons.
    expect(screen.queryByRole('button', { name: /Format et course/ })).not.toBeInTheDocument()
  })

  it('dit pourquoi une décision du moteur ne se change pas, au lieu de laisser un bouton mort', () => {
    renderScreen()

    const inert = screen
      .getAllByRole('button', { name: 'Changer' })
      .filter((button) => (button as HTMLButtonElement).disabled)

    // Le motif vivait dans un `title` : au doigt, il n'existait pas. Il est désormais à l'écran,
    // et rattaché à la commande par `aria-describedby`.
    expect(inert.length).toBeGreaterThan(0)
    for (const button of inert) {
      expect(button).not.toHaveAttribute('title')
      expect(button).toHaveAccessibleDescription()
    }
  })

  it('annonce la règle avant tout geste', () => {
    renderScreen()
    expect(
      screen.getByText(/Aucun réglage ne s’applique sans te montrer d’abord la semaine avant \/ après/),
    ).toBeInTheDocument()
  })
})

// --- 38 -----------------------------------------------------------------------------------

describe('38 · Avant / après', () => {
  function renderScreen(onApply = vi.fn()) {
    const plan = buildPlan()
    render(
      <PlanSettingChangeScreen
        plan={plan}
        workouts={[]}
        catalogue={SEED_WORKOUTS}
        setting="volume"
        race={RACE}
        today={TODAY}
        onBack={vi.fn()}
        onApply={onApply}
      />,
    )
    return { plan, onApply }
  }

  it('annonce dans le bandeau que rien n’est enregistré', () => {
    renderScreen()
    expect(screen.getByText('non enregistré')).toBeInTheDocument()
  })

  it('ouvre sur la valeur d’avant, des deux côtés — rien n’a encore bougé', () => {
    renderScreen()
    expect(screen.getAllByText('7 h 30').length).toBe(2)
  })

  it('n’écrit rien tant que la valeur n’a pas changé', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /Appliquer aux/ })).toBeDisabled()
  })

  it('recalcule l’après avec le moteur dès que le curseur bouge, puis applique', async () => {
    const { onApply } = renderScreen()
    const slider = screen.getByLabelText('Nouveau volume hebdomadaire')

    // `fireEvent.change` : userEvent ne pilote pas les curseurs, et poser `value` à la main
    // n'atteindrait pas le suivi de valeur de React.
    fireEvent.change(slider, { target: { value: '600' } })

    expect(screen.getByText('10 h')).toBeInTheDocument()
    const apply = screen.getByRole('button', { name: /Appliquer aux/ })
    expect(apply).toBeEnabled()

    await userEvent.click(apply)
    expect(onApply).toHaveBeenCalledTimes(1)
    const [applied, before, after, scope] = onApply.mock.calls[0]
    expect(before).toBe('7 h 30')
    expect(after).toBe('10 h')
    expect(scope).toBe('upcoming_weeks')
    expect(applied.rewrittenWeeks.length).toBeGreaterThan(0)
  })

  it('rend les quatre lignes avant / après de l’artboard', () => {
    renderScreen()
    const table = screen.getByText('Avant').closest('div')?.parentElement as HTMLElement

    for (const label of ['Séances', 'Jours doublés', 'Facile / dur', 'Jours libres']) {
      expect(within(table).getByText(label)).toBeInTheDocument()
    }
  })

  it('laisse « refaire tout le plan » inerte et dit pourquoi', () => {
    renderScreen()
    const whole = screen.getByRole('button', { name: /Refaire tout le plan/ })

    // Le motif vivait dans un `title` : au doigt, il n'existait pas. Il est désormais à l'écran,
    // et rattaché à la commande par `aria-describedby`.
    expect(whole).toBeDisabled()
    expect(whole).not.toHaveAttribute('title')
    expect(whole).toHaveAccessibleDescription()
  })
})

// --- 39 -----------------------------------------------------------------------------------

describe('39 · Journal du plan', () => {
  const NOW = new Date('2026-06-15T18:42:00')

  const entries: PlanJournalEntry[] = [
    {
      id: 'j1',
      planId: 'plan-test',
      at: '2026-06-15T18:42:00',
      author: 'user',
      description: 'Longue déplacée dim. → mar.',
      reason: 'par toi, glisser-déposer',
      undone: false,
    },
    {
      id: 'j2',
      planId: 'plan-test',
      at: '2026-06-01T08:00:00',
      author: 'engine',
      description: 'Affûtage calé à 2 semaines',
      reason: 'Bosquet et al. 2007',
      undone: true,
    },
  ]

  it('compte les entrées et les range du plus récent au plus ancien', () => {
    render(<PlanJournalScreen entries={entries} onBack={vi.fn()} now={NOW} />)

    expect(screen.getByText('2 entrées')).toBeInTheDocument()
    const titles = screen.getAllByText(/Longue déplacée|Affûtage calé/)
    expect(titles[0]).toHaveTextContent('Longue déplacée')
  })

  it('date le jour même à l’heure, et les autres au jour', () => {
    render(<PlanJournalScreen entries={entries} onBack={vi.fn()} now={NOW} />)

    expect(screen.getByText(/aujourd’hui 18:42/)).toBeInTheDocument()
    expect(screen.getByText(/01 juin/)).toBeInTheDocument()
  })

  it('garde l’entrée annulée, et le dit', () => {
    render(<PlanJournalScreen entries={entries} onBack={vi.fn()} now={NOW} />)

    expect(screen.getByText('Affûtage calé à 2 semaines')).toBeInTheDocument()
    expect(screen.getByText(/· annulé/)).toBeInTheDocument()
  })

  it('n’offre « Défaire » que dans la fenêtre de 30 jours, et dit pourquoi il est inerte', () => {
    render(<PlanJournalScreen entries={entries} onBack={vi.fn()} now={NOW} />)

    const undo = screen.getAllByRole('button', { name: 'Défaire' })
    // L'entrée déjà annulée n'en a plus.
    expect(undo).toHaveLength(1)
    // Le motif vivait dans un `title` : au doigt, il n'existait pas. Il est désormais à l'écran,
    // et rattaché à la commande par `aria-describedby`.
    expect(undo[0]).toBeDisabled()
    expect(undo[0]).not.toHaveAttribute('title')
    expect(undo[0]).toHaveAccessibleDescription(/copie du plan d’avant/)
  })

  it('nomme le vide plutôt que de laisser un blanc muet', () => {
    render(<PlanJournalScreen entries={[]} onBack={vi.fn()} now={NOW} />)

    expect(screen.getByText('0 entrée')).toBeInTheDocument()
    expect(screen.getByText(/le journal s’écrit au premier réglage appliqué/)).toBeInTheDocument()
  })

  it('rappelle ce que le moteur ne fera jamais seul', () => {
    render(<PlanJournalScreen entries={entries} onBack={vi.fn()} now={NOW} />)
    expect(screen.getByText(/changer ta date de course/)).toBeInTheDocument()
  })
})
