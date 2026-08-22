import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders as a native button with role button', () => {
    render(<Button>Générer un plan</Button>)
    expect(screen.getByRole('button', { name: 'Générer un plan' })).toBeInTheDocument()
  })

  it('defaults to the primary variant', () => {
    render(<Button>Continuer</Button>)
    expect(screen.getByRole('button').className).toMatch(/primary/)
  })

  it('applies the secondary variant class when requested', () => {
    render(<Button variant="secondary">Annuler</Button>)
    expect(screen.getByRole('button').className).toMatch(/secondary/)
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Continuer</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('respects disabled state', () => {
    render(<Button disabled>Continuer</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
