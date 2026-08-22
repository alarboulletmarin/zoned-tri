import { useMemo } from 'react'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { ZoneTag } from '../../components/ui/Badge/Badge'
import type { Workout } from '../../domain/types'
import { formatDurationCompact, zoneToNumber } from '../../domain/workoutFormat'
import {
  buildActiveFilterChips,
  buildFilterCascade,
  findNearestWorkouts,
  mostRestrictiveCategory,
  relaxFilterCategory,
  type FilterCategory,
  type WorkoutFilters,
} from '../../domain/workoutFilters'
import styles from './EmptyResultsPanel.module.css'
import { Link } from 'react-router-dom'
import { workoutPath } from '../../navigation'

const CATEGORY_LABEL: Record<FilterCategory, string> = {
  discipline: 'la discipline',
  zone: 'la zone',
  duration: 'la durée',
  location: 'le lieu',
}

export interface EmptyResultsPanelProps {
  catalogue: Workout[]
  filters: WorkoutFilters
  onChange: (filters: WorkoutFilters) => void
}

/**
 * Artboard 26 · Rien à ce croisement (l. 2941-2977) — « quatre filtres cumulés · le vide nomme le
 * filtre coupable ». Le corps entier de la bibliothèque est remplacé : plus de titre d'affiche, plus
 * de rangée de commandes, plus de décompte. Cinq blocs, dans cet ordre :
 *
 * 1. les jetons de filtres, ici en APLAT d'encre (ils sont devenus le sujet) et le compte en lime ;
 * 2. la bande de répartition, vidée de ses couleurs — il n'y a plus rien à répartir ;
 * 3. le vide lui-même : cadre pointillé d'encre, titre de 32 px, phrase, et deux sorties ;
 * 4. ce que chaque filtre coûte : la cascade « 84 → 7 → 3 → 0 » et sa légende ;
 * 5. les plus proches : ce qui aurait passé s'il manquait un filtre de moins.
 *
 * ÉCART assumé sur la première sortie : le canevas écrit « Élargir à < 45′ », un seuil arrondi.
 * On élargit à la durée EXACTE de la séance la plus proche que seule la durée écarte — un seuil
 * arrondi serait une valeur inventée. Sans une telle séance, la sortie retire la durée.
 */
