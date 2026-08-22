import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RaceSegment } from './RaceSegment'

function renderSegment(current: Parameters<typeof RaceSegment>[0]['current']) {
  return render(
    <MemoryRouter>
      <RaceSegment raceId="vichy" current={current} />
    </MemoryRouter>,
  )
}

describe('RaceSegment', () => {
  /**
   * Les quatre sous-écrans d'une course n'avaient aucune navigation entre eux : il fallait
   * remonter à la fiche à chaque fois, alors qu'on les consulte ensemble.
   */
  it('relie les quatre écrans de la course entre eux', () => {
    renderSegment('pacing')
    expect(screen.getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'href',
      '/races/vichy/nutrition',
    )
    expect(screen.getByRole('link', { name: 'Jour J' })).toHaveAttribute('href', '/races/vichy/jour-j')
    expect(screen.getByRole('link', { name: 'Checklist' })).toHaveAttribute(
      'href',
      '/races/vichy/checklist',
    )
  })

  it('ne se lie pas à l’écran qu’on regarde, et le marque', () => {
    renderSegment('jour-j')
    expect(screen.queryByRole('link', { name: 'Jour J' })).not.toBeInTheDocument()
    expect(screen.getByText('Jour J')).toHaveAttribute('aria-current', 'page')
  })

  it('se nomme, pour qu’une navigation ne soit pas une rangée de mots', () => {
    renderSegment('checklist')
    expect(screen.getByRole('navigation', { name: 'Écrans de la course' })).toBeInTheDocument()
  })
})
