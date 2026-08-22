import { useMemo } from 'react'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { canUndoJournalEntry } from '../../domain/journal'
import type { PlanJournalEntry } from '../../domain/types'
import styles from './PlanJournalScreen.module.css'
import { InertNote } from '../../components/ui/InertNote/InertNote'

/**
 * Pourquoi « Défaire » est rendu mais inerte — cf. la LIMITATION du composant. Le motif est rendu
 * à l'écran par un `InertNote`, et non dans un `title` qu'aucun doigt ne survole.
 */
const UNDO_INERT_REASON =
  'Un retour arrière suppose une copie du plan d’avant, et l’application n’en garde pas encore. Seul le bandeau d’annulation des 6 s qui suivent un changement sait revenir en arrière.'

export interface PlanJournalScreenProps {
  entries: PlanJournalEntry[]
  onBack: () => void
  /** Injecté par les tests et l'atelier d'aperçu ; par défaut l'horloge du navigateur. */
  now?: Date
}

/**
 * Écran 39 · Journal du plan — « tout ce que le moteur a fait, daté, avec son motif ».
 *
 * C'est la mémoire de la règle « rien dans le dos de l'utilisateur » : chaque entrée dit QUI a agi
 * (toi ou le moteur), QUAND, et POURQUOI. Rien n'est effacé du journal, même annulé — une entrée
 * défaite reste écrite et le dit.
 *
 * LIMITATION assumée : le canevas pose un bouton « Défaire » sur chaque entrée. Un vrai retour
 * arrière demande une copie du plan tel qu'il était avant l'entrée, et `PlanJournalEntry` n'en
 * porte aucune — la seule annulation que l'application sait tenir est celle des 6 s qui suivent un
 * changement (`UndoToast`), parce que le plan d'avant y est encore en mémoire. Le bouton est donc
 * rendu — il est dans le canevas — mais inerte, et il dit pourquoi au survol plutôt que de marquer
 * « défait » une entrée sans rien remettre en place.
 */
export function PlanJournalScreen({ entries, onBack, now }: PlanJournalScreenProps) {
  const reference = now ?? new Date()

  // Le plus récent d'abord : le journal se lit en remontant le temps.
  const ordered = useMemo(
    () => [...entries].sort((a, b) => b.at.localeCompare(a.at)),
    [entries],
  )

  const byUser = ordered.filter((entry) => entry.author === 'user').length
  const segments: ProgressSegment[] =
    ordered.length === 0
      ? []
      : [
          {
            key: 'user',
            percent: Math.round((byUser / ordered.length) * 100),
            color: 'var(--color-ink)',
            label: 'toi',
          },
          {
            key: 'engine',
            percent: 100 - Math.round((byUser / ordered.length) * 100),
            color: 'var(--color-on-ink-muted)',
            label: 'moteur',
          },
        ]

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Plan', 'Réglages du plan', 'Journal']}
        onBack={onBack}
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <StackedTitle className={styles.title} lines={['Journal', 'du plan']} />
          <span className={styles.count}>
            {ordered.length} {ordered.length > 1 ? 'entrées' : 'entrée'}
          </span>
        </div>

        <ProgressBar
          className={styles.band}
          segments={segments}
          height={14}
          framed
          label={segments.length === 0 ? 'Journal vide' : 'Part des entrées venant de toi'}
        />

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendPip} ${styles.pipUser}`} />
            toi
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendPip} ${styles.pipEngine}`} />
            moteur
          </span>
          <span className={styles.legendWindow}>annulable 30 jours</span>
        </div>

        {ordered.length === 0 ? (
          <EmptyState
            className={styles.empty}
            sentence="Rien n’a encore été changé sur ce plan : le journal s’écrit au premier réglage appliqué."
          />
        ) : (
          <div className={styles.list}>
            {ordered.map((entry) => (
              <JournalRow key={entry.id} entry={entry} now={reference} />
            ))}
          </div>
        )}

        {/* Encart de l'artboard : la liste de ce que le moteur s'interdit. Ce n'est pas une
            promesse en l'air — chacune de ces quatre lignes est une règle tenue par le code. */}
        <div className={styles.never}>
          <div className={styles.neverLabel}>Ce que le moteur ne fera jamais seul</div>
          <p className={styles.neverText}>
            changer ta date de course · monter ton volume{'\n'}réécrire une séance faite · supprimer une séance
          </p>
        </div>

        <p className={styles.footer}>
          Chaque entrée du moteur porte son motif et son « défaire ». Rien n’est effacé du journal,
          même annulé.
        </p>
      </div>
    </div>
  )
}

/**
 * Une entrée : la pastille d'auteur, l'intitulé, la date et le motif, puis le retour arrière.
 * Au-delà de la fenêtre de 30 jours, l'entrée n'a plus de bouton du tout — le canevas n'en met
 * d'ailleurs pas sur la plus ancienne (« Plan accepté · 18 semaines »).
 */
function JournalRow({ entry, now }: { entry: PlanJournalEntry; now: Date }) {
  const undoable = canUndoJournalEntry(entry, now)

  return (
    <div className={styles.row}>
      <span
        className={`${styles.rowPip} ${entry.author === 'user' ? styles.pipUser : styles.pipEngine}`}
        role="img"
        aria-label={entry.author === 'user' ? 'Entrée de toi' : 'Entrée du moteur'}
      />
      <div className={styles.rowBody}>
        <div className={entry.undone ? styles.rowTitleUndone : styles.rowTitle}>{entry.description}</div>
        <div className={styles.rowMeta}>
          {formatEntryDate(entry.at, now)}
          {entry.reason ? ` · ${entry.reason}` : ''}
          {entry.undone ? ' · annulé' : ''}
        </div>
      </div>
      {undoable && (
        <>
          <SecondaryAction className={styles.rowAction} disabled aria-describedby="inert-defaire">
            Défaire
          </SecondaryAction>
          <InertNote id="inert-defaire" className={styles.rowInertNote}>
            {UNDO_INERT_REASON}
          </InertNote>
        </>
      )}
    </div>
  )
}

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/**
 * « aujourd'hui 18:42 » le jour même, « 12 août » avant — les deux formes du canevas. L'heure ne
 * s'écrit que pour le jour courant : au-delà, elle n'aide plus à situer l'entrée.
 */
function formatEntryDate(iso: string, now: Date): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso

  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()

  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  if (sameDay) return `aujourd’hui ${time}`
  return `${String(at.getDate()).padStart(2, '0')} ${MONTHS[at.getMonth()]}`
}
