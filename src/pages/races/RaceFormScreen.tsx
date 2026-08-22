import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePlans, useRaces } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import {
  applyRaceDraft,
  draftFromRace,
  emptyRaceDraft,
  RACE_FORMAT_OPTIONS,
  raceDeletionEffect,
  validateRaceDraft,
  type RaceDraft,
} from '../../domain/raceEdit'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet/ConfirmSheet'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { PageLoading } from '../../components/PageLoading'
import { MissingScreen } from '../../components/MissingScreen'
import { RACES_PATH, racePath } from './routes'
import styles from './RaceFormScreen.module.css'

function newRaceId(): string {
  return `race-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface RaceFormScreenProps {
  /** `create` ouvre un brouillon vide ; `edit` reprend la course de l'adresse. */
  mode: 'create' | 'edit'
}

/**
 * `/races/nouvelle` et `/races/:id/modifier` — créer, corriger et supprimer une course.
 *
 * Une course n'entrait dans l'application que par le générateur, qui en demande le nom et la date
 * à l'étape 1. « Ajouter une course » menait donc au générateur : ajouter une course voulait dire
 * refaire un plan. Et rien ne permettait de corriger une date décalée, de saisir l'heure de départ
 * que l'écran « Jour J » affiche, d'ajouter une course de préparation — que le modèle porte
 * pourtant — ni de supprimer une entrée erronée.
 *
 * Les distances ne se saisissent pas : elles viennent du format officiel (règle nº 4, on n'invente
 * rien et on ne fait pas retaper 1,9 / 90 / 21,1).
 */
export function RaceFormScreen({ mode }: RaceFormScreenProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { races, saveRace, deleteRace, loading } = useRaces()
  const { plans } = usePlans()
  const today = useMemo(() => todayIso(), [])

  const existing = mode === 'edit' ? races.find((race) => race.id === id) : undefined
  const [edits, setEdits] = useState<Partial<RaceDraft>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const trail = mode === 'create' ? ['Courses', 'Nouvelle course'] : ['Courses', existing?.name ?? '…', 'Modifier']

  if (loading) return <PageLoading variant="detail" trail={trail} />

  if (mode === 'edit' && !existing) {
    return (
      <MissingScreen
        trail={['Courses', 'Introuvable']}
        headline={['Course', 'introuvable']}
        sentence={
          <>
            Aucune course ne porte l’identifiant <code>{id}</code> sur cet appareil. Elle a pu être
            supprimée, ou le lien vient d’une autre sauvegarde.
          </>
        }
        exits={[
          { label: 'Voir mes courses', to: RACES_PATH, primary: true },
          { label: 'Créer une course', to: `${RACES_PATH}/nouvelle` },
        ]}
        backTo={RACES_PATH}
      />
    )
  }

  const base = existing ? draftFromRace(existing) : emptyRaceDraft(today)
  const draft: RaceDraft = { ...base, ...edits }
  const errors = validateRaceDraft(draft)
  const hasErrors = Object.keys(errors).length > 0

  async function save() {
    const race = applyRaceDraft(draft, existing, newRaceId())
    await saveRace(race)
    navigate(racePath(race.id))
  }

  async function remove() {
    if (!existing) return
    await deleteRace(existing.id)
    navigate(RACES_PATH)
  }

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={trail}
        onBack={() => navigate(existing ? racePath(existing.id) : RACES_PATH)}
      />

      <div className={styles.column}>
        <StackedTitle
          className={styles.title}
          lines={mode === 'create' ? ['Nouvelle', 'course'] : ['Modifier', 'la course']}
        />

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="race-name">
              Nom de la course
            </label>
            <div className={styles.control}>
              <input
                id="race-name"
                className={styles.input}
                value={draft.name}
                placeholder="70.3 Vichy"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'error-name' : undefined}
                onChange={(event) => setEdits({ ...edits, name: event.target.value })}
              />
            </div>
            {errors.name && (
              <p id="error-name" className={styles.error} role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="race-date">
              Date
            </label>
            <div className={styles.control}>
              <input
                id="race-date"
                type="date"
                className={styles.input}
                value={draft.date}
                aria-describedby={errors.date ? 'error-date' : undefined}
                onChange={(event) => setEdits({ ...edits, date: event.target.value })}
              />
            </div>
            {errors.date && (
              <p id="error-date" className={styles.error} role="alert">
                {errors.date}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Format</span>
            {/* Les distances suivent le format : elles ne se saisissent pas, elles s'affichent. */}
            <div className={styles.options} role="group" aria-label="Format">
              {RACE_FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.format}
                  type="button"
                  className={draft.format === option.format ? styles.optionSelected : styles.option}
                  aria-pressed={draft.format === option.format}
                  onClick={() => setEdits({ ...edits, format: option.format })}
                >
                  <span className={styles.optionLabel}>{option.format}</span>
                  <span className={styles.optionMeta}>{option.distancesLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Rôle</span>
            <div className={styles.options} role="group" aria-label="Rôle">
              <button
                type="button"
                className={draft.role === 'primary_goal' ? styles.optionSelected : styles.option}
                aria-pressed={draft.role === 'primary_goal'}
                onClick={() => setEdits({ ...edits, role: 'primary_goal' })}
              >
                <span className={styles.optionLabel}>Objectif principal</span>
                <span className={styles.optionMeta}>donne au plan sa date de fin et son affûtage</span>
              </button>
              <button
                type="button"
                className={draft.role === 'preparation' ? styles.optionSelected : styles.option}
                aria-pressed={draft.role === 'preparation'}
                onClick={() => setEdits({ ...edits, role: 'preparation' })}
              >
                <span className={styles.optionLabel}>Préparation</span>
                <span className={styles.optionMeta}>une course d’entraînement, encadrée « PRÉPA »</span>
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="race-start">
              Heure de départ
            </label>
            <div className={styles.control}>
              <input
                id="race-start"
                className={styles.input}
                value={draft.startTime}
                placeholder="07:20"
                aria-invalid={errors.startTime ? true : undefined}
                aria-describedby={errors.startTime ? 'error-start' : 'hint-start'}
                onChange={(event) => setEdits({ ...edits, startTime: event.target.value })}
              />
            </div>
            {errors.startTime ? (
              <p id="error-start" className={styles.error} role="alert">
                {errors.startTime}
              </p>
            ) : (
              <p id="hint-start" className={styles.hint}>
                sert au déroulé de l’écran « Jour J » · vide, il n’en affiche aucun
              </p>
            )}
          </div>

          {/* Deux champs que le canevas ne dessine que sur l'encadré « PRÉPA » (artboard 27). */}
          {draft.role === 'preparation' && (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="race-purpose">
                  Ce que cette prépa sert à tester
                </label>
                <div className={styles.control}>
                  <input
                    id="race-purpose"
                    className={styles.input}
                    value={draft.purpose}
                    placeholder="test d’allure"
                    onChange={(event) => setEdits({ ...edits, purpose: event.target.value })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="race-easy">
                  Jours faciles avant
                </label>
                <div className={styles.control}>
                  <input
                    id="race-easy"
                    className={styles.input}
                    inputMode="numeric"
                    value={draft.easyDaysBefore}
                    placeholder="3"
                    aria-invalid={errors.easyDaysBefore ? true : undefined}
                    aria-describedby={errors.easyDaysBefore ? 'error-easy' : undefined}
                    onChange={(event) => setEdits({ ...edits, easyDaysBefore: event.target.value })}
                  />
                </div>
                {errors.easyDaysBefore && (
                  <p id="error-easy" className={styles.error} role="alert">
                    {errors.easyDaysBefore}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <PrimaryAction tone="ink-shadow" className={styles.save} disabled={hasErrors} onClick={() => void save()}>
            {mode === 'create' ? 'Créer la course' : 'Enregistrer'}
          </PrimaryAction>
          <SecondaryAction
            shape="block"
            onClick={() => navigate(existing ? racePath(existing.id) : RACES_PATH)}
          >
            Annuler
          </SecondaryAction>
          {existing && (
            <SecondaryAction shape="block" className={styles.delete} onClick={() => setConfirmDelete(true)}>
              Supprimer cette course
            </SecondaryAction>
          )}
        </div>
      </div>

      {existing && (
        <ConfirmSheet
          isOpen={confirmDelete}
          title={`Supprimer « ${existing.name} » ?`}
          effect={
            <>
              <p>Cette suppression est définitive — il n’y a pas de corbeille.</p>
              <ul>
                {raceDeletionEffect(existing, plans).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          }
          confirmLabel="Supprimer"
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
