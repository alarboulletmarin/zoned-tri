import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePlans, useProfile } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import {
  applyDraft,
  diffProfiles,
  draftFromProfile,
  planImpact,
  validateDraft,
  type ReferenceDraft,
  type ReferenceFieldKey,
} from '../../domain/referenceEdit'
import type { AthleteProfile } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet/ConfirmSheet'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { UndoToast } from '../../components/ui/UndoToast/UndoToast'
import { PageLoading } from '../../components/PageLoading'
import { TOOLS_PATH } from './toolsRoutes'
import styles from './ReferencesScreen.module.css'

/** Les six lignes de l'écran, dans l'ordre des trois disciplines puis des mesures du corps. */
interface FieldDefinition {
  key: ReferenceFieldKey
  label: string
  unit: string
  placeholder: string
  /** Ce que la valeur sert à calculer — la seule justification qu'un champ ait besoin d'être là. */
  feeds: string
  inputMode?: 'numeric' | 'decimal'
}

const FIELDS: FieldDefinition[] = [
  {
    key: 'css',
    label: 'CSS natation',
    unit: '/100 m',
    placeholder: '1:32',
    feeds: 'les allures des séances de natation et l’atlas des zones',
  },
  {
    key: 'ftp',
    label: 'FTP vélo',
    unit: 'W',
    placeholder: '248',
    feeds: 'les puissances cibles des séances de vélo et le calcul de charge',
    inputMode: 'numeric',
  },
  {
    key: 'runThreshold',
    label: 'Allure seuil course',
    unit: '/km',
    placeholder: '4:12',
    feeds: 'les zones d’allure à pied et la VMA qu’on en déduit',
  },
  {
    key: 'weightKg',
    label: 'Poids',
    unit: 'kg',
    placeholder: '72',
    feeds: 'les watts par kilo et les besoins en glucides',
    inputMode: 'decimal',
  },
  {
    key: 'sweatRateLPerH',
    label: 'Taux de sudation',
    unit: 'L/h',
    placeholder: '1,2',
    feeds: 'le calculateur d’hydratation et de sodium',
    inputMode: 'decimal',
  },
  {
    key: 'maxHeartRateBpm',
    label: 'FC max mesurée',
    unit: 'bpm',
    placeholder: '186',
    feeds: 'les zones de fréquence cardiaque, masquées tant qu’elle manque',
    inputMode: 'numeric',
  },
]

/** Ce qu'un calculateur peut reporter ici : `?ref=ftp&valeur=248`. */
const REPORTABLE: Record<string, ReferenceFieldKey> = {
  css: 'css',
  ftp: 'ftp',
  runThreshold: 'runThreshold',
}

/**
 * `/tools/references` — écrire ses références, et voir ce que ça change.
 *
 * « Enregistrer une référence » était un bouton gris, avec ce motif : « écrire une référence change
 * les allures de toutes les séances à venir : l'écran qui montre d'abord lesquelles bougent
 * n'existe pas encore ». Le motif partait d'une bonne intention et d'une lecture fausse du code
 * (voir `src/domain/referenceEdit.ts`) — et il laissait le produit dans une position intenable :
 * douze calculateurs qui trouvent une FTP, et aucun moyen de l'enregistrer. Le générateur les
 * demandait à l'étape 05, une fois, et plus jamais : refaire un test n'avait aucune conséquence.
 *
 * L'écran existe donc, et il tient la règle nº 2 : la feuille montre l'avant / après de chaque
 * ligne modifiée, dit ce que le plan en cours devient, et le bandeau de 6 s défait l'écriture.
 */
