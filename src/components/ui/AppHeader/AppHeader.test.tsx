import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../../testing/render'
import userEvent from '@testing-library/user-event'
import { AppHeader } from './AppHeader'
import { ShellChromeProvider } from '../../../context/ShellChromeContext'

describe('AppHeader', () => {
  it('renders the section label, a search button and a burger button in root variant', () => {
    render(<AppHeader variant="root" label="Plan" />)
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechercher' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument()
  })

  it('renders the wordmark in opening variant (artboard 01)', () => {
    render(<AppHeader variant="opening" />)
    expect(screen.getByText('Zoned Tri')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechercher' })).toBeInTheDocument()
  })

  it('renders a back square and a breadcrumb in detail variant', () => {
    render(<AppHeader variant="detail" trail={['Plan', 'Semaine']} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument()
    expect(screen.getByText('Semaine')).toBeInTheDocument()
    // Écart assumé aux artboards 03/05/G1 : ils ne dessinent pas de loupe hors des écrans racines.
    // Une recherche qui disparaît dès qu'on descend d'un niveau n'est pas une recherche globale —
    // elle reste donc là, avec le menu, sur tous les écrans.
    expect(screen.getByRole('button', { name: 'Rechercher' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })

  it('porte le mot-symbole sur tout écran mobile, et il ramène à l’ouverture', () => {
    render(<AppHeader variant="detail" trail={['Plan', 'Semaine']} onBack={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Zoned Tri' })).toHaveAttribute('href', '/')
  })

  it('rend le fil cliquable jusqu’au segment courant, qui n’est pas un lien', () => {
    render(<AppHeader variant="detail" trail={['Plan', 'Semaine']} onBack={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/plan')
    expect(screen.queryByRole('link', { name: 'Semaine' })).not.toBeInTheDocument()
    expect(screen.getByText('Semaine')).toHaveAttribute('aria-current', 'page')
  })

  it('titre l’onglet du navigateur d’après le fil', () => {
    render(<AppHeader variant="detail" trail={['Plan', 'Semaine']} onBack={vi.fn()} />)
    expect(document.title).toBe('Semaine · Plan · Zoned Tri')
  })

  it('donne au fil un écran racine d’un seul segment, sa section', () => {
    render(<AppHeader variant="root" label="Séances" />)
    expect(document.title).toBe('Séances · Zoned Tri')
  })

  it('shows the step counter of the generator (artboard G1)', () => {
    render(<AppHeader variant="detail" trail={['Plan', 'Générer']} onBack={vi.fn()} counter="01 / 06" />)
    expect(screen.getByText('01 / 06')).toBeInTheDocument()
  })

  it('calls onBack when the back square is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<AppHeader variant="detail" trail={['Plan']} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('routes the burger and the search to the shell chrome', async () => {
    const user = userEvent.setup()
    const openMenu = vi.fn()
    const openSearch = vi.fn()
    render(
      <ShellChromeProvider openMenu={openMenu} openSearch={openSearch}>
        <AppHeader variant="root" label="Séances" />
      </ShellChromeProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Rechercher' }))
    expect(openMenu).toHaveBeenCalledOnce()
    expect(openSearch).toHaveBeenCalledOnce()
  })
})
