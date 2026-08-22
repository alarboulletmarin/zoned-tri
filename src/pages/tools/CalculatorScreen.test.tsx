import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { demoAthleteProfile } from '../../domain/demoData'
import { CalculatorScreen } from './CalculatorScreen'
import { CalculatorsScreen } from './CalculatorsScreen'

vi.mock('../../context/AppDataContext', () => ({
  useProfile: () => ({ profile: demoAthleteProfile, saveProfile: vi.fn(), loading: false }),
}))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderFiche(id: string) {
  return render(
    <MemoryRouter>
      <CalculatorScreen id={id} profile={demoAthleteProfile} />
    </MemoryRouter>,
  )
}

describe('CalculatorScreen · artboard 13 (04/12 · bassin → eau libre)', () => {
  it('numbers the calculator and titles it on two lines', () => {
    renderFiche('bassin-eau-libre')
    expect(screen.getByText('Calculateur 04 / 12')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bassin → eau libre')
  })

  it('opens on the pool pace taken from the profile', () => {
    renderFiche('bassin-eau-libre')
    expect(screen.getByLabelText('Allure en bassin')).toHaveValue('1:32')
  })

  it('names the result block and its range as the artboard does', () => {
    renderFiche('bassin-eau-libre')
    expect(screen.getByText('Estimation eau libre')).toBeInTheDocument()
    expect(screen.getByText('fourchette réelle')).toBeInTheDocument()
  })

  it('qualifies the figure with the gauge and the artboard paragraph', () => {
    renderFiche('bassin-eau-libre')
    expect(screen.getByText('Ce que vaut ce chiffre')).toBeInTheDocument()
    expect(screen.getByText('FAIBLE')).toBeInTheDocument()
    expect(screen.getByText(/trois effets mal quantifiés/)).toBeInTheDocument()
  })

  it('cites the calculator’s own source on the fiches the artboard does not write', () => {
    renderFiche('test-20-min-ftp')
    expect(screen.getByText(/^Source ·/)).toHaveTextContent('Allen & Coggan')
  })

  it('carries the artboard footnote', () => {
    renderFiche('bassin-eau-libre')
    expect(screen.getByText('8.')).toBeInTheDocument()
    expect(screen.getByText(/c’est ta mesure qui compte/)).toBeInTheDocument()
  })

  it('recomputes as soon as the athlete edits a field', async () => {
    renderFiche('bassin-eau-libre')
    const before = screen.getByText('Estimation eau libre').parentElement?.textContent
    await userEvent.selectOptions(screen.getByLabelText('Combinaison'), 'non')
    expect(screen.getByText('Estimation eau libre').parentElement?.textContent).not.toBe(before)
  })
})

describe('CalculatorScreen · les définitions', () => {
  it('shows no evidence gauge on a pure conversion, only the word', () => {
    renderFiche('convertisseur-allure-natation')
    expect(screen.getByText('définition')).toBeInTheDocument()
    expect(screen.queryByText('FAIBLE')).not.toBeInTheDocument()
    expect(screen.queryByText('MODÉRÉE')).not.toBeInTheDocument()
  })

  it('names what is missing instead of producing a figure', () => {
    renderFiche('pacing-course')
    expect(screen.getByText(/le profil ne porte que la FTP en watts/)).toBeInTheDocument()
  })

  it('says so plainly when the calculator does not exist', () => {
    renderFiche('inconnu')
    expect(screen.getByText('Calculateur inconnu.')).toBeInTheDocument()
  })
})

describe('CalculatorsScreen · la liste des douze', () => {
  it('lists twelve cards, each with its own way in', () => {
    render(
      <MemoryRouter>
        <CalculatorsScreen profile={demoAthleteProfile} />
      </MemoryRouter>,
    )
    expect(screen.getByText('12 calculateurs')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ouvrir le calculateur/ })).toHaveLength(12)
  })
})

/**
 * Trois des douze calculateurs produisent exactement une référence du profil. Sans lien, on
 * calculait sa FTP et il fallait la retaper à la main dans un autre écran.
 */
describe('CalculatorScreen · reporter un résultat dans ses références', () => {
  it('propose d’enregistrer le résultat, avec sa valeur dans l’adresse', () => {
    render(
      <MemoryRouter>
        <CalculatorScreen id="test-20-min-ftp" profile={demoAthleteProfile} />
      </MemoryRouter>,
    )

    const report = screen.getByRole('link', { name: /comme ma référence/ })
    expect(report).toHaveAttribute('href', expect.stringContaining('/tools/references?ref=ftp&valeur='))
  })

  it('ne le propose pas sur un calculateur qui ne produit aucune référence', () => {
    render(
      <MemoryRouter>
        <CalculatorScreen id="glucides-course" profile={demoAthleteProfile} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: /comme ma référence/ })).not.toBeInTheDocument()
  })
})
