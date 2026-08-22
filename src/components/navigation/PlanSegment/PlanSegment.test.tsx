import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../../testing/render'
import { PlanSegment } from './PlanSegment'

describe('PlanSegment', () => {
  it('offers the four zoom levels in the canvas order', () => {
    render(<PlanSegment current="jour" />)
    const cells = screen.getByRole('navigation', { name: 'Niveau de zoom du plan' })
    expect(cells.textContent).toBe('JourSemaineMoisSaison')
  })

  it('links every level except the one already shown', () => {
    render(<PlanSegment current="mois" />)
    expect(screen.getByRole('link', { name: 'Jour' })).toHaveAttribute('href', '/plan')
    expect(screen.getByRole('link', { name: 'Semaine' })).toHaveAttribute('href', '/plan/semaine')
    expect(screen.getByRole('link', { name: 'Saison' })).toHaveAttribute('href', '/plan/macro')
    expect(screen.queryByRole('link', { name: 'Mois' })).not.toBeInTheDocument()
  })

  it('marks the current level for screen readers', () => {
    render(<PlanSegment current="saison" />)
    expect(screen.getByText('Saison')).toHaveAttribute('aria-current', 'page')
  })
})
