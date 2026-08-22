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
      <PlanMacroScreen plan={plan} race={demoRace} today={TODAY} onBack={() => undefined} />
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

  it('rend les exports inertes en disant pourquoi, plutôt qu’un bouton mort', () => {
    renderScreen()

    for (const format of ['.PDF', '.ICS']) {
      const button = screen.getByRole('button', { name: format })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('title', 'Bientôt disponible')
    }
    expect(screen.getByText('Exporter les 18 semaines')).toBeInTheDocument()
  })

  it('décrit l’histogramme du volume hebdomadaire', () => {
    renderScreen()
    expect(screen.getByRole('img', { name: /Volume hebdomadaire : semaine 7 8 h 10/ })).toBeInTheDocument()
  })

  it('nomme le vide quand le plan ne porte aucune semaine', () => {
    renderScreen({ ...demoPlan, weeks: [] })
    expect(screen.getByText('Ce plan ne porte aucune semaine : rien à comparer.')).toBeInTheDocument()
  })

  it('garde une colonne par semaine, même à volume nul', () => {
    renderScreen({ ...demoPlan, weeks: [emptyWeek(1), emptyWeek(2), emptyWeek(3)] })
    expect(screen.getByRole('img', { name: /semaine 1 0′, semaine 2 0′, semaine 3 0′/ })).toBeInTheDocument()
  })
})
