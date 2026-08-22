import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InertNote } from './InertNote'

describe('InertNote', () => {
  it('rend le motif à l’écran, et non dans un attribut que le doigt ne survole pas', () => {
    render(
      <>
        <button type="button" disabled aria-describedby="motif">
          Ajouter une course
        </button>
        <InertNote id="motif">Aucun écran ne sait encore créer une course.</InertNote>
      </>,
    )

    const note = screen.getByText('Aucun écran ne sait encore créer une course.')
    expect(note).toBeVisible()
    expect(note).toHaveAttribute('id', 'motif')
    expect(screen.getByRole('button', { name: 'Ajouter une course' })).toHaveAccessibleDescription(
      'Aucun écran ne sait encore créer une course.',
    )
  })
})
