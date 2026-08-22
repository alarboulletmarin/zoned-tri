import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProofBadge } from './ProofBadge'

describe('ProofBadge', () => {
  it('renders SOLIDE for the solid level', () => {
    render(<ProofBadge level="solid" />)
    expect(screen.getByText('SOLIDE')).toBeInTheDocument()
  })

  it('renders MODÉRÉE for the moderate level', () => {
    render(<ProofBadge level="moderate" />)
    expect(screen.getByText('MODÉRÉE')).toBeInTheDocument()
  })

  it('renders FAIBLE for the weak level', () => {
    render(<ProofBadge level="weak" />)
    expect(screen.getByText('FAIBLE')).toBeInTheDocument()
  })

  it('exposes the level as a data attribute for styling hooks', () => {
    render(<ProofBadge level="weak" />)
    expect(screen.getByText('FAIBLE')).toHaveAttribute('data-level', 'weak')
  })
})
