import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

function TestPanel({ active, onEscape }: { active: boolean; onEscape: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, active, onEscape)
  return (
    <div ref={ref}>
      <button type="button">Premier</button>
      <button type="button">Dernier</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element when activated', () => {
    render(<TestPanel active onEscape={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Premier' })).toHaveFocus()
  })

  it('does not move focus when inactive', () => {
    render(<TestPanel active={false} onEscape={vi.fn()} />)
    expect(document.body).toHaveFocus()
  })

  it('calls onEscape when Escape is pressed while active', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    render(<TestPanel active onEscape={onEscape} />)
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledOnce()
  })

  it('wraps focus from the last element back to the first on Tab', async () => {
    const user = userEvent.setup()
    render(<TestPanel active onEscape={vi.fn()} />)
    screen.getByRole('button', { name: 'Dernier' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Premier' })).toHaveFocus()
  })
})
