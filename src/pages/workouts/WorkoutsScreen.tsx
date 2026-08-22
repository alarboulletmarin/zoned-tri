import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { usePublishRailBlock } from '../../context/RailBlockContext'
import { useProfile } from '../../context/AppDataContext'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { formatDayMonth } from '../../domain/openingState'
import { DISCIPLINE_LABELS } from '../../domain/workoutFormat'
import type { Discipline, Workout } from '../../domain/types'
import {
  EMPTY_FILTERS,
  applyWorkoutFilters,
  buildActiveFilterChips,
  countActiveFilterCategories,
  relaxFilterCategory,
  sortWorkouts,
  type FilterCategory,
  type SortKey,
  type WorkoutFilters,
} from '../../domain/workoutFilters'
import { FilterSheet } from './FilterSheet'
import { EmptyResultsPanel } from './EmptyResultsPanel'
import { WorkoutListRow } from './WorkoutListRow'
import { WorkoutDetailContent } from './detail/WorkoutDetailContent'
import styles from './WorkoutsScreen.module.css'

/** Ordre de la bande de répartition, celui du canevas 07 l. 986 : natation, vélo, course, repos. */
const DISCIPLINE_ORDER: Discipline[] = ['N', 'V', 'C', 'R']


function computeDurationBounds() {
  const durations = SEED_WORKOUTS.map((workout) => workout.durationMin)
  return { min: Math.floor(Math.min(...durations)), max: Math.ceil(Math.max(...durations)) }
}

const DURATION_BOUNDS = computeDurationBounds()

/**
 * Écran Séances · Bibliothèque — DEUX artboards, DEUX dispositions, plus deux états.
 *
 * - Mobile, artboard **07** (l. 976-1030) : titre d'affiche « Biblio-thèque » 42 px, bande de
 *   répartition des quatre disciplines, la rangée Filtres / Tri / .PDF, les jetons de filtres
 *   retirables, le décompte, puis la liste — jeton de zone à gauche, titre, détail.
 * - Desktop, artboard **S5** (l. 1664-1774) : la liste et la fiche côte à côte (`1fr 440px`), les
 *   trois commandes remontées DANS le bandeau de 52 px, une barre de jetons filetée sous lui, et
 *   deux pieds : celui de la colonne liste et celui de l'écran. Le titre d'affiche disparaît — le
 *   rail et le bandeau nomment déjà la section, la hauteur revient à la liste.
 * - L'état vide (artboard **26**) remplace tout le corps par `EmptyResultsPanel`.
 * - La feuille de filtres (artboard **40**) est un `BottomSheet`, appelé depuis les deux.
 *
 * Le décompte « Bibliothèque · N séances · M après filtres » vit dans le BLOC DU RAIL (S5
 * l. 1677-1680), pas dans le bandeau. Les chiffres viennent du catalogue réel, jamais du « 312 »
 * figé de la maquette : `SEED_WORKOUTS` en compte aujourd'hui 32.
 *
 * LIMITATIONS assumées : l'export `.PDF` est rendu mais inerte (aucun moteur d'export) ; le tri ne
 * connaît que la durée, seul tri que le canevas nomme (« Tri · durée ↑ »).
 */
export interface WorkoutsScreenProps {
  /**
   * État initial du tamis. Injecté par l'atelier d'aperçu et les tests : l'artboard 07 se mesure
   * avec trois filtres posés, et l'artboard 26 avec un croisement qui ne rend rien. Le produit,
   * lui, ouvre toujours la bibliothèque entière.
   */
  initialFilters?: WorkoutFilters
  /** Idem : la feuille de filtres de l'artboard 40 s'ouvre déjà déployée dans l'atelier. */
  initialSheetOpen?: boolean
}

