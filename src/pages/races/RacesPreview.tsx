import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { demoPastRace, demoRace, demoRaces } from '../../domain/demoData'
import type { ChecklistItem, Race } from '../../domain/types'
import { RaceChecklistScreen } from './RaceChecklistScreen'
import { RaceDayScreen } from './RaceDayScreen'
import { RaceNutritionScreen } from './RaceNutritionScreen'
import { RacePacingScreen } from './RacePacingScreen'
import { RaceSheetScreen } from './RaceSheetScreen'
import { RacesDesktopScreen } from './RacesDesktopScreen'
import { RacesListScreen } from './RacesListScreen'

/**
 * Atelier d'aperçu — **développement uniquement**, monté par `App` derrière `import.meta.env.DEV`.
 * Il n'existe pas dans l'application livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : la section Courses a sept états que le canevas dessine séparément, et cinq d'entre
 * eux ne s'atteignent qu'avec une course enregistrée portant pacing, nutrition, timeline et
 * checklist. Le produit, lui, ne montre jamais de fausse course. L'aperçu est un outil de recette.
 *
 * `PREVIEW_TODAY` fige le jour de référence au 14 juin 2026 : c'est le seul jour pour lequel les
 * compteurs des artboards (« J-77 », « semaine 07 / 18 ») tombent juste, ce qui rend la comparaison
 * bloc à bloc avec le canevas mesurable.
 */
const PREVIEW_TODAY = '2026-06-14'

const RACE_PREVIEW_STATES = ['08', '09', '10', '11', '27', '30', 'S7', '08-vide', '27-vide'] as const
type RacePreviewState = (typeof RACE_PREVIEW_STATES)[number]

function isPreviewState(value: string | undefined): value is RacePreviewState {
  return RACE_PREVIEW_STATES.includes(value as RacePreviewState)
}

/** Course dépouillée de tout ce qui est facultatif : l'artboard 08 avec ses vides nommés. */
const BARE_RACE: Race = {
  id: 'preview-race-bare',
  name: 'Sprint sans fiche',
  date: '2026-09-06',
  format: 'Sprint',
  role: 'primary_goal',
  distances: { swimM: 750, bikeKm: 20, runKm: 5 },
  elevationGainM: 180,
}

/** La checklist se coche en mémoire : l'aperçu n'écrit rien en base. */
function ChecklistPreview() {
  const [items, setItems] = useState<ChecklistItem[]>(demoRace.transitionChecklist ?? [])

  function toggle(item: ChecklistItem) {
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)),
    )
  }

  return <RaceChecklistScreen race={{ ...demoRace, transitionChecklist: items }} onToggle={toggle} />
}

export function RacesPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {RACE_PREVIEW_STATES.join(' · ')}</p>
  }

  switch (state) {
    case '08':
      return <RaceSheetScreen race={demoRace} today={PREVIEW_TODAY} variant="root" />
    case '08-vide':
      return <RaceSheetScreen race={BARE_RACE} today={PREVIEW_TODAY} variant="detail" />
    case '09':
      return <RacePacingScreen race={demoRace} />
    case '10':
      return <RaceNutritionScreen race={demoRace} />
    case '11':
      return <RaceDayScreen race={demoRace} />
    case '27':
      return (
        <RacesListScreen
          races={demoRaces}
          today={PREVIEW_TODAY}
          planPosition={{ weekNumber: 7, weeksCount: 18 }}
        />
      )
    case '27-vide':
      return <RacesListScreen races={[demoPastRace]} today={PREVIEW_TODAY} />
    case '30':
      return <ChecklistPreview />
    case 'S7':
      return <RacesDesktopScreen races={demoRaces} today={PREVIEW_TODAY} taperWeeks={3} />
  }
}
