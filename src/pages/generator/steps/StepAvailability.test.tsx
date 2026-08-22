import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInitialForm } from '../../../domain/planGenerator/form'
import type { GeneratorForm } from '../../../domain/planGenerator/form'
import type { GeneratorStepProps } from '../stepProps'
import { StepAvailability } from './StepAvailability'

const TODAY = '2026-06-15'

function renderStep(overrides: Partial<GeneratorForm> = {}) {
  const onChange = vi.fn()
  const props: GeneratorStepProps = {
    form: { ...createInitialForm(undefined, TODAY), ...overrides },
    onChange,
    onBack: vi.fn(),
    onContinue: vi.fn(),
    onGoToStep: vi.fn(),
    today: TODAY,
  }
  render(<StepAvailability {...props} />)
  return { onChange }
}

describe('StepAvailability', () => {
  it('shows the weekly volume as a mono quantity and moves it through onChange', () => {
    const { onChange } = renderStep()

    expect(screen.getByText('7 h 30')).toBeInTheDocument()

    const slider = screen.getByLabelText('Volume hebdomadaire visé')
    expect(slider).toHaveAttribute('min', '240')
    expect(slider).toHaveAttribute('max', '720')
    expect(slider).toHaveAttribute('step', '15')

    fireEvent.change(slider, { target: { value: '600' } })
    expect(onChange).toHaveBeenCalledWith({ weeklyVolumeTargetMin: 600 })
  })

  it('flags the sustainable ceiling once the target goes past it', () => {
    const { unmount } = render(
      <StepAvailability
        form={createInitialForm(undefined, TODAY)}
        onChange={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onGoToStep={vi.fn()}
        today={TODAY}
      />,
    )
    expect(screen.getByText(/maxi tenable : 9 h$/)).toBeInTheDocument()
    unmount()

    renderStep({ weeklyVolumeTargetMin: 600 })
    expect(screen.getByText(/maxi tenable : 9 h · dépassé/)).toBeInTheDocument()
  })

  it('toggles a training day at the right index', async () => {
    const user = userEvent.setup()
    const { onChange } = renderStep()

    // Formulaire de départ : vendredi (index 4) est le seul jour libre.
    expect(screen.getByRole('button', { name: 'vendredi' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('6 jours · vendredi laissé libre')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'vendredi' }))
    expect(onChange).toHaveBeenCalledWith({ availableDays: [true, true, true, true, true, true, true] })

    await user.click(screen.getByRole('button', { name: 'lundi' }))
    expect(onChange).toHaveBeenLastCalledWith({ availableDays: [false, true, true, true, false, true, true] })
  })

  it('names every free day, plural included', () => {
    renderStep({ availableDays: [true, true, true, false, false, true, true] })

    expect(screen.getByText('5 jours · jeudi et vendredi laissés libres')).toBeInTheDocument()
  })

  it('adjusts the per-discipline session ceiling within 0 and 7', async () => {
    const user = userEvent.setup()
    const { onChange } = renderStep()

    expect(screen.getByText('2 / sem')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Une séance de natation en plus' }))
    expect(onChange).toHaveBeenCalledWith({ maxSessionsPerDiscipline: { N: 3, V: 3, C: 3 } })

    await user.click(screen.getByRole('button', { name: 'Une séance de vélo en moins' }))
    expect(onChange).toHaveBeenLastCalledWith({ maxSessionsPerDiscipline: { N: 2, V: 2, C: 3 } })
  })

  it('disables the counter buttons at the bounds instead of publishing an invalid value', () => {
    renderStep({ maxSessionsPerDiscipline: { N: 0, V: 7, C: 3 } })

    expect(screen.getByRole('button', { name: 'Une séance de natation en moins' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Une séance de vélo en plus' })).toBeDisabled()
  })
})
