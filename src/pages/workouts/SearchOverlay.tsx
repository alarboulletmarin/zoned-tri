import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { useSearchableData } from '../../context/AppDataContext'
import {
  buildSearchCorpus,
  searchCorpus,
  NATURE_LABEL,
  NATURE_ORDER,
  type SearchHit,
  type SearchNature,
} from '../../domain/searchCorpus'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { WorkoutListRow } from './WorkoutListRow'
import type { TextMatch } from '../../domain/searchWorkouts'
import styles from './SearchOverlay.module.css'

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

/**
 * 25 l. 2903 : le terme cherché est surligné à l'accent, DANS le titre — jamais mis en gras.
 *
 * `match` vaut `null` quand la ligne a été trouvée par un mot-clé (« sauvegarde » pour
 * l'import-export) : rien n'est alors surligné, parce que le mot cherché n'est pas dans le titre —
 * surligner à l'approximation serait un mensonge d'affichage.
 */
function Highlighted({ text, match }: { text: string; match: TextMatch | null }) {
  if (!match) return <>{text}</>
  return (
    <>
      {text.slice(0, match.start)}
      <mark className={styles.mark}>{text.slice(match.start, match.end)}</mark>
      {text.slice(match.end)}
    </>
  )
}

/**
 * Artboard 25 · Recherche en place (l. 2889-2936) — « loupe de l'en-tête · jamais un nouvel écran,
 * “Annuler” remet la page à l'identique ».
 *
 * Le champ REMPLACE le bandeau de 46 px : ce n'est pas une route, c'est un état de la coquille
 * (`AppShell`). Les résultats sont groupés par nature, chaque groupe portant son compte, et le
 * terme est surligné à l'accent dans chaque intitulé.
 *
 * Ce que la loupe cherche vit dans `src/domain/searchCorpus.ts` — quatre natures, dont deux
 * ajoutées au canevas (« Courses », « Écrans ») parce que sans elles la seule commande globale du
 * produit ne menait qu'au catalogue. Le corpus est le raccourci de navigation de l'application :
 * il doit atteindre ce que le rail atteint, et plus.
 *
 * LIMITATION assumée : la nature « Dans mon plan · 5 » du canevas n'est pas rendue. Elle
 * demanderait de résoudre chaque séance d'un plan actif jusqu'à son jour (« SEM. 07 · Jeudi »),
 * et on n'approxime pas un repère de semaine avec un titre qui ne le porte pas (règle nº 4).
 */
export function SearchOverlay({ onClose, initialQuery = '' }: SearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery)
  const { races } = useSearchableData()

  const corpus = useMemo(
    () => buildSearchCorpus({ workouts: SEED_WORKOUTS, races }),
    [races],
  )
  const hits = useMemo(() => searchCorpus(corpus, query), [corpus, query])

  const grouped = useMemo(() => {
    const map = new Map<SearchNature, SearchHit[]>()
    for (const hit of hits) {
      const bucket = map.get(hit.entry.nature)
      if (bucket) bucket.push(hit)
      else map.set(hit.entry.nature, [hit])
    }
    return map
  }, [hits])

  const trimmed = query.trim()
  const total = hits.length
  const natures = NATURE_ORDER.filter((nature) => (grouped.get(nature)?.length ?? 0) > 0)

  const workoutById = useMemo(
    () => new Map(SEED_WORKOUTS.map((workout) => [`workout-${workout.id}`, workout])),
    [],
  )

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
          placeholder="Rechercher dans l’application"
          aria-label="Rechercher dans l’application"
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
              {total} résultat{total > 1 ? 's' : ''} · {natures.length} nature
              {natures.length > 1 ? 's' : ''}
            </span>
            <span>tri : pertinence</span>
          </div>

          {total === 0 ? (
            <EmptyState
              className={styles.empty}
              sentence={`Rien ne porte « ${trimmed} » : ni une séance du catalogue, ni un calculateur, ni une de tes courses, ni un écran de l’application. La recherche lit les intitulés — pas encore le détail des blocs.`}
            />
          ) : (
            natures.map((nature) => {
              const group = grouped.get(nature) ?? []
              return (
                <section key={nature} className={styles.group}>
                  <h2 className={styles.groupLabel}>
                    {NATURE_LABEL[nature]} · {group.length}
                  </h2>
                  <div className={styles.list}>
                    {group.map((hit) => {
                      const workout = workoutById.get(hit.entry.id)

                      // Une séance garde SA ligne — discipline, zone, durée : la recherche ne doit
                      // pas rendre au rabais ce que la bibliothèque montre en entier.
                      if (workout) {
                        return (
                          <WorkoutListRow
                            key={hit.entry.id}
                            workout={workout}
                            variant="search"
                            to={hit.entry.to}
                            onSelect={onClose}
                            titleContent={<Highlighted text={hit.entry.title} match={hit.match} />}
                          />
                        )
                      }

                      return (
                        <Link
                          key={hit.entry.id}
                          to={hit.entry.to}
                          className={styles.toolRow}
                          onClick={onClose}
                        >
                          <span className={styles.toolTitle}>
                            <Highlighted text={hit.entry.title} match={hit.match} />
                          </span>
                          <span className={styles.toolCounter}>{hit.entry.meta}</span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })
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