export function WorkoutsScreen({ initialFilters, initialSheetOpen = false }: WorkoutsScreenProps = {}) {
  const navigate = useNavigate()
  const isDesktop = useBreakpoint() === 'desktop'
  const { profile } = useProfile()
  const [filters, setFilters] = useState<WorkoutFilters>(initialFilters ?? EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('duration_asc')
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(initialSheetOpen)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => applyWorkoutFilters(SEED_WORKOUTS, filters), [filters])
  const workouts = useMemo(() => sortWorkouts(filtered, sortKey), [filtered, sortKey])
  const chips = buildActiveFilterChips(filters)
  const activeFilterCount = countActiveFilterCategories(filters)

  const selected = workouts.find((workout) => workout.id === selectedId) ?? (isDesktop ? workouts[0] : undefined) ?? null

  usePublishRailBlock(
    'Bibliothèque',
    isDesktop ? [countLabel(SEED_WORKOUTS.length), `${workouts.length} après filtres`] : null,
  )

  function openWorkout(id: string) {
    // S5 : « La liste garde sa place : ouvrir une fiche ne la remplace pas. » En mobile, la
    // largeur ne permet pas les deux — l'artboard 05 est alors un écran à part entière.
    if (isDesktop) setSelectedId(id)
    else navigate(`/workouts/${id}`, { state: { from: 'Bibliothèque' } })
  }

  function removeChip(category: FilterCategory) {
    setFilters((current) => relaxFilterCategory(current, category))
  }

  const controls = (
    <>
      <button type="button" className={styles.filtersButton} onClick={() => setFilterSheetOpen(true)}>
        Filtres
        {activeFilterCount > 0 && <span className={styles.filtersBadge}>{activeFilterCount}</span>}
      </button>
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => setSortKey((current) => (current === 'duration_asc' ? 'duration_desc' : 'duration_asc'))}
      >
        Tri · durée {sortKey === 'duration_asc' ? '↑' : '↓'}
      </button>

    </>
  )

  const filterChips =
    chips.length > 0 ? (
      <>
        {chips.map((chip) => (
          <span key={chip.category} className={styles.chip}>
            {chip.label}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => removeChip(chip.category)}
              aria-label={`Retirer le filtre ${chip.label}`}
            >
              ✕
            </button>
          </span>
        ))}
        <button type="button" className={styles.clearAll} onClick={() => setFilters(EMPTY_FILTERS)}>
          Tout retirer
        </button>
      </>
    ) : null

  const isEmpty = workouts.length === 0

  return (
    <div className={styles.screen}>
      {/* Artboards 07 l. 977 (mobile) et S5 l. 1685 (desktop) : UN seul bandeau. Sur desktop il
          porte les trois commandes ; sur mobile elles vivent sous la bande de répartition. */}
      <AppHeader variant="root" label="Séances" desktopActions={isDesktop ? controls : undefined} />

      {/* L'artboard 26 efface tout ce qui précède la liste : plus de titre d'affiche, plus de
          rangée de commandes, plus de décompte — les jetons du vide reprennent le tamis à leur
          compte, et le montrer deux fois ferait lire deux fois la même chose. */}
      {!isEmpty &&
        (isDesktop ? (
          /* S5 l. 1694 : la barre de jetons est filetée et porte le décompte, poussé à droite.
             Elle reste en place même sans jeton actif — c'est là que le desktop lit son compte. */
          <div className={styles.chipsBar}>
            {filterChips}
            <span className={styles.chipsCount}>
              {countLabel(workouts.length)} sur {SEED_WORKOUTS.length}
            </span>
          </div>
        ) : (
          <>
            {/* 07 l. 984 : le canevas coupe le mot en deux avec un trait d'union. */}
            <StackedTitle className={styles.hero} lines={['Biblio-', 'thèque']} label="Bibliothèque" />
            <ProgressBar
              className={styles.distribution}
              segments={distributionSegments(SEED_WORKOUTS)}
              height={14}
              framed
              label="Répartition du catalogue par discipline"
            />
            <div className={styles.controlsRow}>{controls}</div>
            {filterChips && <div className={styles.chipsRow}>{filterChips}</div>}
            {/* 07 l. 998 : « 37 séances sur 312 · triées par durée croissante ». */}
            <div className={styles.countLine}>
              {countLabel(workouts.length)} sur {SEED_WORKOUTS.length} · triées par durée{' '}
              {sortKey === 'duration_asc' ? 'croissante' : 'décroissante'}
            </div>
          </>
        ))}

      {isEmpty ? (
        <EmptyResultsPanel catalogue={SEED_WORKOUTS} filters={filters} onChange={setFilters} />
      ) : isDesktop ? (
        <>
          <div className={styles.masterDetail}>
            <div className={styles.masterColumn}>
              <div className={styles.masterList}>
                {workouts.map((workout) => (
                  <WorkoutListRow
                    key={workout.id}
                    workout={workout}
                    variant="master"
                    isSelected={workout.id === selected?.id}
                    onClick={() => openWorkout(workout.id)}
                  />
                ))}
              </div>
              {/* S5 l. 1732 : le pied de la colonne liste, collé en bas. */}
              <p className={styles.listFooter}>La liste garde sa place : ouvrir une fiche ne la remplace pas.</p>
            </div>
            {/* `wide` : le panneau de 440 px de S5 a sa propre composition — ligne de méta, tableau
                Bloc / Cible / Repos, titre à 34 px — et non celle, mobile, des artboards 05/28/29. */}
            <div className={styles.detailPanel}>
              {selected && <WorkoutDetailContent workout={selected} layout="wide" />}
            </div>
          </div>
          {/* S5 l. 1770 : le pied court sous les deux colonnes. */}
          <p className={styles.screenFooter}>{screenFootnote(selected, profile?.css?.measuredAt)}</p>
        </>
      ) : (
        <div className={styles.list}>
          {workouts.map((workout) => (
            <WorkoutListRow key={workout.id} workout={workout} onClick={() => openWorkout(workout.id)} />
          ))}
        </div>
      )}

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        catalogue={SEED_WORKOUTS}
        filters={filters}
        onChange={setFilters}
        durationBounds={DURATION_BOUNDS}
        resultCount={filtered.length}
      />
    </div>
  )
}

