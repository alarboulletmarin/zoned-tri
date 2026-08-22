import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GeneratorForm } from '../../../domain/planGenerator/form'
import { createInitialForm } from '../../../domain/planGenerator/form'
import type { GeneratorStepProps } from '../stepProps'
import { StepSummary } from './StepSummary'

const TODAY = '2026-06-15'

function renderStep(overrides: Partial<GeneratorForm> = {}) {
  const onGoToStep = vi.fn<GeneratorStepProps['onGoToStep']>()
  const form: GeneratorForm = { ...createInitialForm(undefined, TODAY), ...overrides }
  render(
    <StepSummary
      form={form}
      onChange={vi.fn()}
      onBack={vi.fn()}
      onContinue={vi.fn()}
      onGoToStep={onGoToStep}
      today={TODAY}
    />,
  )
  return { form, onGoToStep }
}

describe('StepSummary', () => {
  it('sends each row back to the step that produced it', async () => {
    const user = userEvent.setup()
    const { onGoToStep } = renderStep()

    await user.click(screen.getByRole('button', { name: /^FORMAT/ }))
    expect(onGoToStep).toHaveBeenLastCalledWith('format')

    await user.click(screen.getByRole('button', { name: /^DATE/ }))
    expect(onGoToStep).toHaveBeenLastCalledWith('date')

    await user.click(screen.getByRole('button', { name: /^VOLUME/ }))
    expect(onGoToStep).toHaveBeenLastCalledWith('availability')

    await user.click(screen.getByRole('button', { name: /^CONTRAINTES/ }))
    expect(onGoToStep).toHaveBeenLastCalledWith('constraints')

    await user.click(screen.getByRole('button', { name: /^RÉFÉRENCES/ }))
    expect(onGoToStep).toHaveBeenLastCalledWith('references')
  })

  it('recomputes every value from the form instead of echoing the canvas', () => {
    renderStep({
      raceName: 'Vichy',
      raceDate: '2026-08-30',
      weeklyVolumeTargetMin: 450,
    })

    expect(screen.getByText('70.3 Vichy')).toBeInTheDocument()
    expect(screen.getByText('30 août · 11 sem.')).toBeInTheDocument()
    expect(screen.getByText('7 h 30 · 6 jours')).toBeInTheDocument()
  })

  it('summarises only the constraints actually ticked, plus the blocked weeks', () => {
    const base = createInitialForm(undefined, TODAY)
    renderStep({
      constraints: {
        ...base.constraints,
        blockedWeeks: [
          { weekNumber: 4, reason: 'déplacement pro' },
          { weekNumber: 5, reason: 'déplacement pro' },
        ],
      },
    })

    // Formulaire initial : piscine + home-trainer cochés, le reste non.
    expect(screen.getByText('piscine, HT, sem. 04–05')).toBeInTheDocument()
  })

  it('lists known references and the ones left to test', () => {
    const base = createInitialForm(undefined, TODAY)
    renderStep({
      references: { cssPaceMinPer100m: '1:32', ftpWatts: 248 },
      testSessions: { ...base.testSessions, N: false, V: false, C: true },
    })

    expect(screen.getByText('CSS, FTP · seuil à tester')).toBeInTheDocument()
  })

  it('keeps the discarded rule visible — it is the point of the section', () => {
    renderStep()

    expect(screen.getByText(/Placer 4 phases et un affûtage de 2 semaines/)).toBeInTheDocument()
    expect(screen.getByText(/Répartir 78 % du volume en Z1–Z2/)).toBeInTheDocument()
    expect(screen.getByText('Caler les longues sorties sur le samedi')).toBeInTheDocument()
    expect(
      screen.getByText('Aucun calcul de charge type ACWR : écarté faute de preuve'),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Écarté' })).toBeInTheDocument()
  })
})
