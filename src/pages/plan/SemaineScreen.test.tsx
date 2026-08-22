import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { demoPlan, demoRace } from '../../domain/demoData'
import { RailBlockProvider, useRailBlock } from '../../context/RailBlockContext'
import type { PlanWeek, TrainingPlan } from '../../domain/types'
import { SemaineScreen } from './SemaineScreen'

// La semaine 07 du plan de démonstration : lundi 15 → dimanche 21 juin 2026. Vendredi sans séance,
// samedi doublé (vélo + enchaînement) — c'est ce samedi qui met l'écran dans l'état 16.
const TODAY = '2026-06-16'

/** Le stub global de `setupTests` répond « mobile » : ce remplacement bascule tout l'arbre en desktop. */
function useDesktopBreakpoint() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderScreen(plan: TrainingPlan = demoPlan, today = TODAY) {
  return render(
    <MemoryRouter>
      <SemaineScreen plan={plan} races={[demoRace]} today={today} />
    </MemoryRouter>,
  )
}

/** Le samedi doublé rendu à un seul créneau : sa deuxième séance descend sur le vendredi libre. */
function singleSessionPerDay(): TrainingPlan {
  const week: PlanWeek = demoPlan.weeks[0]
  const moved = week.days[5].workoutIds[1]
  return {
    ...demoPlan,
    weeks: [
      {
        ...week,
        days: week.days.map((day, index) => {
          if (index === 5) return { ...day, workoutIds: day.workoutIds.slice(0, 1) }
          if (index === 4) return { ...day, workoutIds: [moved] }
          return day
        }),
      },
    ],
  }
}

function brokenPlan(): TrainingPlan {
  return {
    ...demoPlan,
    weeks: [
      {
        ...demoPlan.weeks[0],
        days: demoPlan.weeks[0].days.map((day, index) =>
          index === 0 ? { ...day, workoutIds: ['inconnu-42'] } : day,
        ),
      },
    ],
  }
}

describe('SemaineScreen · artboard 03 (mobile, une séance par jour)', () => {
  it('titles the week and shows its total volume', () => {
    renderScreen(singleSessionPerDay())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 07')
    // 364 min résolues sur la semaine de démonstration (55 + 65 + 62 + 30 + 90 + 62). Le volume
    // s'écrit désormais sous le titre, dans la barre de navigation de l'artboard 03 : « 6 h 04
    // planifiées · 7 / 18 ».
    expect(screen.getByText(/6 h 04 planifiées/)).toBeInTheDocument()
  })

  it('shows the per-discipline volumes and the seven-bar histogram, as the artboard does', () => {
    renderScreen(singleSessionPerDay())
    expect(screen.getByRole('img', { name: /^Charge de la semaine/ })).toBeInTheDocument()
    // La ligne de volumes de 03 — et non le décompte de 16.
    expect(screen.getByText(/^V /)).toBeInTheDocument()
    expect(screen.queryByText(/jours? doublés?/)).not.toBeInTheDocument()
  })

  it('writes one row per day, the day name once', () => {
    renderScreen(singleSessionPerDay())
    const rows = screen.getAllByRole('button', { name: /150 m|seuil|Repos actif|Enchaînement|Longue/ })
    expect(rows).toHaveLength(7)
    expect(rows[0]).toHaveTextContent('Lun')
    expect(rows[0]).toHaveTextContent('55 min · Z4')
    expect(rows[6]).toHaveTextContent('Dim')
  })

  it('marks today, and only today', () => {
    renderScreen(singleSessionPerDay())
    const marks = screen.getAllByText('AUJ.')
    expect(marks).toHaveLength(1)
    expect(marks[0].closest('button')).toHaveTextContent('Mar')
  })

  it('shows the intensity split and both exports in the footer', () => {
    renderScreen(singleSessionPerDay())
    // 81 + 19 = 100 : les deux parts se complètent, la formule du canevas tient telle quelle.
    expect(screen.getByText('81 % facile / 19 % dur')).toBeInTheDocument()
    // Le `.ICS` porte LA semaine regardée, pas celle du calendrier : le rang passe par l'URL, qui
    // reste donc partageable.
    expect(screen.getByRole('link', { name: '.ICS' })).toHaveAttribute('href', '/exports?semaine=7')
    expect(screen.getByRole('link', { name: '.PDF' })).toHaveAttribute('href', '/exports/impression')
  })

  // Le moteur produit trois parts — facile, modéré, dur. N'en afficher que deux donnait
  // « 71 % facile / 15 % dur », qui se lit comme une erreur de calcul.
  it('names the moderate share when the two others do not add up to the whole week', () => {
    const week = singleSessionPerDay()
    week.weeks[0] = { ...week.weeks[0], easyPercent: 71, hardPercent: 15 }
    renderScreen(week)
    expect(screen.getByText('71 % facile / 14 % modéré / 15 % dur')).toBeInTheDocument()
  })

  it('opens the session detail when a row is tapped', async () => {
    render(
      <MemoryRouter initialEntries={['/plan/semaine']}>
        <Routes>
          <Route
            path="/plan/semaine"
            element={<SemaineScreen plan={singleSessionPerDay()} today={TODAY} />}
          />
          <Route path="/workouts/:id" element={<div>détail de séance</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /8 × 150 m au CSS/ }))
    expect(screen.getByText('détail de séance')).toBeInTheDocument()
  })

  it('splits the proportion bar over the three triathlon disciplines only', () => {
    renderScreen(singleSessionPerDay())
    const bar = screen.getByRole('img', { name: /^Natation/ })
    expect(bar).toHaveAccessibleName(/Course/)
    expect(bar.children).toHaveLength(3)
  })
})

