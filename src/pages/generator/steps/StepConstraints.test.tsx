import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GeneratorForm } from '../../../domain/planGenerator/form'
import { createInitialForm } from '../../../domain/planGenerator/form'
import type { GeneratorStepProps } from '../stepProps'
import { StepConstraints } from './StepConstraints'

const TODAY = '2026-06-15'

function renderStep(overrides: Partial<GeneratorForm> = {}) {
  const onChange = vi.fn<GeneratorStepProps['onChange']>()
  const form: GeneratorForm = { ...createInitialForm(undefined, TODAY), ...overrides }
  render(
    <StepConstraints
      form={form}
      onChange={onChange}
      onBack={vi.fn()}
      onContinue={vi.fn()}
      onGoToStep={vi.fn()}
      today={TODAY}
    />,
  )
  return { form, onChange }
}

describe('StepConstraints', () => {
  it('publishes a toggled constraint through onChange without holding local state', async () => {
    const user = userEvent.setup()
    const { form, onChange } = renderStep()

    // Le formulaire initial a la piscine cochée : la bascule doit la décocher.
    expect(form.constraints.pool).toBe(true)
    await user.click(screen.getByRole('button', { name: /^Piscine/ }))

    expect(onChange).toHaveBeenCalledWith({
      constraints: { ...form.constraints, pool: false },
    })
  })

  it('announces only effects the app can honour, never uncollected sample data', () => {
    renderStep()
    expect(screen.getByText('sinon les séances passent en FC / ressenti')).toBeInTheDocument()
    // La meta de démonstration du canevas n'est jamais affichée : rien ne la renseigne.
    expect(screen.queryByText(/bassin 25 m/)).not.toBeInTheDocument()
  })

  it('blocks a week and reports it in the mono recap', async () => {
    const user = userEvent.setup()
    const { onChange } = renderStep()

    await user.click(screen.getByRole('button', { name: 'Semaine 4' }))

    expect(onChange).toHaveBeenCalledWith({
      constraints: expect.objectContaining({
        blockedWeeks: [{ weekNumber: 4, reason: '' }],
      }),
    })
  })

  it('unblocks a week that was already blocked', async () => {
    const user = userEvent.setup()
    const base = createInitialForm(undefined, TODAY)
    const { onChange } = renderStep({
      constraints: {
        ...base.constraints,
        blockedWeeks: [
          { weekNumber: 4, reason: 'déplacement pro' },
          { weekNumber: 5, reason: 'déplacement pro' },
        ],
      },
    })

    expect(screen.getByText('sem. 04 et 05 — déplacement pro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semaine 4' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Semaine 4' }))
    expect(onChange).toHaveBeenCalledWith({
      constraints: expect.objectContaining({
        blockedWeeks: [{ weekNumber: 5, reason: 'déplacement pro' }],
      }),
    })
  })

  it('hides the reason field while no week is blocked', () => {
    renderStep()
    expect(screen.queryByLabelText('Raison des semaines bloquées')).not.toBeInTheDocument()
    expect(screen.getByText(/aucune semaine bloquée/)).toBeInTheDocument()
  })

  it('applies the typed reason to every blocked week at once', async () => {
    const user = userEvent.setup()
    const base = createInitialForm(undefined, TODAY)
    const { onChange } = renderStep({
      constraints: {
        ...base.constraints,
        blockedWeeks: [
          { weekNumber: 4, reason: '' },
          { weekNumber: 5, reason: '' },
        ],
      },
    })

    await user.type(screen.getByLabelText('Raison des semaines bloquées'), 'x')

    expect(onChange).toHaveBeenCalledWith({
      constraints: expect.objectContaining({
        blockedWeeks: [
          { weekNumber: 4, reason: 'x' },
          { weekNumber: 5, reason: 'x' },
        ],
      }),
    })
  })
})
