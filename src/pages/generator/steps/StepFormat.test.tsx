import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInitialForm } from '../../../domain/planGenerator/form'
import type { GeneratorForm } from '../../../domain/planGenerator/form'
import type { GeneratorStepProps } from '../stepProps'
import { StepFormat } from './StepFormat'

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
  render(<StepFormat {...props} />)
  return { onChange, props }
}

describe('StepFormat', () => {
  it('publishes the picked format instead of holding it locally', async () => {
    const user = userEvent.setup()
    const { onChange } = renderStep()

    await user.click(screen.getByRole('button', { name: /^Sprint/ }))

    expect(onChange).toHaveBeenCalledWith({ format: 'Sprint' })
  })

  it('marks the current format as pressed', () => {
    renderStep({ format: 'Olympique' })

    expect(screen.getByRole('button', { name: /^Olympique/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Ironman/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lists the minimum preparation length of every format', () => {
    renderStep()

    expect(screen.getByText('1,9 km · 90 km · 21,1 km · 16 sem. min.')).toBeInTheDocument()
    expect(screen.getByText('750 m · 20 km · 5 km · 8 sem. min.')).toBeInTheDocument()
  })

  it('takes free text for the race name and never announces a catalogue', async () => {
    const user = userEvent.setup()
    const { onChange } = renderStep()

    await user.type(screen.getByLabelText('Nom de la course visée'), 'V')

    expect(onChange).toHaveBeenCalledWith({ raceName: 'V' })
    expect(screen.queryByText(/catalogue/i)).not.toBeInTheDocument()
    expect(screen.getByText(/saisie libre/)).toBeInTheDocument()
  })

  it('clears the race name when « aucune course » is switched on', async () => {
    const user = userEvent.setup()
    const { onChange } = renderStep({ raceName: '70.3 Vichy' })

    await user.click(screen.getByRole('button', { name: /Aucune course/ }))

    expect(onChange).toHaveBeenCalledWith({ noRace: true, raceName: '' })
  })

  it('disables the race name field while « aucune course » is on', () => {
    renderStep({ noRace: true })

    expect(screen.getByLabelText('Nom de la course visée')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Aucune course/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