function countLabel(count: number): string {
  return `${count} séance${count > 1 ? 's' : ''}`
}

/**
 * Bande de répartition du catalogue (07 l. 986) : quatre aplats de discipline bout à bout, à
 * l'échelle du NOMBRE de séances — c'est ce que la bibliothèque compte, la durée n'y a pas de sens.
 */
function distributionSegments(catalogue: Workout[]): ProgressSegment[] {
  return DISCIPLINE_ORDER.map((discipline) => {
    const count = catalogue.filter((workout) => workout.discipline === discipline).length
    return {
      key: discipline,
      percent: (count / catalogue.length) * 100,
      color: `var(--color-discipline-${discipline.toLowerCase()})`,
      label: DISCIPLINE_LABELS[discipline],
    }
  })
}

/**
 * Pied d'écran de S5 (l. 1770) : « Allure dérivée de ton CSS du 3 août · ajouter au plan demande
 * d'abord le jour, et montre ce que la semaine devient. »
 *
 * La première moitié n'est vraie que pour une séance de natation ET un profil qui porte une
 * référence CSS datée : sans elle, aucune allure n'est dérivée de quoi que ce soit, et on n'écrit
 * pas une provenance inventée. La seconde moitié est une règle du produit, toujours vraie.
 */
function screenFootnote(selected: Workout | null, cssMeasuredAt: string | undefined): string {
  const rule = 'Ajouter au plan demande d’abord le jour, et montre ce que la semaine devient.'
  if (selected?.discipline !== 'N' || !cssMeasuredAt) return rule
  return `Allure dérivée de ton CSS du ${formatDayMonth(cssMeasuredAt)} · ${rule.toLowerCase()}`
}
