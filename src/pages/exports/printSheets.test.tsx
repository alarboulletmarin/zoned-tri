import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanPage } from './PlanPage'
import { PLAN_ROWS_PER_PAGE, paginatePlanRows } from './printPagination'
import { ZoneAtlasPage } from './ZoneAtlasPage'
import { buildPlanSheet } from '../../domain/exports/planSheet'
import { buildZoneAtlasSheet } from '../../domain/exports/zoneAtlasSheet'
import { demoAthleteProfile, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import type { AthleteProfile } from '../../domain/types'
import type { PlanSheetRow } from '../../domain/exports/planSheet'

const TODAY = '2026-06-16'

function row(index: number): PlanSheetRow {
  return {
    key: `week-${index}`,
    label: `${String(index).padStart(2, '0')} base`,
    cells: Array.from({ length: 7 }, (_, day) => ({ key: `${index}-${day}`, text: '—', tone: 'rest' as const })),
    volumeLabel: '5 h',
    reduced: false,
    emphasis: false,
  }
}

describe('paginatePlanRows', () => {
  it('tient un plan court sur une seule feuille', () => {
    expect(paginatePlanRows(Array.from({ length: 12 }, (_, i) => row(i + 1)))).toHaveLength(1)
  })

  /** Dix-huit semaines ne tiennent pas sur une A4 : c'est la « page 3 » de l'artboard 22. */
  it('continue un plan de 18 semaines sur une seconde feuille', () => {
    const pages = paginatePlanRows(Array.from({ length: 18 }, (_, i) => row(i + 1)))
    expect(pages).toHaveLength(2)
    expect(pages[0]).toHaveLength(PLAN_ROWS_PER_PAGE)
    expect(pages[1]).toHaveLength(18 - PLAN_ROWS_PER_PAGE)
  })

  it('rend toujours au moins une feuille, même sans semaine', () => {
    expect(paginatePlanRows([])).toEqual([[]])
  })
})

describe('PlanPage · artboard 22', () => {
  const sheet = buildPlanSheet({
    plan: demoPlan,
    catalogue: demoWorkouts,
    today: TODAY,
    race: demoRace,
  })

  it('annonce le format et la pagination de la feuille', () => {
    render(<PlanPage sheet={sheet} pageNumber={2} pageCount={3} />)
    expect(screen.getByText('A4 · 210 × 297 mm')).toBeInTheDocument()
    expect(screen.getAllByText('page 2 / 3')).toHaveLength(2)
  })

  it('annonce ses quatre trames — la couleur ne sert à rien sur une photocopie', () => {
    render(<PlanPage sheet={sheet} pageNumber={2} pageCount={3} />)
    for (const legend of ['séance', 'facile', 'séance clé', 'repos']) {
      expect(screen.getByText(legend)).toBeInTheDocument()
    }
  })

  it('range les semaines en lignes et les jours en colonnes', () => {
    render(<PlanPage sheet={sheet} pageNumber={2} pageCount={3} />)
    expect(screen.getByRole('columnheader', { name: 'Sem.' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Vol.' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: '07 constr.' })).toBeInTheDocument()
  })

  it('ne porte les notes de pied que sur la dernière feuille du plan', () => {
    const { rerender } = render(
      <PlanPage sheet={sheet} pageNumber={2} pageCount={3} withFootnotes={false} />,
    )
    expect(screen.queryByText(/Affûtage/)).not.toBeInTheDocument()
    rerender(<PlanPage sheet={sheet} pageNumber={3} pageCount={3} />)
    expect(screen.getByText(/Affûtage/)).toBeInTheDocument()
  })
})

describe('ZoneAtlasPage · artboard 21', () => {
  it('imprime les six zones et leurs quatre colonnes', () => {
    render(
      <ZoneAtlasPage
        sheet={buildZoneAtlasSheet(demoAthleteProfile, demoPlan, TODAY)}
        pageNumber={1}
        pageCount={3}
        printedOn="20/08/26"
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Natation /100' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FC' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(7)
    expect(screen.getByText('zonedtri · imprimé le 20/08/26')).toBeInTheDocument()
  })

  /** Règle 1 de la méthode : un vide se nomme. */
  it('nomme les références qui manquent plutôt que d’imprimer un tableau à moitié faux', () => {
    const partial: AthleteProfile = { ...demoAthleteProfile }
    delete partial.ftp
    render(
      <ZoneAtlasPage
        sheet={buildZoneAtlasSheet(partial, demoPlan, TODAY)}
        pageNumber={1}
        pageCount={3}
        printedOn="20/08/26"
      />,
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Aucune zone à imprimer')).toBeInTheDocument()
    expect(screen.getByText(/FTP vélo/)).toBeInTheDocument()
  })
})
