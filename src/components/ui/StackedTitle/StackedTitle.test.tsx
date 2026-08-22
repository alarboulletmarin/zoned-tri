import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StackedTitle } from './StackedTitle'

describe('StackedTitle', () => {
  it('garde les mots séparés dans le nom accessible', () => {
    render(<StackedTitle lines={['Mes', 'références']} />)
    // Le défaut que ce composant existe pour empêcher : `Mes<br />références` se lit
    // « Mesréférences », un seul mot, pour une technologie d'assistance. Le nom accessible doit
    // porter une séparation — les navigateurs replient ensuite le saut de ligne en espace, ce que
    // `dom-accessibility-api` ne fait pas ici : d'où l'expression régulière plutôt qu'une égalité.
    expect(screen.getByRole('heading', { name: /^Mes\s+références$/ })).toBeInTheDocument()
  })

  it('coupe autant de fois que le canevas, par le texte et non par un élément vide', () => {
    const { container } = render(<StackedTitle lines={['Un plan', 'qui dit', 'pourquoi']} />)
    expect(container.querySelectorAll('br')).toHaveLength(0)
    expect(container.firstChild?.textContent).toBe('Un plan\nqui dit\npourquoi')
    expect(screen.getByRole('heading', { name: /^Un plan\s+qui dit\s+pourquoi$/ })).toBeInTheDocument()
  })

  it('ne coupe pas un titre d’une seule ligne', () => {
    const { container } = render(<StackedTitle lines={['Mardi 25 août']} />)
    expect(container.firstChild?.textContent).toBe('Mardi 25 août')
  })

  /**
   * Artboard 07 : le canevas coupe AU MILIEU du mot, « Biblio- / thèque ». Le saut de ligne
   * s'entendant comme une espace, le titre se lirait « biblio, thèque » — `label` rend le mot
   * entier sans toucher au dessin.
   */
  it('rend le mot entier quand le canevas coupe au trait d’union', () => {
    const { container } = render(<StackedTitle lines={['Biblio-', 'thèque']} label="Bibliothèque" />)
    expect(screen.getByRole('heading', { name: 'Bibliothèque' })).toBeInTheDocument()
    expect(container.firstChild?.textContent).toBe('Biblio-\nthèque')
    expect(container.querySelectorAll('br')).toHaveLength(0)
  })

  it('rend le niveau demandé', () => {
    render(<StackedTitle as="h2" lines={['Rien', 'aujourd’hui']} />)
    expect(screen.getByRole('heading', { level: 2, name: /^Rien\s+aujourd’hui$/ })).toBeInTheDocument()
  })
})
