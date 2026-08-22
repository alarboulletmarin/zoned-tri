import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { RailBlockProvider, useRailBlock } from '../../context/RailBlockContext'
import { demoPastRace, demoRace, demoRaces } from '../../domain/demoData'
import { carbsForDuration } from '../../domain/calculators/carbs'
import { nutritionPlan } from '../../domain/raceView'
import type { Race } from '../../domain/types'
import { RaceChecklistScreen } from './RaceChecklistScreen'
import { RaceDayScreen } from './RaceDayScreen'
import { RaceNutritionScreen } from './RaceNutritionScreen'
import { RacePacingScreen } from './RacePacingScreen'
import { RaceSheetScreen } from './RaceSheetScreen'
import { RacesDesktopScreen } from './RacesDesktopScreen'
import { RacesListScreen } from './RacesListScreen'

/** Jour de référence de l'atelier d'aperçu : celui pour lequel les compteurs du canevas tombent. */
const TODAY = '2026-06-14'

function renderScreen(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function useDesktopBreakpoint() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('RaceSheetScreen · artboard 08', () => {
  it('rend les quatre lignes de règlement du canevas, et rien de plus', () => {
    renderScreen(<RaceSheetScreen race={demoRace} today={TODAY} />)
    expect(screen.getByText('Température de l’eau')).toBeInTheDocument()
    expect(screen.getByText('19,5 °C')).toBeInTheDocument()
    expect(screen.getByText('autorisée')).toBeInTheDocument()
    expect(screen.getByText('interdit')).toBeInTheDocument()
    expect(screen.getByText('km 30, km 60')).toBeInTheDocument()
  })

  it('affiche le compte à rebours de l’artboard', () => {
    renderScreen(<RaceSheetScreen race={demoRace} today={TODAY} />)
    expect(screen.getByText('J-77')).toBeInTheDocument()
  })

  it('rend « — » pour un champ absent plutôt qu’une estimation muette', () => {
    const bare: Race = { ...demoRace, waterTemperatureC: undefined, aidStationsKm: undefined }
    renderScreen(<RaceSheetScreen race={bare} today={TODAY} />)
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  /**
   * Trois commandes grises portaient leur motif dans un `title` qu'aucun doigt ne survole. Toutes
   * les trois ont une sortie : le produit embarque le calculateur de pacing et celui des glucides
   * de course, et le déroulé du jour J a désormais son écran d'écriture. Une commande éteinte
   * faute d'une donnée que rien ne sait écrire l'aurait été pour toujours.
   */
  it('mène là où la donnée se fabrique plutôt que de s’éteindre', () => {
    const bare: Race = { ...demoRace, pacing: undefined, nutrition: undefined, timeline: [] }
    renderScreen(<RaceSheetScreen race={bare} today={TODAY} />)

    expect(screen.queryByRole('button', { name: /^Plan de pacing/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calculer un plan de pacing/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Calculer les glucides de course/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Écrire le déroulé du jour J/ })).toBeEnabled()
  })

  it('nomme le vide du profil quand le dénivelé est connu mais pas son découpage', () => {
    const bare: Race = { ...demoRace, bikeElevationProfile: undefined }
    renderScreen(<RaceSheetScreen race={bare} today={TODAY} />)
    expect(screen.getByText(/aucun profil n’est dessiné/)).toBeInTheDocument()
  })
})

describe('RacePacingScreen · artboard 09', () => {
  it('rend les cinq segments avec leur durée propre et leur cumul', () => {
    renderScreen(<RacePacingScreen race={demoRace} />)
    expect(screen.getByText('34:12')).toBeInTheDocument()
    expect(screen.getByText('2:55:00')).toBeInTheDocument()
    expect(screen.getByText('1:49:38')).toBeInTheDocument()
    expect(screen.getByText('Transition 1')).toBeInTheDocument()
    expect(screen.getByText('Transition 2')).toBeInTheDocument()
  })

  it('affiche un temps cible qui est bien la somme de ses segments', () => {
    renderScreen(<RacePacingScreen race={demoRace} />)
    expect(screen.getByText('5:24:30')).toBeInTheDocument()
  })

  it('porte la jauge de preuve et son appel de note, tels que le canevas les écrit', () => {
    renderScreen(<RacePacingScreen race={demoRace} />)
    expect(screen.getByText('Pourquoi 0,78 au vélo')).toBeInTheDocument()
    expect(screen.getByText('MODÉRÉE')).toBeInTheDocument()
    expect(screen.getByText('4.')).toBeInTheDocument()
    expect(screen.getByText(/preuve modérée/)).toBeInTheDocument()
  })

  it('nomme le vide plutôt que d’estimer un temps cible absent', () => {
    renderScreen(<RacePacingScreen race={{ ...demoRace, pacing: undefined }} />)
    expect(screen.getByText('Pas de pacing')).toBeInTheDocument()
  })
})

describe('RaceNutritionScreen · artboard 10', () => {
  it('affiche le total rendu par carbsForDuration, pas un chiffre écrit à la main', () => {
    const plan = nutritionPlan(demoRace)!
    const expected = Math.round(carbsForDuration(78, plan.effortSec / 3600).value)
    renderScreen(<RaceNutritionScreen race={demoRace} />)
    expect(screen.getByText(`${expected} G`)).toBeInTheDocument()
    expect(screen.getByText(/Sur 4 h 45 d’effort/)).toBeInTheDocument()
  })

  it('calcule la ligne « Eau » depuis le débit du plan et les ravitaillements', () => {
    renderScreen(<RaceNutritionScreen race={demoRace} />)
    expect(screen.getByText('Eau')).toBeInTheDocument()
    expect(screen.getByText('2,8 L')).toBeInTheDocument()
    expect(screen.getByText('600 ml/h · ravitos km 30, 60')).toBeInTheDocument()
  })

  it('qualifie le sodium en preuve faible, avec sa réserve', () => {
    renderScreen(<RaceNutritionScreen race={demoRace} />)
    expect(screen.getByText('FAIBLE')).toBeInTheDocument()
    expect(screen.getByText(/~600 MG\/H/)).toBeInTheDocument()
    expect(screen.getByText(/Les pertes sont très individuelles/)).toBeInTheDocument()
    expect(screen.getByText(/preuve faible/)).toBeInTheDocument()
  })

  it('nomme le vide quand il n’y a pas de durée d’effort à répartir', () => {
    renderScreen(<RaceNutritionScreen race={{ ...demoRace, pacing: undefined }} />)
    expect(screen.getByText('Pas de plan')).toBeInTheDocument()
  })
})

describe('RaceDayScreen · artboard 11', () => {
  it('sépare la veille du compte à rebours et met le départ en tête d’affiche', () => {
    renderScreen(<RaceDayScreen race={demoRace} />)
    expect(screen.getByText('La veille')).toBeInTheDocument()
    expect(screen.getByText('À rebours du départ')).toBeInTheDocument()
    expect(screen.getByText('Départ')).toBeInTheDocument()
    expect(screen.getByText('départ 07:20')).toBeInTheDocument()
  })

  it('promet la checklist du parc, et le dit quand elle n’existe pas', () => {
    renderScreen(<RaceDayScreen race={{ ...demoRace, transitionChecklist: [] }} />)
    const cta = screen.getByRole('button', { name: 'Checklist parc' })
    expect(cta).toBeDisabled()
    // Le motif est écrit à l'écran, pas dans un `title` qu'un doigt ne survole jamais.
    expect(cta).not.toHaveAttribute('title')
    expect(cta).toHaveAccessibleDescription(/Aucune checklist de parc/)
  })

  it('n’envoie aucune notification, et le dit', () => {
    renderScreen(<RaceDayScreen race={demoRace} />)
    expect(screen.getByText(/l’app ne te réveillera pas/)).toBeInTheDocument()
  })
})

describe('RaceChecklistScreen · artboard 30', () => {
  it('compte ce qui est coché et bascule une case sans confirmation', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <AppDataProvider>
        <MemoryRouter>
          <RaceChecklistScreen race={demoRace} onToggle={onToggle} />
        </MemoryRouter>
      </AppDataProvider>,
    )
    expect(screen.getByText('3 / 10')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Chaussures clipsées, élastiques posés' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 't1-chaussures' }))
  })

  it('nomme le vide quand aucune checklist n’est enregistrée', () => {
    render(
      <AppDataProvider>
        <MemoryRouter>
          <RaceChecklistScreen race={{ ...demoRace, transitionChecklist: [] }} onToggle={vi.fn()} />
        </MemoryRouter>
      </AppDataProvider>,
    )
    expect(screen.getByText('Rien à cocher')).toBeInTheDocument()
  })
})

describe('RacesListScreen · artboard 27', () => {
  it('range les quatre courses et compte les passées', () => {
    renderScreen(
      <RacesListScreen races={demoRaces} today={TODAY} planPosition={{ weekNumber: 7, weeksCount: 18 }} />,
    )
    expect(screen.getByText('4 · dont 1 passée')).toBeInTheDocument()
    expect(screen.getByText('plan : semaine 07 / 18')).toBeInTheDocument()
    expect(screen.getAllByText('PRÉPA')).toHaveLength(2)
    expect(screen.getByText('1:18:42 · 12 s de mieux que la cible')).toBeInTheDocument()
  })

  it('n’annonce prêt que ce qui l’est réellement', () => {
    renderScreen(<RacesListScreen races={demoRaces} today={TODAY} />)
    expect(screen.getByText(/cible 5:24:30 · pacing, nutrition et jour J prêts/)).toBeInTheDocument()
  })

  it('nomme les trois vides quand il ne reste qu’une course passée', () => {
    renderScreen(<RacesListScreen races={[demoPastRace]} today={TODAY} />)
    expect(screen.getByText(/Aucune course n’est marquée objectif principal/)).toBeInTheDocument()
    expect(screen.getByText(/Aucune course de préparation/)).toBeInTheDocument()
  })

  /**
   * La commande était grise sous « Bientôt disponible », puis renvoyée au générateur faute
   * d'écran : ajouter une course voulait dire refaire un plan. Elle a le sien.
   */
  it('mène « Ajouter une course » à l’écran de création', () => {
    renderScreen(<RacesListScreen races={demoRaces} today={TODAY} />)
    const add = screen.getByRole('button', { name: 'Ajouter une course' })
    expect(add).toBeEnabled()
    expect(add).not.toHaveAttribute('title')
    expect(screen.queryByText(/Une course s’ajoute avec son plan/)).not.toBeInTheDocument()
  })
})

describe('RacesDesktopScreen · artboard S7', () => {
  function RailProbe() {
    const block = useRailBlock()
    return <div data-testid="rail">{block ? `${block.title} · ${block.lines.join(' | ')}` : 'aucun'}</div>
  }

  it('publie l’objectif principal dans le bloc de rail de la coquille', () => {
    useDesktopBreakpoint()
    render(
      <RailBlockProvider>
        <MemoryRouter>
          <RacesDesktopScreen races={demoRaces} today={TODAY} taperWeeks={3} />
          <RailProbe />
        </MemoryRouter>
      </RailBlockProvider>,
    )
    expect(screen.getByTestId('rail')).toHaveTextContent('Objectif principal · 70.3 Vichy | 30 août · J-77')
  })

  it('distingue l’objectif des prépas et récapitule la saison', () => {
    useDesktopBreakpoint()
    renderScreen(<RacesDesktopScreen races={demoRaces} today={TODAY} taperWeeks={3} />)
    expect(screen.getByText('1 objectif · 2 prépa · 1 passée')).toBeInTheDocument()
    expect(screen.getByText('Objectif')).toBeInTheDocument()
    expect(screen.getAllByText('Prépa')).toHaveLength(2)
    expect(screen.getByText(/affûtage 3 sem\./)).toBeInTheDocument()
  })

  it('rend les trois distances avec leur contexte, ou « — » à défaut', () => {
    useDesktopBreakpoint()
    renderScreen(<RacesDesktopScreen races={demoRaces} today={TODAY} />)
    const stats = screen.getByText('Natation').parentElement!.parentElement!
    expect(within(stats).getByText('lac · 19,5 °C')).toBeInTheDocument()
    expect(within(stats).getByText('+ 720 m D+')).toBeInTheDocument()
    expect(within(stats).getByText('plat · 2 boucles')).toBeInTheDocument()
  })

  it('nomme le vide quand aucune course n’est l’objectif principal', () => {
    useDesktopBreakpoint()
    renderScreen(<RacesDesktopScreen races={[demoPastRace]} today={TODAY} />)
    expect(screen.getByText('Pas d’objectif')).toBeInTheDocument()
  })
})
