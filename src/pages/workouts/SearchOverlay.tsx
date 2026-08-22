import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { findTextMatch, searchWorkouts } from '../../domain/searchWorkouts'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { CALCULATORS, calculatorCounter } from '../tools/calculators/registry'
import { calculatorPath } from '../tools/toolsRoutes'
import { WorkoutListRow } from './WorkoutListRow'
import styles from './SearchOverlay.module.css'
import { workoutPath } from '../../navigation'

export interface SearchOverlayProps {
  onClose: () => void
  /**
   * Terme déjà saisi. Injecté par l'atelier d'aperçu et les tests : l'artboard 25 se mesure avec
   * « seuil vélo » dans le champ. Le produit ouvre toujours la loupe sur un champ vide.
   */
  initialQuery?: string
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.icon}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16" y2="16" />
    </svg>
  )
}

/** 25 l. 2903 : le terme cherché est surligné à l'accent, DANS le titre — jamais mis en gras. */
function Highlighted({ text, start, end }: { text: string; start: number; end: number }) {
  return (
    <>
      {text.slice(0, start)}
      <mark className={styles.mark}>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  )
}

/**
 * Artboard 25 · Recherche en place (l. 2889-2936) — « loupe de l'en-tête · jamais un nouvel écran,
 * “Annuler” remet la page à l'identique ».
 *
 * Le champ REMPLACE le bandeau de 46 px : ce n'est pas une route, c'est un état de la coquille
 * (`AppShell`). Les résultats sont groupés par nature, chaque groupe portant son compte, et le
 * terme est surligné à l'accent dans chaque intitulé. La recherche est locale, et le pied le dit.
 *
 * LIMITATION : le canevas montre trois natures — « Séances · 41 », « Calculateurs · 2 » et « Dans
 * mon plan · 5 ». Les deux premières sont rendues ; la troisième ne l'est pas. Elle demanderait de
 * résoudre chaque séance d'un plan actif jusqu'à son jour (« SEM. 07 · Jeudi »), ce que la
 * coquille ne fait pas et qu'on n'approxime pas avec un titre sans sa semaine.
 */
export function SearchOverlay({ onClose, initialQuery = '' }: SearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery)
  const navigate = useNavigate()

  const workoutMatches = useMemo(() => searchWorkouts(SEED_WORKOUTS, query), [query])
  const calculatorMatches = useMemo(
    () =>
      CALCULATORS.map((definition) => ({ definition, match: findTextMatch(definition.cardTitle, query) })).filter(
        (entry): entry is { definition: (typeof CALCULATORS)[number]; match: { start: number; end: number } } =>
          entry.match !== null,
      ),
    [query],
  )

  const trimmed = query.trim()
  const total = workoutMatches.length + calculatorMatches.length
  const natures = [workoutMatches.length, calculatorMatches.length].filter((count) => count > 0).length

  function open(path: string) {
    onClose()
    navigate(path)
  }

  return (
    <div className={styles.screen}>
      {/* 25 l. 2891 : `height:46px; padding:0 16px` — le champ occupe EXACTEMENT la place du
          bandeau qu'il remplace, filet de 2 px compris. */}
      <div className={styles.header}>
        <SearchIcon />
        <input
          type="search"
          className={styles.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une séance"
          aria-label="Rechercher une séance"
          autoFocus
        />
        <button type="button" className={styles.cancel} onClick={onClose}>
          Annuler
        </button>
      </div>

      {trimmed && (
        <>
          {/* 25 l. 2897 : `48 résultats · 3 natures` à gauche, `tri : pertinence` à droite. */}
          <div className={styles.summaryRow}>
            <span>
              {total} résultat{total > 1 ? 's' : ''} · {natures} nature{natures > 1 ? 's' : ''}
            </span>
            <span>tri : pertinence</span>
          </div>

          {total === 0 ? (
            <EmptyState
              className={styles.empty}
              sentence={`Aucune séance ni calculateur ne porte « ${trimmed} » dans son intitulé. La recherche ne lit que les intitulés — pas encore le détail des blocs.`}
            />
          ) : (
            <>
              {workoutMatches.length > 0 && (
                <section className={styles.group}>
                  <h2 className={styles.groupLabel}>Séances · {workoutMatches.length}</h2>
                  <div className={styles.list}>
                    {workoutMatches.map((match) => (
                      <WorkoutListRow
                        key={match.workout.id}
                        workout={match.workout}
                        variant="search"
                        to={workoutPath(match.workout.id)}
                        onSelect={() => open(workoutPath(match.workout.id))}
                        titleContent={
                          <Highlighted text={match.workout.title} start={match.matchStart} end={match.matchEnd} />
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 25 l. 2917-2923 : les calculateurs, avec leur compteur `03 / 12` à droite. */}
              {calculatorMatches.length > 0 && (
                <section className={styles.group}>
                  <h2 className={styles.groupLabel}>Calculateurs · {calculatorMatches.length}</h2>
                  <div className={styles.list}>
                    {calculatorMatches.map(({ definition, match }) => (
                      <button
                        key={definition.id}
                        type="button"
                        className={styles.toolRow}
                        onClick={() => open(calculatorPath(definition.id))}
                      >
                        <span className={styles.toolTitle}>
                          <Highlighted text={definition.cardTitle} start={match.start} end={match.end} />
                        </span>
                        <span className={styles.toolCounter}>{calculatorCounter(definition)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      <p className={styles.footerNote}>
        Résultats groupés par nature, terme surligné à l’accent. La recherche est locale : elle fonctionne
        hors-ligne et n’est jamais envoyée.
      </p>
    </div>
  )
}
