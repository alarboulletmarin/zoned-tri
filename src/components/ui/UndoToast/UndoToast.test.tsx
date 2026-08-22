import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { UndoToast } from './UndoToast'

describe('UndoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onExpire exactly once after 6000ms when onUndo is not clicked', () => {
    const onExpire = vi.fn()
    const onUndo = vi.fn()
    render(<UndoToast message="Séance marquée faite" onUndo={onUndo} onExpire={onExpire} />)

    expect(onExpire).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(onExpire).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onExpire).toHaveBeenCalledOnce()

    // Further time passing must not call it again.
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('does not call onExpire if onUndo was clicked before the delay elapses', () => {
    const onExpire = vi.fn()
    const onUndo = vi.fn()
    render(<UndoToast message="Séance marquée faite" onUndo={onUndo} onExpire={onExpire} />)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    const undoButton = screen.getByRole('button', { name: 'Annuler' })
    act(() => {
      undoButton.click()
    })
    expect(onUndo).toHaveBeenCalledOnce()

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('renders the message', () => {
    render(<UndoToast message="Séance marquée faite" onUndo={vi.fn()} onExpire={vi.fn()} />)
    expect(screen.getByText('Séance marquée faite')).toBeInTheDocument()
  })
})
