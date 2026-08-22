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

  it('renders a back square and a breadcrumb in detail variant, without search', () => {
    render(<AppHeader variant="detail" trail={['Plan', 'Semaine']} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument()
    expect(screen.getByText('Semaine')).toBeInTheDocument()
    // Les artboards 03/05/G1 n'ont pas de loupe dans le bandeau non racine.
    expect(screen.queryByRole('button', { name: 'Rechercher' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
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
