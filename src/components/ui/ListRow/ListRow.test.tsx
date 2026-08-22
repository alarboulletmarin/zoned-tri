import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListRow } from './ListRow'

describe('ListRow', () => {
  it('renders title and meta', () => {
    render(<ListRow title="Pyramide CSS" meta="Piscine · 25m" />)
    expect(screen.getByText('Pyramide CSS')).toBeInTheDocument()
    expect(screen.getByText('Piscine · 25m')).toBeInTheDocument()
  })

  it('renders a mono dash when value is absent', () => {
    render(<ListRow title="Repos" meta="Jour libre" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the provided value instead of the dash', () => {
    render(<ListRow title="Longue sortie" meta="Vélo" value="1h40" />)
    expect(screen.getByText('1h40')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders the discipline badge when provided', () => {
    render(<ListRow discipline="V" title="Séance seuil" meta="Home-trainer" />)
    expect(screen.getByRole('img', { name: 'Discipline V' })).toBeInTheDocument()
  })
})
