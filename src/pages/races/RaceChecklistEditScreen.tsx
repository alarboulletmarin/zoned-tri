import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRaces } from '../../context/AppDataContext'
import {
  CHECKLIST_SECTIONS,
  checklistFromRows,
  emptyRow,
  rowsFromRace,
  templateRows,
  type ChecklistRow,
} from '../../domain/raceChecklistEdit'
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

/**
 * `/races/:id/checklist/modifier` — écrire la checklist du parc à vélo.
 *
 * Même impasse que le déroulé du jour J : `Race.transitionChecklist` existait, l'écran 30 savait
 * la cocher et la compter, mais rien ne savait l'écrire. « Checklist parc » était donc éteint pour
 * toujours sur un appareil réel.
 *
 * La liste type est un point de DÉPART qu'on édite, pas une prescription : elle ne porte aucune
 * quantité ni aucun réglage — la pression, les glucides, le pignon appartiennent à la course et à
 * l'athlète (cf. `CHECKLIST_TEMPLATE`).
 */
export function RaceChecklistEditScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { races, saveRace, loading } = useRaces()

  const race = races.find((candidate) => candidate.id === id)
  const [rows, setRows] = useState<ChecklistRow[] | null>(null)

  if (loading) return <PageLoading variant="detail" trail={['Courses', 'Checklist', 'Modifier']} />

  if (!race) {
    return (
      <MissingScreen
        trail={['Courses', 'Introuvable']}
        headline={['Course', 'introuvable']}
        sentence={
          <>
            Aucune course ne porte l’identifiant <code>{id}</code> sur cet appareil : il n’y a pas de
            parc à préparer.
          </>
        }
        exits={[{ label: 'Voir mes courses', to: RACES_PATH, primary: true }]}
        backTo={RACES_PATH}
      />
    )
  }

  const current = rows ?? rowsFromRace(race)
  const kept = checklistFromRows(current)

  async function save() {
    await saveRace({ ...race!, transitionChecklist: kept })
    navigate(racePath(race!.id, 'checklist'))
  }

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', { label: race.name, to: racePath(race.id) }, 'Checklist', 'Modifier']}
        onBack={() => navigate(racePath(race.id, 'checklist'))}
      />

      <div className={styles.column}>
        <StackedTitle className={styles.title} lines={['Checklist', 'du parc']} />

        <NoteBox className={styles.note} title="Une liste type, pas une prescription">
          les lignes proposées ne portent ni pression, ni grammage, ni pignon : ces chiffres
          appartiennent à ta course et à ton matériel. Ajoute, retire, réécris
        </NoteBox>

        {current.length === 0 && (
          <div className={styles.group}>
            <EmptyState
              className={styles.groupEmpty}
              sentence="Aucune ligne pour l’instant. Tu peux partir de la liste type et la tailler à ton matériel, ou écrire la tienne ligne à ligne."
            />
            <PrimaryAction tone="ink" onClick={() => setRows(templateRows())}>
              Partir de la liste type
            </PrimaryAction>
          </div>
        )}

        {CHECKLIST_SECTIONS.map(({ section, label }) => {
          const group = current.filter((row) => row.section === section)
          return (
            <section key={section} className={styles.group}>
              <div className={styles.groupHead}>
                <h2 className={styles.groupLabel}>{label}</h2>
                <span className={styles.groupHint}>
                  {group.length === 0 ? 'aucune ligne' : `${group.length} ligne${group.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {group.length > 0 && (
                <div className={styles.rows}>
                  {group.map((row) => (
                    <div key={row.id} className={styles.rowTop}>
                      <input
                        className={styles.label}
                        value={row.label}
                        placeholder="Casque, sangles écartées"
                        aria-label="Ligne de checklist"
                        onChange={(event) =>
                          setRows(
                            current.map((candidate) =>
                              candidate.id === row.id ? { ...candidate, label: event.target.value } : candidate,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Retirer la ligne ${row.label || 'sans nom'}`}
                        onClick={() => setRows(current.filter((candidate) => candidate.id !== row.id))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <SecondaryAction
                shape="block"
                className={styles.add}
                onClick={() => setRows([...current, emptyRow(section)])}
              >
                Ajouter une ligne · {label.split(' · ')[0]}
              </SecondaryAction>
            </section>
          )
        })}

        <div className={styles.actions}>
          <PrimaryAction tone="ink-shadow" className={styles.save} onClick={() => void save()}>
            {kept.length === 0 ? 'Enregistrer une liste vide' : `Enregistrer ${kept.length} ligne${kept.length > 1 ? 's' : ''}`}
          </PrimaryAction>
          <SecondaryAction shape="block" onClick={() => navigate(racePath(race.id, 'checklist'))}>
            Annuler
          </SecondaryAction>
          <p className={styles.blocked}>
            Une ligne laissée vide n’est pas enregistrée. Les cases déjà cochées le restent.
          </p>
        </div>
      </div>
    </div>
  )
}
