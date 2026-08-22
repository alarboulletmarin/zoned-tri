import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={vi.fn()} title="Filtres">
        <p>Contenu</p>
      </BottomSheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an accessible dialog when open', () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()} title="Filtres">
        <p>Contenu</p>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Filtres' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet isOpen onClose={onClose} title="Filtres">
        <p>Contenu</p>
      </BottomSheet>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  /**
   * L'artboard 40 ne dessine aucun bouton « Fermer » : il ouvre la feuille sur une poignée de
   * 44 × 4 px. C'est donc elle la fermeture, plutôt qu'un bouton ajouté au dessin.
   */
  it('calls onClose when the handle is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet isOpen onClose={onClose} title="Filtres" closeLabel="Fermer les filtres">
        <p>Contenu</p>
      </BottomSheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Fermer les filtres' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('carries the mention pushed to the right of the title (40 : « 37 sur 312 »)', () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()} title="Filtres" titleAside="37 sur 312">
        <p>Contenu</p>
      </BottomSheet>,
    )
    expect(screen.getByText('37 sur 312')).toBeInTheDocument()
  })
})
