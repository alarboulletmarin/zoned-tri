import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { render } from '../../../testing/render'
import userEvent from '@testing-library/user-event'
import { createInitialForm, defaultRaceDate } from '../../../domain/planGenerator/form'
import type { GeneratorForm } from '../../../domain/planGenerator/form'
import type { GeneratorStepProps } from '../stepProps'
import { StepDate } from './StepDate'

const TODAY = '2026-06-15'

function renderStep(overrides: Partial<GeneratorForm> = {}) {
  const onChange = vi.fn()
  const onGoToStep = vi.fn()
  const props: GeneratorStepProps = {
    form: { ...createInitialForm(undefined, TODAY), ...overrides },
    onChange,
    onBack: vi.fn(),
    onContinue: vi.fn(),
    onGoToStep,
    today: TODAY,
  }
  const view = render(<StepDate {...props} />)
  return { onChange, onGoToStep, view }
}

describe('StepDate', () => {
  it('reads the delay from the date rather than from a stored count', () => {
    // Le formulaire de départ vise le plancher du 70.3 : 16 semaines pile.
    renderStep()

    expect(screen.getByText(/dans 16 semaines/)).toBeInTheDocument()
    expect(screen.getByText('16 sem. disponibles · délai suffisant')).toBeInTheDocument()
    expect(screen.queryByText(/Délai trop court/)).not.toBeInTheDocument()
  })

  it('raises the short-delay alert only when the date leaves less than the format floor', () => {
    const { view } = renderStep({ raceDate: defaultRaceDate(TODAY, 8) })

    expect(screen.getByText('Délai trop court pour un 70.3')).toBeInTheDocument()
    expect(screen.getByText('SOLIDE')).toBeInTheDocument()
    expect(screen.getByText('8 sem. disponibles')).toBeInTheDocument()
    expect(screen.getByText('8 sem. manquantes')).toBeInTheDocument()

    view.rerender(
      <StepDate
        form={{ ...createInitialForm(undefined, TODAY), raceDate: defaultRaceDate(TODAY, 20) }}
        onChange={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onGoToStep={vi.fn()}
        today={TODAY}
      />,
    )

    expect(screen.queryByText(/Délai trop court/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sem. manquantes/)).not.toBeInTheDocument()
  })

  it('publishes the chosen date', () => {
    const { onChange } = renderStep()

    // `user.type` sur un `input[type=date]` contrôlé produit des valeurs partielles vides sous
    // jsdom : on émet la saisie complète en une fois, comme le fait un vrai sélecteur de date.
    fireEvent.change(screen.getByLabelText('Date de la course'), { target: { value: '2026-09-06' } })

    expect(onChange).toHaveBeenLastCalledWith({ raceDate: '2026-09-06' })
  })

  it('replaces the date question by the format floor when no race is targeted', () => {
    renderStep({ noRace: true })

    expect(screen.queryByLabelText('Date de la course')).not.toBeInTheDocument()
    expect(screen.getByText('16 semaines')).toBeInTheDocument()
    expect(screen.queryByText(/Délai trop court/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sem. disponibles/)).not.toBeInTheDocument()
  })

  it('blocks the CTA while no date is chosen', () => {
    renderStep({ raceDate: '' })

    expect(screen.getByRole('button', { name: /Continuer/ })).toBeDisabled()
  })

  it('sends the blocked weeks row to step 4', async () => {
    const user = userEvent.setup()
    const { onGoToStep } = renderStep()

    await user.click(screen.getByRole('button', { name: /Semaines bloquées/ }))

    expect(onGoToStep).toHaveBeenCalledWith('constraints')
  })
})
