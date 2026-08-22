import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GeneratorForm } from '../../../domain/planGenerator/form'
import { createInitialForm } from '../../../domain/planGenerator/form'
import type { GeneratorStepProps } from '../stepProps'
import { StepReferences } from './StepReferences'

const TODAY = '2026-06-15'

function renderStep(overrides: Partial<GeneratorForm> = {}) {
  const onChange = vi.fn<GeneratorStepProps['onChange']>()
  const form: GeneratorForm = { ...createInitialForm(undefined, TODAY), ...overrides }
  render(
    <StepReferences
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

describe('StepReferences', () => {
  it('shows a test for every missing reference, never a guessed value', () => {
    renderStep()

    expect(screen.getByRole('button', { name: /^Test CSS 400 m \/ 200 m/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Test FTP 20 min/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^30 min contre-la-montre/ })).toBeInTheDocument()
    expect(screen.getAllByText('test sem. 1')).toHaveLength(3)
    expect(screen.getByLabelText('FTP en vélo, en watts')).toHaveValue('')
  })

  it('unchecks the matching test as soon as a reference is typed', async () => {
    const user = userEvent.setup()
    const { form, onChange } = renderStep()

    await user.type(screen.getByLabelText('FTP en vélo, en watts'), '2')

    expect(onChange).toHaveBeenCalledWith({
      references: { ...form.references, ftpWatts: 2 },
      testSessions: { ...form.testSessions, V: false },
    })
  })

  it('re-checks the test when the reference is cleared', async () => {
    const user = userEvent.setup()
    const base = createInitialForm(undefined, TODAY)
    const { onChange } = renderStep({
      references: { ...base.references, ftpWatts: 248 },
      testSessions: { ...base.testSessions, V: false },
    })

    await user.clear(screen.getByLabelText('FTP en vélo, en watts'))

    expect(onChange).toHaveBeenCalledWith({
      references: expect.objectContaining({ ftpWatts: undefined }),
      testSessions: expect.objectContaining({ V: true }),
    })
  })

  it('says so plainly when no test is needed rather than showing an empty section', () => {
    const base = createInitialForm(undefined, TODAY)
    renderStep({
      references: {
        cssPaceMinPer100m: '1:32',
        ftpWatts: 248,
        runThresholdPaceMinPerKm: '4:15',
      },
      testSessions: { ...base.testSessions, N: false, V: false, C: false },
    })

    expect(screen.getByText('aucun test nécessaire : tes trois références sont renseignées')).toBeInTheDocument()
    expect(screen.queryByText('test sem. 1')).not.toBeInTheDocument()
  })

  it('carries the weak-evidence note explaining why nothing is estimated', () => {
    renderStep()
    expect(screen.getByText('FAIBLE')).toBeInTheDocument()
    expect(screen.getByText(/écarts de 20 à 40 s\/km/)).toBeInTheDocument()
  })
})
