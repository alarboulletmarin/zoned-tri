import type { Discipline, Workout, WorkoutLocation, Zone } from '../../domain/types'
import { LOCATION_LABELS } from '../../domain/workoutFormat'
import { EMPTY_FILTERS, type DurationRange, type WorkoutFilters } from '../../domain/workoutFilters'
import { BottomSheet } from '../../components/ui/BottomSheet/BottomSheet'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import styles from './FilterSheet.module.css'

/**
 * Rangée « Discipline » de l'artboard 40 (l. 3788-3793) : `N 84`, `V 96`, `C 88`, `Brick 24`,
 * `R 20`. Les CODES, pas les noms — la feuille tient sur une ligne et demie, et le code est celui
 * que porte le jeton de chaque ligne de liste.
 *
 * « Brick » est la quatrième entrée de cette rangée et **n'est pas une discipline** : c'est une
 * étiquette transverse posée sur des séances déjà comptées en N, V ou C. Elle se filtre ici, et
 * nulle part ailleurs — aucune ligne de liste du canevas ne la porte.
 */
const DISCIPLINE_FACETS: Discipline[] = ['N', 'V', 'C']
const ZONES: Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']

const NO_EQUIPMENT_FIELD =
  'Le modèle de séance ne porte pas de matériel : seul le lieu est enregistré. Rien n’est deviné à sa place.'

export interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  catalogue: Workout[]
  filters: WorkoutFilters
  onChange: (filters: WorkoutFilters) => void
  durationBounds: DurationRange
  resultCount: number
}

/**
 * Artboard 40 · Feuille de filtres (l. 3779-3834) — « tout le tamis dans une feuille · la liste
 * garde deux boutons ».
 *
 * Cinq rangées : Discipline (codes + comptes), Zone (les six aplats, éteints à 0,4 quand ils sont
 * hors filtre), Durée (deux carrés de 14 px sur un rail de 2 px), puis Matériel et Lieu en DEUX
 * colonnes. Enfin la phrase de règle, et les deux boutons.
 *
 * LIMITATION : la colonne « Matériel » est rendue inerte. Le canevas y liste « bassin 25 m ·
 * home-trainer · sans capteur ✓ », trois choses que `Workout` ne porte pas — il n'a qu'un champ
 * `location`. Inventer une taxonomie de matériel pour remplir la colonne serait inventer du
 * contenu ; la colonne se rend donc désactivée, et le survol dit pourquoi.
 */