export function EmptyResultsPanel({ catalogue, filters, onChange }: EmptyResultsPanelProps) {
  const chips = buildActiveFilterChips(filters)
  const cascade = useMemo(() => buildFilterCascade(catalogue, filters), [catalogue, filters])
  const nearest = useMemo(() => findNearestWorkouts(catalogue, filters), [catalogue, filters])
  const culprit = mostRestrictiveCategory(catalogue, filters)

  // Ce qui restait AVANT que le filtre le plus coûteux ne s'applique : le chiffre est déjà dans la
  // cascade, on ne refait pas le calcul. Premier de la cascade = le catalogue entier.
  const culpritIndex = culprit ? cascade.findIndex((step) => step.category === culprit) : -1
  const beforeCulprit =
    culpritIndex < 0 ? undefined : culpritIndex === 0 ? catalogue.length : cascade[culpritIndex - 1].count
  const widening = findWidening(nearest, filters)
  // Seconde sortie du canevas (« Retirer le lieu ») : le dernier filtre posé, ou le coupable
  // lui-même quand la première sortie s'est contentée de l'élargir.
  const secondExit = culprit
    ? widening
      ? culprit
      : (chips.map((chip) => chip.category).filter((category) => category !== culprit).at(-1) ?? null)
    : null

  return (
    <div className={styles.panel}>
      {/* 26 l. 2946-2952 : `padding:14px 20px 0; gap:6px`, aplats d'encre puis le compte en lime. */}
      <div className={styles.chipsRow}>
        {chips.map((chip) => (
          <button
            key={chip.category}
            type="button"
            className={styles.chip}
            onClick={() => onChange(relaxFilterCategory(filters, chip.category))}
            aria-label={`Retirer le filtre ${chip.label}`}
          >
            {chip.label} <span aria-hidden="true">×</span>
          </button>
        ))}
        <span className={styles.countChip}>
          {chips.length} filtre{chips.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* 26 l. 2953 : la bande reste, en un seul aplat neutre — un écran sans résultat garde sa
          silhouette, il ne se replie pas. */}
      <ProgressBar
        className={styles.emptyBar}
        segments={[{ key: 'none', percent: 100, color: 'var(--color-neutral-fill)' }]}
        height={14}
        framed
        label="Aucune séance à répartir"
      />

      <EmptyState
        className={styles.box}
        tone="dead-end"
        headline={'Rien à ce\ncroisement'}
        sentence={emptySentence(chips.map((chip) => chip.label), culprit, beforeCulprit)}
        action={
          culprit && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => onChange(widening ? widening.filters : relaxFilterCategory(filters, culprit))}
              >
                {widening ? `Élargir à ${formatDurationCompact(widening.toMin)}` : `Retirer ${CATEGORY_LABEL[culprit]}`}
              </button>
              {secondExit && (
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => onChange(relaxFilterCategory(filters, secondExit))}
                >
                  Retirer {CATEGORY_LABEL[secondExit]}
                </button>
              )}
            </div>
          )
        }
      />

      {/* 26 l. 2961-2967 : « Ce que chaque filtre coûte », la cascade, puis sa légende. */}
      {cascade.length > 0 && (
        <section className={styles.block}>
          <h2 className={styles.blockLabel}>Ce que chaque filtre coûte</h2>
          <p className={styles.cascade}>
            {cascade.map((step, index) => (
              <span key={step.category}>
                {index > 0 && (
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                )}
                <span className={index === cascade.length - 1 ? styles.cascadeZero : undefined}>{step.count}</span>
              </span>
            ))}
          </p>
          <p className={styles.cascadeLegend}>
            {cascade.map((step, index) => (index === 0 ? step.label : `+ ${step.label}`)).join(' · ')}
          </p>
        </section>
      )}

      {/* 26 l. 2968-2974 : « Les plus proches ». Sans elles, l'écran serait un cul-de-sac. */}
      {nearest.length > 0 && (
        <section className={styles.block}>
          <h2 className={styles.blockLabel}>Les plus proches</h2>
          <div className={styles.nearList}>
            {nearest.map(({ workout, missedCategories }) => (
              <Link
                key={workout.id}
                className={styles.nearRow}
                to={workoutPath(workout.id)}
                state={{ from: 'Bibliothèque' }}
                title={`Écartée par ${missedCategories.map((category) => CATEGORY_LABEL[category]).join(' et ')}`}
              >
                {workout.zone ? (
                  <ZoneTag zone={zoneToNumber(workout.zone)} />
                ) : (
                  <span className={styles.noZone} aria-label="Aucune zone enregistrée">
                    —
                  </span>
                )}
                <span className={styles.nearTitle}>{workout.title}</span>
                <span className={styles.nearDuration}>{formatDurationCompact(workout.durationMin)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className={styles.footerNote}>Aucun filtre n’est retiré à ta place : l’app propose, tu décides.</p>
    </div>
  )
}

/**
 * Phrase du vide (26 l. 2954) : ce que le croisement demandait, puis le filtre qui coûte le plus et
 * ce qu'il coûte exactement. Le canevas écrit la sienne à la main (« les séances de sprint en eau
 * libre commencent à 35 minutes ») ; celle-ci dit la même chose avec les chiffres du catalogue.
 */
function emptySentence(labels: string[], culprit: FilterCategory | null, before: number | undefined): string {
  // Les libellés restent tels que les jetons les écrivent : « Z6 » n'est pas « z6 », et une phrase
  // qui rebaptise le filtre qu'elle explique ne s'y recoupe plus.
  const crossing = `Aucune séance ne réunit ${labels.join(', ')}.`
  if (!culprit || before === undefined) return crossing
  return `${crossing} Le filtre le plus strict est ${CATEGORY_LABEL[culprit]} : ${before} séance${
    before > 1 ? 's' : ''
  } passaient avant lui.`
}

/**
 * Élargissement proposé par la première sortie : la durée de la séance la plus proche que SEULE la
 * durée écarte. C'est un chiffre du catalogue, pas un seuil arrondi.
 */
function findWidening(
  nearest: ReturnType<typeof findNearestWorkouts>,
  filters: WorkoutFilters,
): { filters: WorkoutFilters; toMin: number } | null {
  if (!filters.duration) return null
  const candidate = nearest.find(
    (entry) => entry.missedCategories.length === 1 && entry.missedCategories[0] === 'duration',
  )
  if (!candidate) return null
  const { durationMin } = candidate.workout
  return {
    toMin: durationMin,
    filters: {
      ...filters,
      duration: {
        min: Math.min(filters.duration.min, durationMin),
        max: Math.max(filters.duration.max, durationMin),
      },
    },
  }
}
