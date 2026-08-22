import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import * as repo from '../../storage/repository'
import { demoAthleteProfile, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import { alignWeekToWeekOf, todayIso } from '../../domain/planWeek'
import { OuvertureScreen } from './OuvertureScreen'

/** Les trois états dépendent de ce qui est en base : chaque cas sème sa propre base. */
function renderScreen() {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <OuvertureScreen />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await deleteDatabase()
  // Mobile par défaut (`matches: false`) : la mise en page desktop est vérifiée à part.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

afterEach(async () => {
  await deleteDatabase()
})

describe('OuvertureScreen', () => {
  it('announces what comes next when the device holds nothing', async () => {
    renderScreen()

    expect(await screen.findByText("Rien pour l'instant")).toBeInTheDocument()
    expect(screen.getByText('aucun plan')).toBeInTheDocument()
    // L'écran promettait « ≈ 4 min · 6 questions » sous une liste qui n'en montrait que trois,
    // dont une — la discipline dominante — que le générateur ne pose nulle part. Il annonce
    // désormais ce que `GENERATOR_QUESTIONS` contient, et rien de plus.
    expect(screen.getByText('5 questions · 1 récapitulatif')).toBeInTheDocument()
    expect(screen.getByText('Tes allures de référence')).toBeInTheDocument()
    expect(screen.queryByText(/4 min/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Commencer/ })).toBeInTheDocument()
    expect(screen.getByText("Rien n'est enregistré avant la fin")).toBeInTheDocument()
  })

  it('offers to resume the active plan and names its next session', async () => {
    const today = todayIso()
    await repo.putRace(demoRace)
    for (const workout of demoWorkouts) await repo.putWorkout(workout)
    await repo.putPlan({ ...demoPlan, weeks: demoPlan.weeks.map((week) => alignWeekToWeekOf(week, today)) })

    renderScreen()

    expect(await screen.findByText(/En cours · 70\.3 Vichy/)).toBeInTheDocument()
    expect(screen.getByText('Semaine 07 / 18')).toBeInTheDocument()
    expect(screen.getByText(/prochaine séance :/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Générer mon plan/ })).toBeInTheDocument()
    expect(screen.getByText("Générer n'écrase rien")).toBeInTheDocument()
  })

  it('shows the race report and the references to carry over once the plan is archived', async () => {
    await repo.putProfile({ ...demoAthleteProfile, ftp: { watts: 268, measuredAt: '2026-08-30' } })
    await repo.putRace({ ...demoRace, result: { timeSec: 18_720, deltaToTargetSec: -600 } })
    await repo.putPlan({
      ...demoPlan,
      status: 'archived_completed',
      referencesSnapshot: { ...demoPlan.referencesSnapshot, ftpWatts: 257 },
    })

    renderScreen()

    expect(await screen.findByText(/Terminé · 70\.3 Vichy/)).toBeInTheDocument()
    expect(screen.getByText('Couru')).toBeInTheDocument()
    expect(screen.getByText('5 h 12 · 30 août')).toBeInTheDocument()
    expect(screen.getByText('0 en cours · 1 archivé')).toBeInTheDocument()
    expect(screen.getByText('FTP 268 W')).toBeInTheDocument()
    expect(screen.getByText('+11 W')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plan suivant/ })).toBeInTheDocument()
  })
})
