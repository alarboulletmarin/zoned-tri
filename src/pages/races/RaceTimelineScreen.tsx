import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRaces } from '../../context/AppDataContext'
import {
  emptyRow,
  markStart,
  rowsAreValid,
  rowsFromRace,
  timelineFromRows,
  validateRow,
  type TimelineRow,
} from '../../domain/raceTimelineEdit'
import type { RaceTimelinePhase } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { PageLoading } from '../../components/PageLoading'
import { MissingScreen } from '../../components/MissingScreen'
import { RACES_PATH, racePath } from './routes'
import styles from './RaceTimelineScreen.module.css'

const PHASES: { phase: RaceTimelinePhase; label: string; hint: string }[] = [
  { phase: 'eve', label: 'La veille', hint: 'dépôt du vélo, dernier repas, coucher' },
  { phase: 'race_day', label: 'À rebours du départ', hint: 'réveil, petit-déjeuner, parc, départ' },
]

/**
 * `/races/:id/jour-j/modifier` — écrire le déroulé du jour J.
 *
 * `Race.timeline` existait dans le modèle, `RaceDayScreen` savait l'afficher et `buildRaceIcs`
 * l'exporter en agenda — mais AUCUN écran ne savait l'écrire. Le déroulé n'existait donc que dans
 * le jeu de démonstration : sur un appareil réel, « Timeline du jour J » restait éteint pour
 * toujours, et l'export `.ICS` d'une course était du code mort.
 */
export function RaceTimelineScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { races, saveRace, loading } = useRaces()

  const race = races.find((candidate) => candidate.id === id)
  const [rows, setRows] = useState<TimelineRow[] | null>(null)

  if (loading) return <PageLoading variant="detail" trail={['Courses', 'Jour J', 'Modifier']} />

  if (!race) {
    return (
      <MissingScreen
        trail={['Courses', 'Introuvable']}
        headline={['Course', 'introuvable']}
        sentence={
          <>
            Aucune course ne porte l’identifiant <code>{id}</code> sur cet appareil : il n’y a pas de
            jour J à préparer.
          </>
        }
        exits={[{ label: 'Voir mes courses', to: RACES_PATH, primary: true }]}
        backTo={RACES_PATH}
      />
    )
  }

  // Le brouillon naît de la course à la première image, puis vit seul : on n'écrase pas une saisie
  // en cours parce que la base a rendu la main.
  const current = rows ?? rowsFromRace(race)
  const valid = rowsAreValid(current)

  function update(key: string, patch: Partial<TimelineRow>) {
    setRows(current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  async function save() {
    await saveRace({ ...race!, timeline: timelineFromRows(current) })
    navigate(racePath(race!.id, 'jour-j'))
  }

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', { label: race.name, to: racePath(race.id) }, 'Jour J', 'Modifier']}
        onBack={() => navigate(racePath(race.id, 'jour-j'))}
      />

      <div className={styles.column}>
        <StackedTitle className={styles.title} lines={['Déroulé', 'du jour J']} />

        <NoteBox className={styles.note} title="Rien n’est proposé à ta place">
          un déroulé dépend du dossard, du parc, du trajet — l’app n’a aucun moyen de le deviner.
          Ce que tu écris ici s’affiche sur l’écran « Jour J » et part dans ton agenda en .ICS
        </NoteBox>

        {PHASES.map(({ phase, label, hint }) => {
          const group = current.filter((row) => row.phase === phase)
          return (
            <section key={phase} className={styles.group}>
              <div className={styles.groupHead}>
                <h2 className={styles.groupLabel}>{label}</h2>
                <span className={styles.groupHint}>{hint}</span>
              </div>

              {group.length === 0 ? (
                <EmptyState
                  className={styles.groupEmpty}
                  sentence={`Aucun repère ${phase === 'eve' ? 'la veille' : 'le jour même'} : ce bloc n’apparaîtra pas sur l’écran « Jour J ».`}
                />
              ) : (
                <div className={styles.rows}>
                  {group.map((row) => {
                    const errors = validateRow(row)
                    return (
                      <div key={row.key} className={styles.row}>
                        <div className={styles.rowTop}>
                          <input
                            className={styles.time}
                            value={row.at}
                            placeholder="07:20"
                            aria-label="Heure du repère"
                            aria-invalid={errors.at ? true : undefined}
                            onChange={(event) => update(row.key, { at: event.target.value })}
                          />
                          <input
                            className={styles.label}
                            value={row.label}
                            placeholder="Dépôt du vélo"
                            aria-label="Nom du repère"
                            aria-invalid={errors.label ? true : undefined}
                            onChange={(event) => update(row.key, { label: event.target.value })}
                          />
                          <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Retirer le repère ${row.label || 'sans nom'}`}
                            onClick={() => setRows(current.filter((candidate) => candidate.key !== row.key))}
                          >
                            ×
                          </button>
                        </div>

                        <input
                          className={styles.detail}
                          value={row.detail}
                          placeholder="sous-ligne · « 3 h avant le départ »"
                          aria-label="Détail du repère"
                          onChange={(event) => update(row.key, { detail: event.target.value })}
                        />

                        <div className={styles.rowFoot}>
                          <button
                            type="button"
                            className={row.isStart ? styles.startOn : styles.startOff}
                            aria-pressed={row.isStart}
                            onClick={() => setRows(markStart(current, row.key))}
                          >
                            <span aria-hidden="true">{row.isStart ? '✓' : '—'}</span> C’est le départ
                          </button>
                          {(errors.at || errors.label) && (
                            <span className={styles.error} role="alert">
                              {[errors.at, errors.label].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <SecondaryAction
                shape="block"
                className={styles.add}
                onClick={() => setRows([...current, emptyRow(phase)])}
              >
                Ajouter un repère · {label.toLowerCase()}
              </SecondaryAction>
            </section>
          )
        })}

        <div className={styles.actions}>
          <PrimaryAction
            tone="ink-shadow"
            className={styles.save}
            disabled={!valid}
            onClick={() => void save()}
          >
            {current.length === 0 ? 'Enregistrer un déroulé vide' : `Enregistrer ${current.length} repère${current.length > 1 ? 's' : ''}`}
          </PrimaryAction>
          <SecondaryAction shape="block" onClick={() => navigate(racePath(race.id, 'jour-j'))}>
            Annuler
          </SecondaryAction>
          {!valid && (
            <p className={styles.blocked}>
              Un repère demande une heure au format hh:mm et un nom : sans les deux, il ne peut ni
              s’afficher, ni partir dans l’agenda.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
