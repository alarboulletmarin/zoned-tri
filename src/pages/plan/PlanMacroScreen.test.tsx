import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { demoPlan, demoRace } from '../../domain/demoData'
import type { PlanWeek, TrainingPlan } from '../../domain/types'
import { PlanMacroScreen } from './PlanMacroScreen'

/** Lundi de la semaine 07 du plan de démonstration. */
const TODAY = '2026-06-15'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderScreen(plan: TrainingPlan = demoPlan) {
  return render(
    <MemoryRouter>
      <PlanMacroScreen
        plan={plan}
        race={demoRace}
        today={TODAY}
        onBack={() => undefined}
        onOpenSettings={() => undefined}
      />
    </MemoryRouter>,
  )
}

function emptyWeek(weekNumber: number): PlanWeek {
  return {
    weekNumber,
    phase: 'Base',
    totalVolumeMin: 0,
    volumeByDiscipline: {},
    days: [],
    easyPercent: 0,
    hardPercent: 0,
  }
}

describe('PlanMacroScreen · artboard 04', () => {
  it('annonce l’objectif, sa date et la durée du plan', () => {
    renderScreen()

    expect(screen.getByRole('heading', { name: '70.3 Vichy' })).toBeInTheDocument()
    expect(screen.getByText('Objectif principal')).toBeInTheDocument()
    expect(screen.getByText('30 août · 18 semaines · J-76')).toBeInTheDocument()
  })

  it('donne les trois compteurs du canevas', () => {
    renderScreen()

    expect(screen.getByText('Séances')).toBeInTheDocument()
    expect(screen.getByText('Heures')).toBeInTheDocument()
    expect(screen.getByText('Faites')).toBeInTheDocument()
    expect(screen.getByText('7/18')).toBeInTheDocument()
  })

  it('nomme la frise de répartition aux lecteurs d’écran', () => {
    renderScreen()
    expect(screen.getByRole('img', { name: /Natation 22 %, Vélo 46 %, Course 33 %/ })).toBeInTheDocument()
  })

  it('liste les quatre phases avec leur état', () => {
    renderScreen()

    expect(screen.getByText('Base · 4 semaines')).toBeInTheDocument()
    expect(screen.getByText('Construction · 8 semaines')).toBeInTheDocument()
    expect(screen.getByText('Spécifique · 3 semaines')).toBeInTheDocument()
    expect(screen.getByText('Affûtage · 3 semaines')).toBeInTheDocument()
    expect(screen.getByText('FAIT')).toBeInTheDocument()
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })

  it('porte les deux notes de preuve, dont la règle des 10 % écartée', () => {
    renderScreen()

    expect(screen.getByText(/Bosquet et al\. 2007/)).toBeInTheDocument()
    expect(screen.getByText('preuve solide')).toBeInTheDocument()
    expect(screen.getByText(/règle des 10 %/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Preuve faible' })).toBeInTheDocument()
  })

  // Les deux formats n'étaient pas « à venir » : le document A4 et la feuille d'export existent,
  // testés, depuis la reprise des artboards 20 à 22. Il ne leur manquait qu'une porte.
  it('mène le .PDF au document A4 et le .ICS à la feuille d’export', () => {
    renderScreen()

    expect(screen.getByRole('link', { name: '.PDF' })).toHaveAttribute('href', '/exports/impression')
    expect(screen.getByRole('link', { name: '.ICS' })).toHaveAttribute('href', '/exports')
    expect(screen.getByText('Exporter les 18 semaines')).toBeInTheDocument()
  })

  /**
   * L'histogramme était une image muette : dix-huit barres et pas une destination, alors que la
   * Saison sert précisément à choisir où regarder. Chaque barre est un lien vers SA semaine —
   * `PlanWeekRoute` lit déjà `?semaine=N`, personne ne le lui envoyait.
   */
  it('mène chaque barre de semaine à sa semaine, en la nommant', () => {
    renderScreen()
    const semaine7 = screen.getByRole('link', { name: /Semaine 7 · 8 h 10/ })
    expect(semaine7).toHaveAttribute('href', '/plan/semaine?semaine=7')
  })

  it('mène chaque phase à sa première semaine', () => {
    renderScreen()
    expect(screen.getByRole('link', { name: /^Base ·/ })).toHaveAttribute(
      'href',
      '/plan/semaine?semaine=1',
    )
  })

  it('nomme le vide quand le plan ne porte aucune semaine', () => {
    renderScreen({ ...demoPlan, weeks: [] })
    expect(screen.getByText('Ce plan ne porte aucune semaine : rien à comparer.')).toBeInTheDocument()
  })

  it('garde une colonne par semaine, même à volume nul', () => {
    renderScreen({ ...demoPlan, weeks: [emptyWeek(1), emptyWeek(2), emptyWeek(3)] })
    for (const rang of [1, 2, 3]) {
      expect(screen.getByRole('link', { name: `Semaine ${rang} · 0′` })).toBeInTheDocument()
    }
  })
})
