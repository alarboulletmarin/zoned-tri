import { useParams } from 'react-router-dom'
import type { WorkoutFilters } from '../../domain/workoutFilters'
import { EMPTY_FILTERS } from '../../domain/workoutFilters'
import { SearchOverlay } from './SearchOverlay'
import { WorkoutsScreen } from './WorkoutsScreen'

/**
 * Atelier d'aperçu — **développement uniquement**, monté par `App` derrière `import.meta.env.DEV`.
 * Il n'existe dans aucune navigation et ne survit pas au build. Même patron que `TodayPreview`.
 *
 * Raison d'être : les quatre artboards de la Bibliothèque ne se distinguent que par l'ÉTAT DU
 * TAMIS, que le produit n'atteint qu'après plusieurs gestes — trois filtres posés (07), un
 * croisement vide (26), la feuille déployée (40), un terme cherché (25). La recette doit pouvoir
 * mesurer chacun d'un coup, à l'URL près.
 *
 * Les préréglages reprennent ceux des artboards autant que le catalogue réel le permet :
 * `SEED_WORKOUTS` compte 32 séances, pas les 312 de la maquette, et ses bornes de durée ne sont
 * donc pas celles du dessin. Les combinaisons sont choisies pour rendre le MÊME état — trois
 * filtres qui laissent passer quelques séances, quatre qui n'en laissent aucune.
 */
/* Volontairement non exportés : le fichier ne publie que son composant, pour ne pas casser le
 * rafraîchissement à chaud (règle `react/only-export-components`). */
const PREVIEW_STATES = ['07', '25', '26', '40'] as const
type PreviewState = (typeof PREVIEW_STATES)[number]

/** 07 l. 993-995 : Natation · Z2 · Z4 · 45–60 min. */
const FILTERED: WorkoutFilters = {
  ...EMPTY_FILTERS,
  disciplines: ['N'],
  zones: ['Z2', 'Z4'],
  duration: { min: 45, max: 60 },
}

/** 26 l. 2947-2950 : Natation · Z6 · moins de 30′ · Eau libre — quatre filtres, zéro séance. */
const DEAD_END: WorkoutFilters = {
  ...EMPTY_FILTERS,
  disciplines: ['N'],
  zones: ['Z6'],
  duration: { min: 18, max: 30 },
  locations: ['open_water'],
}

function isPreviewState(value: string | undefined): value is PreviewState {
  return PREVIEW_STATES.includes(value as PreviewState)
}

export function WorkoutsPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  // 25 l. 2893 : le champ porte « seuil vélo ». Le catalogue réel ne croise pas les deux mots dans
  // un même titre — « seuil » seul rend ce que l'artboard montre : des séances et un calculateur.
  if (state === '25') return <SearchOverlay initialQuery="seuil" onClose={() => undefined} />

  return (
    <WorkoutsScreen
      initialFilters={state === '26' ? DEAD_END : FILTERED}
      initialSheetOpen={state === '40'}
    />
  )
}