describe('SemaineScreen · artboard 16 (mobile, jours doublés)', () => {
  // Le canevas 16 remplace l'histogramme par ce décompte parce que son artboard est de hauteur
  // fixe. L'application défile : elle garde les deux, et la semaine conserve sa lecture d'ensemble.
  it('counts the sessions, the days and the doubled days, without losing the histogram', () => {
    renderScreen()
    expect(screen.getByText('7 séances · 6 jours')).toBeInTheDocument()
    expect(screen.getByText('1 jour doublé')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Charge de la semaine/ })).toBeInTheDocument()
  })

  it('writes the doubled day once and numbers its sessions', () => {
    renderScreen()
    expect(screen.getAllByText('Sam')).toHaveLength(1)
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('names the day without any session instead of leaving a blank', () => {
    renderScreen()
    const rest = screen.getByText('Repos')
    expect(rest.parentElement).toHaveTextContent('Ven')
  })

  it('surfaces plan ids that no catalogue resolves instead of dropping them', () => {
    renderScreen(brokenPlan())
    expect(screen.getByText(/inconnu-42/)).toBeInTheDocument()
  })
})

describe('SemaineScreen · artboard S6 (desktop)', () => {
  beforeEach(useDesktopBreakpoint)

  it('renders one column per day of the week', () => {
    renderScreen()
    const columns = screen.getAllByRole('region')
    expect(columns).toHaveLength(7)
    expect(columns[0]).toHaveAccessibleName('Lun 15')
    expect(columns[6]).toHaveAccessibleName('Dim 21')
  })

  it('marks the current day, and only that one', () => {
    renderScreen()
    const today = screen.getAllByRole('region').filter((column) => column.getAttribute('aria-current') === 'date')
    expect(today).toHaveLength(1)
    expect(today[0]).toHaveAccessibleName('Mar 16 · aujourd’hui')
  })

  it('shows an explicit free-day slot on the day without any workout', () => {
    renderScreen()
    const friday = screen.getByRole('region', { name: 'Ven 19' })
    expect(within(friday).getByText(/déposer une séance ici/)).toBeInTheDocument()
    expect(within(friday).getByText('—')).toBeInTheDocument()
  })

  it('stacks the two workouts of saturday and totals them in the column footer', () => {
    renderScreen()
    const saturday = screen.getByRole('region', { name: 'Sam 20' })
    expect(within(saturday).getAllByRole('article')).toHaveLength(2)
    // 65 min de vélo + 25 min d'enchaînement.
    expect(within(saturday).getByText('1 h 30')).toBeInTheDocument()
  })

  it('sums planned volume and remaining sessions from the resolved workouts', () => {
    renderScreen()
    expect(screen.getByText(/prévues · 7 restantes/)).toBeInTheDocument()
  })

  it('shows the free-day legend and the drag affordance of the canvas', () => {
    renderScreen()
    expect(screen.getByText('pointillé · jour libre')).toBeInTheDocument()
    expect(screen.getByText('glisser par ≡ pour déplacer')).toBeInTheDocument()
  })

  it('leaves the drag handle inert, and says so', () => {
    renderScreen()
    const handles = screen.getAllByTitle(/déplacement d’une séance n’est pas encore branché/)
    expect(handles.length).toBeGreaterThan(0)
  })

  it('surfaces plan ids that no catalogue resolves instead of dropping them', () => {
    renderScreen(brokenPlan())
    expect(screen.getByText(/inconnu-42/)).toBeInTheDocument()
  })
})

describe('SemaineScreen · bloc du rail (S6 l. 1791-1795)', () => {
  /** Le rail appartient à la coquille : ce témoin lit ce que l'écran y publie. */
  function RailProbe() {
    const block = useRailBlock()
    if (!block) return <div>aucun bloc</div>
    return (
      <div>
        <span>{block.title}</span>
        <span>{`avancement ${block.percent}`}</span>
        {block.lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    )
  }

  it('publishes the week rank, the plan progress and the race countdown', () => {
    render(
      <MemoryRouter>
        <RailBlockProvider>
          <RailProbe />
          <SemaineScreen plan={demoPlan} races={[demoRace]} today={TODAY} />
        </RailBlockProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Semaine 07 / 18')).toBeInTheDocument()
    // 7 semaines sur 18 — la barre à 39 % du canevas.
    expect(screen.getByText('avancement 39')).toBeInTheDocument()
    expect(screen.getByText(/^J-\d+ · 70\.3 Vichy$/)).toBeInTheDocument()
  })

  it('keeps the block without its countdown when no race is known', () => {
    render(
      <MemoryRouter>
        <RailBlockProvider>
          <RailProbe />
          <SemaineScreen plan={demoPlan} today={TODAY} />
        </RailBlockProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Semaine 07 / 18')).toBeInTheDocument()
    expect(screen.queryByText(/70\.3 Vichy/)).not.toBeInTheDocument()
  })
})
