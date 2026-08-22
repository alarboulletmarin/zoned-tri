import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepDots } from './StepDots'

describe('StepDots', () => {
  it('renders one segment per step', () => {
    const { container } = render(<StepDots total={6} current={1} />)
    expect(container.querySelectorAll('[data-filled]')).toHaveLength(6)
  })

  it('fills exactly `current` segments', () => {
    const { container } = render(<StepDots total={6} current={4} />)
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-filled="false"]')).toHaveLength(2)
  })

  it('exposes the progression to assistive technology', () => {
    render(<StepDots total={6} current={3} />)
    const bar = screen.getByRole('progressbar', { name: 'Étape 3 sur 6' })
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '6')
  })
})