export function FilterSheet({
  isOpen,
  onClose,
  catalogue,
  filters,
  onChange,
  durationBounds,
  resultCount,
}: FilterSheetProps) {
  const locations = Array.from(
    new Set(catalogue.map((workout) => workout.location).filter((l): l is WorkoutLocation => Boolean(l))),
  )
  const duration = filters.duration ?? durationBounds

  function toggleDiscipline(discipline: Discipline) {
    const isActive = filters.disciplines.includes(discipline)
    onChange({
      ...filters,
      disciplines: isActive
        ? filters.disciplines.filter((d) => d !== discipline)
        : [...filters.disciplines, discipline],
    })
  }

  function toggleZone(zone: Zone) {
    const isActive = filters.zones.includes(zone)
    onChange({ ...filters, zones: isActive ? filters.zones.filter((z) => z !== zone) : [...filters.zones, zone] })
  }

  function toggleLocation(location: WorkoutLocation) {
    const isActive = filters.locations.includes(location)
    onChange({
      ...filters,
      locations: isActive
        ? filters.locations.filter((l) => l !== location)
        : [...filters.locations, location],
    })
  }

  function setDuration(next: DurationRange) {
    onChange({ ...filters, duration: next })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filtres"
      closeLabel="Fermer les filtres"
      titleAside={`${resultCount} sur ${catalogue.length}`}
    >
      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Discipline</h3>
        <div className={styles.chipRow}>
          {DISCIPLINE_FACETS.map((discipline) => (
            <FacetChip
              key={discipline}
              label={discipline}
              count={catalogue.filter((workout) => workout.discipline === discipline).length}
              isActive={filters.disciplines.includes(discipline)}
              onToggle={() => toggleDiscipline(discipline)}
            />
          ))}
          <FacetChip
            label="Brick"
            count={catalogue.filter((workout) => workout.isBrick).length}
            isActive={filters.brickOnly}
            onToggle={() => onChange({ ...filters, brickOnly: !filters.brickOnly })}
          />
          <FacetChip
            label="R"
            count={catalogue.filter((workout) => workout.discipline === 'R').length}
            isActive={filters.disciplines.includes('R')}
            onToggle={() => toggleDiscipline('R')}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Zone</h3>
        <div className={styles.zoneRow}>
          {ZONES.map((zone) => (
            <button
              key={zone}
              type="button"
              className={styles.zoneToggle}
              data-zone={zone}
              data-active={filters.zones.length === 0 || filters.zones.includes(zone)}
              onClick={() => toggleZone(zone)}
              aria-pressed={filters.zones.includes(zone)}
            >
              {zone}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>Durée</h3>
        <DurationRail bounds={durationBounds} value={duration} onChange={setDuration} />
      </section>

      <div className={styles.columns}>
        <section>
          <h3 className={styles.sectionLabel}>Matériel</h3>
          <p className={styles.inertColumn} title={NO_EQUIPMENT_FIELD}>
            aucun matériel enregistré
          </p>
        </section>
        <section>
          <h3 className={styles.sectionLabel}>Lieu</h3>
          <div className={styles.optionList}>
            {locations.map((location) => {
              const isActive = filters.locations.includes(location)
              return (
                <button
                  key={location}
                  type="button"
                  className={isActive ? `${styles.option} ${styles.optionActive}` : styles.option}
                  onClick={() => toggleLocation(location)}
                  aria-pressed={isActive}
                >
                  {LOCATION_LABELS[location].toLowerCase()}
                  {isActive && <span aria-hidden="true"> ✓</span>}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* 40 l. 3828 : la règle de la feuille, au-dessus de ses deux boutons. */}
      <p className={styles.helper}>
        Chaque filtre affiche ce qu’il laisse. À zéro résultat, la feuille dit lequel coûte le plus — elle
        n’en retire aucun à ta place.
      </p>

      <div className={styles.footer}>
        <SecondaryAction className={styles.clearButton} onClick={() => onChange(EMPTY_FILTERS)}>
          Tout retirer
        </SecondaryAction>
        <PrimaryAction tone="ink-shadow" className={styles.applyButton} onClick={onClose}>
          Voir les {resultCount} séances
        </PrimaryAction>
      </div>
    </BottomSheet>
  )
}

/** 40 l. 3789-3792 : actif = aplat d'encre `padding:7px 10px` ; inactif = filet de 1 px, `6px 10px`. */
function FacetChip({
  label,
  count,
  isActive,
  onToggle,
}: {
  label: string
  count: number
  isActive: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={isActive ? `${styles.chip} ${styles.chipActive}` : styles.chip}
      onClick={onToggle}
      aria-pressed={isActive}
    >
      {label} {count}
    </button>
  )
}

/**
 * Rail de durée de l'artboard 40 (l. 3806-3812) : deux carrés d'encre de 14 px posés sur un rail de
 * 2 px, la portion retenue en encre, le reste en `#CFCCC0`, et la valeur en mono à droite.
 *
 * Deux `input[type=range]` superposés, et non un dessin : le rail doit rester saisissable au
 * clavier. Le carré est le `::-webkit-slider-thumb` / `::-moz-range-thumb`, sans rayon ; les pistes
 * natives sont effacées et redessinées par la piste peinte au-dessous.
 */
function DurationRail({
  bounds,
  value,
  onChange,
}: {
  bounds: DurationRange
  value: DurationRange
  onChange: (next: DurationRange) => void
}) {
  const span = Math.max(bounds.max - bounds.min, 1)
  const fromPercent = ((value.min - bounds.min) / span) * 100
  const toPercent = ((value.max - bounds.min) / span) * 100

  return (
    <div className={styles.durationRow}>
      <span className={styles.rail}>
        <span className={styles.railTrack} aria-hidden="true" />
        <span
          className={styles.railFill}
          style={{ left: `${fromPercent}%`, width: `${Math.max(toPercent - fromPercent, 0)}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          className={styles.railInput}
          min={bounds.min}
          max={bounds.max}
          value={value.min}
          aria-label="Durée minimale, en minutes"
          onChange={(event) => onChange({ min: Math.min(Number(event.target.value), value.max), max: value.max })}
        />
        <input
          type="range"
          className={styles.railInput}
          min={bounds.min}
          max={bounds.max}
          value={value.max}
          aria-label="Durée maximale, en minutes"
          onChange={(event) => onChange({ min: value.min, max: Math.max(Number(event.target.value), value.min) })}
        />
      </span>
      <span className={styles.durationValue}>
        {value.min}–{value.max}′
      </span>
    </div>
  )
}
