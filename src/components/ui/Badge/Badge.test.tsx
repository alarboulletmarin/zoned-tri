import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisciplineBadge, ZoneBadge } from './Badge'

describe('DisciplineBadge', () => {
  it('renders the discipline initial', () => {
    render(<DisciplineBadge discipline="N" />)
    expect(screen.getByRole('img', { name: 'Discipline N' })).toHaveTextContent('N')
  })

  it.each(['N', 'V', 'C', 'R'] as const)('renders discipline %s without error', (discipline) => {
    render(<DisciplineBadge discipline={discipline} />)
    expect(screen.getByText(discipline)).toBeInTheDocument()
  })
})

describe('ZoneBadge', () => {
  it('renders the zone label', () => {
    render(<ZoneBadge zone={4} />)
    expect(screen.getByRole('img', { name: 'Zone 4' })).toHaveTextContent('Z4')
  })

  it.each([1, 2, 3, 4, 5, 6] as const)('renders zone %s without error', (zone) => {
    render(<ZoneBadge zone={zone} />)
    expect(screen.getByText(`Z${zone}`)).toBeInTheDocument()
  })
})