export function ReferencesScreen() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const { profile, saveProfile, loading } = useProfile()
  const { plans } = usePlans()
  const today = useMemo(() => todayIso(), [])

  const [edits, setEdits] = useState<Partial<ReferenceDraft>>(() => {
    // Report d'un calculateur : la valeur arrive dans l'adresse, et le champ visé s'ouvre rempli.
    const key = REPORTABLE[search.get('ref') ?? '']
    const value = search.get('valeur')
    return key && value ? { [key]: value } : {}
  })
  const [pending, setPending] = useState<AthleteProfile | null>(null)
  const [undo, setUndo] = useState<{ previous: AthleteProfile | undefined; message: string } | null>(null)

  const base = useMemo(() => draftFromProfile(profile, today), [profile, today])
  const draft: ReferenceDraft = { ...base, ...edits }
  const errors = validateDraft(draft)
  const hasErrors = Object.keys(errors).length > 0

  const next = applyDraft(draft, profile)
  const changes = diffProfiles(profile, next)
  const activePlan = plans.find((plan) => plan.status === 'active')

  // Un vide se nomme, y compris celui d’une attente : le bandeau est là dès la première
  // image, et le cadre pointillé n’apparaît qu’au-delà de 300 ms.
  if (loading) return <PageLoading variant="detail" trail={['Outils', 'Mes références']} />

  async function write(target: AthleteProfile) {
    const previous = profile
    await saveProfile(target)
    setPending(null)
    setEdits({})
    setUndo({
      previous,
      message: `${changes.length} référence${changes.length > 1 ? 's' : ''} enregistrée${changes.length > 1 ? 's' : ''} · mesurée${changes.length > 1 ? 's' : ''} le ${draft.measuredAt}`,
    })
  }

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Outils', 'Mes références']}
        onBack={() => navigate(TOOLS_PATH)}
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <div className={styles.label}>Ce sur quoi le plan s’appuie</div>
          <StackedTitle className={styles.title} lines={['Mes', 'références']} />
        </div>

        <p className={styles.lead}>
          Une valeur vide veut dire « jamais mesurée » : l’application affiche alors un tiret et
          n’estime rien à sa place. C’est ce qui la sépare d’un coach en boîte noire.
        </p>

        <div className={styles.fields}>
          {FIELDS.map((field) => {
            const error = errors[field.key]
            return (
              <div key={field.key} className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`ref-${field.key}`}>
                  {field.label}
                </label>
                <div className={styles.fieldInput}>
                  <input
                    id={`ref-${field.key}`}
                    className={styles.input}
                    value={draft[field.key]}
                    placeholder={field.placeholder}
                    inputMode={field.inputMode ?? 'text'}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `error-${field.key}` : `feeds-${field.key}`}
                    onChange={(event) => setEdits({ ...edits, [field.key]: event.target.value })}
                  />
                  <span className={styles.unit}>{field.unit}</span>
                </div>
                {error ? (
                  <p id={`error-${field.key}`} className={styles.error} role="alert">
                    {error}
                  </p>
                ) : (
                  <p id={`feeds-${field.key}`} className={styles.feeds}>
                    sert à {field.feeds}
                  </p>
                )}
              </div>
            )
          })}

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="ref-measuredAt">
              Date de mesure
            </label>
            <div className={styles.fieldInput}>
              <input
                id="ref-measuredAt"
                type="date"
                className={styles.input}
                value={draft.measuredAt}
                aria-describedby="feeds-measuredAt"
                onChange={(event) => setEdits({ ...edits, measuredAt: event.target.value })}
              />
            </div>
            <p id="feeds-measuredAt" className={styles.feeds}>
              s’applique aux références modifiées · c’est elle qui écrit « testé le 3 août · il y a 18 j »
            </p>
          </div>
        </div>

        <NoteBox className={styles.note} title="Un plan en cours garde ses allures">
          les valeurs prises à la génération restent celles du plan actif : une nouvelle mesure ne
          réécrit pas les séances déjà datées, elle sert aux écrans, aux exports et au plan suivant
        </NoteBox>

        <div className={styles.actions}>
          <PrimaryAction
            tone="ink-shadow"
            className={styles.save}
            disabled={hasErrors || changes.length === 0}
            onClick={() => setPending(next)}
          >
            {changes.length === 0 ? 'Rien à enregistrer' : `Enregistrer ${changes.length} changement${changes.length > 1 ? 's' : ''}`}
          </PrimaryAction>
          <SecondaryAction shape="block" onClick={() => navigate(TOOLS_PATH)}>
            Revenir à mes références
          </SecondaryAction>
        </div>
      </div>

      <ConfirmSheet
        isOpen={pending !== null}
        title="Enregistrer ces références ?"
        effect={
          <>
            <ul className={styles.diff}>
              {changes.map((change) => (
                <li key={change.key}>
                  {change.label} : {change.before ?? 'jamais mesurée'} → {change.after ?? 'effacée'}
                </li>
              ))}
            </ul>
            <p>{planImpact(changes, activePlan)}</p>
          </>
        }
        confirmLabel="Enregistrer"
        onConfirm={() => pending && void write(pending)}
        onCancel={() => setPending(null)}
      />

      {undo && (
        <UndoToast
          message={undo.message}
          onUndo={() => {
            // Sans profil d'avant, il n'y a rien à restaurer : on remet un profil vide plutôt que
            // de laisser un bandeau qui ne défait rien.
            void saveProfile(undo.previous ?? applyDraft(draftFromProfile(undefined, today), undefined))
            setUndo(null)
          }}
          onExpire={() => setUndo(null)}
        />
      )}
    </div>
  )
}
