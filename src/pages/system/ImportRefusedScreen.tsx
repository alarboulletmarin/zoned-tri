import { useNavigate } from 'react-router-dom'
import { usePlans, useProfile, useRaces, useWorkouts } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import type { AthleteProfile, Race, TrainingPlan, Workout } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { IMPORT_EXPORT_PATH } from '../tools/toolsRoutes'
import type { ImportRefusal } from './importRefusal'
import { buildUntouchedLines, formatBlockingLine, formatFileSize } from './importReport'
import styles from './ImportRefusedScreen.module.css'

export interface ImportRefusedScreenProps {
  refusal: ImportRefusal
  /** Ouvre le sélecteur de fichier et relance `importBackup`. */
  onPickAnotherFile: () => void
  /** Injecté par les tests ; par défaut le jour courant du navigateur. */
  today?: string
  /**
   * Contenu de « Ce qui n'a pas bougé ». Par défaut la base — c'est le cas du produit. L'atelier
   * d'aperçu et les tests passent le leur, comme le fait déjà `TodayScreen`.
   */
  plans?: TrainingPlan[]
  workouts?: Workout[]
  races?: Race[]
  profile?: AthleteProfile
}

/**
 * Écran 19 · Import refusé — « sauvegarde .JSON illisible · rien n'a été modifié ».
 *
 * Tout l'écran tient dans la seconde moitié de cette phrase. Un import est tout ou rien : le
 * validateur passe avant la première écriture, et l'échec ne laisse aucune trace. L'écran le prouve
 * en énumérant ce qui est resté intact, avec les vraies valeurs de la base — c'est ce qui sépare un
 * refus d'un accident.
 *
 * LIMITATIONS assumées :
 * — l'artboard numérote les lignes du fichier (« ligne 1 842 · … »). `JSON.parse` rend un objet,
 *   pas des positions : le chemin du champ prend leur place (voir `importReport.ts`) ;
 * — l'artboard n'énumère que trois erreurs. Le validateur en produit autant qu'il en trouve, et
 *   l'encart les liste toutes : en cacher serait rendre le fichier plus difficile à réparer.
 */
export function ImportRefusedScreen({
  refusal,
  onPickAnotherFile,
  today,
  plans,
  workouts,
  races,
  profile,
}: ImportRefusedScreenProps) {
  const navigate = useNavigate()
  const { plans: storedPlans } = usePlans()
  const { workouts: storedWorkouts } = useWorkouts()
  const { races: storedRaces } = useRaces()
  const { profile: storedProfile } = useProfile()

  const untouched = buildUntouchedLines({
    plans: plans ?? storedPlans,
    workouts: workouts ?? storedWorkouts,
    races: races ?? storedRaces,
    profile: profile ?? storedProfile,
    today: today ?? todayIso(),
  })

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Outils', 'Import-export', 'Import']}
        onBack={() => navigate(IMPORT_EXPORT_PATH)}
      />

      <div className={styles.column}>
        {/* `background:#E5261B; color:#FCFBF6; padding:12px 16px` : le rouge du système ne dit
            jamais « attention », il dit « refusé ». `role="alert"` pour que la phrase soit lue. */}
        <div className={styles.banner} role="alert">
          Import invalide — rien n’a été modifié
        </div>

        <div className={styles.head}>
          <StackedTitle className={styles.title} lines={['Fichier', 'illisible']} />
          <div className={styles.file}>
            {refusal.fileName} · {formatFileSize(refusal.fileSizeBytes)}
          </div>
        </div>

        <section className={styles.blocking}>
          <h2 className={styles.blockingHead}>Ce qui bloque</h2>
          <ul className={styles.blockingList}>
            {refusal.errors.map((error, index) => (
              <li key={`${error.path}-${index}`}>{formatBlockingLine(error)}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.label}>Ce qui n’a pas bougé</h2>
          {untouched.length > 0 ? (
            <ul className={styles.untouched}>
              {untouched.map((line) => (
                <li key={line}>
                  <span className={styles.mark} aria-hidden="true" />
                  <span className={styles.untouchedText}>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            /* Un vide se nomme : rien en base, donc rien à dire intact — et c'est une bonne
               nouvelle, pas une case blanche. */
            <EmptyState
              className={styles.untouchedEmpty}
              sentence="Rien n’est encore enregistré sur cet appareil : l’import n’aurait de toute façon rien eu à écraser."
            />
          )}
          <p className={styles.prose}>
            Un import est tout ou rien : il n’écrit jamais à moitié. Tu peux réessayer avec un autre
            fichier sans risque.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.label}>Réparer soi-même</h2>
          <p className={styles.prose}>
            Le fichier est du texte : les lignes en cause sont modifiables dans n’importe quel
            éditeur. Le format complet est décrit dans la page Sources.
          </p>
        </section>

        <div className={styles.footer}>
          <PrimaryAction tone="ink-shadow" className={styles.retryAction} onClick={onPickAnotherFile}>
            Choisir un autre fichier
          </PrimaryAction>
          <div className={styles.exits}>
            <SecondaryAction
              className={styles.exitChip}
              onClick={() => navigate(IMPORT_EXPORT_PATH)}
            >
              Voir le format
            </SecondaryAction>
            <SecondaryAction
              className={`${styles.exitChip} ${styles.exitChipDanger}`}
              onClick={() => navigate(IMPORT_EXPORT_PATH)}
            >
              Abandonner
            </SecondaryAction>
          </div>
        </div>
      </div>
    </div>
  )
}
