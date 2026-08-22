import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile, usePlans, useWorkouts } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import {
  buildToolsReferences,
  findNextReferenceTest,
  type ReferenceLine,
  type ToolsReferencesView,
} from '../../domain/toolsReferences'
import type { AthleteProfile, TrainingPlan, Workout } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { DisciplineTag } from '../../components/ui/Badge/Badge'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { CalculatorCard } from './CalculatorCard'
import { CALCULATORS, CALCULATOR_COUNT } from './calculators/registry'
import { CALCULATORS_PATH, IMPORT_EXPORT_PATH } from './toolsRoutes'
import styles from './ToolsScreen.module.css'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'

/**
 * Frise de 14 px de l'artboard 12 : trois parts d'exactement `33% / 34% / 33%`. Elle ne mesure
 * rien — elle nomme les trois disciplines dont l'écran porte les références, à parts égales.
 */
const DISCIPLINE_FRIEZE: ProgressSegment[] = [
  { key: 'N', percent: 33, color: 'var(--color-discipline-n)', label: 'Natation' },
  { key: 'V', percent: 34, color: 'var(--color-discipline-v)', label: 'Vélo' },
  { key: 'C', percent: 33, color: 'var(--color-discipline-c)', label: 'Course' },
]

/** Note 7 de l'artboard 12, appelée par le `7` en exposant de la FTP. */
const FTP_FOOTNOTE = {
  mark: '7.',
  text:
    'Estimée à 95 % d’un test de 20 min : heuristique de terrain, pas un protocole validé. Un test de puissance critique serait plus juste.',
}

export interface ToolsScreenProps {
  /** Injectés par l'atelier d'aperçu et les tests ; par défaut, ce qui est en base. */
  profile?: AthleteProfile
  plans?: TrainingPlan[]
  catalogue?: Workout[]
  today?: string
}

/**
 * Écran 12 · Outils — la racine de la section : les références de l'athlète, l'accès aux douze
 * calculateurs, l'accès à l'import / export. Sur grand écran, l'artboard S8 remplace la colonne par
 * la grille des calculateurs et une colonne qui dit d'où viennent les références.
 *
 * LIMITATIONS assumées, faute de données ou d'artboard :
 * — « Enregistrer une référence » et l'export `.CSV` (S8) sont rendus inertes : écrire une
 *   référence change les allures du plan, et le canevas ne donne aucun écran pour montrer d'abord
 *   quelles séances bougent — ce que la règle « rien dans le dos de l'utilisateur » exige ;
 * — « Prochain test au plan » se résout par le titre de la séance : le modèle ne porte aucun
 *   marqueur « test de référence » (voir `REFERENCE_TEST_TITLES`).
 */
export function ToolsScreen({ profile: profileProp, plans: plansProp, catalogue, today }: ToolsScreenProps) {
  const { profile: storedProfile } = useProfile()
  const { plans: storedPlans } = usePlans()
  const { workouts } = useWorkouts()
  const breakpoint = useBreakpoint()

  const profile = profileProp ?? storedProfile
  const plans = plansProp ?? storedPlans
  const resolved = catalogue ?? workouts
  const reference = today ?? todayIso()

  const view = useMemo(() => buildToolsReferences(profile, reference), [profile, reference])
  const activePlan = plans.find((plan) => plan.status === 'active')
  const nextTest = useMemo(
    () => findNextReferenceTest(activePlan, resolved, reference),
    [activePlan, resolved, reference],
  )

  const counter = `${CALCULATOR_COUNT} calculateurs · ${view.measuredCount} référence${view.measuredCount > 1 ? 's' : ''} mesurée${view.measuredCount > 1 ? 's' : ''}`

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="root"
        label="Outils"
        desktopActions={<span className={styles.headerCount}>{counter}</span>}
      />
      {breakpoint === 'mobile' ? (
        <MobileColumn view={view} />
      ) : (
        <DesktopLayout
          view={view}
          profile={profile}
          nextTest={nextTest}
          tablet={breakpoint === 'tablet'}
        />
      )}
    </div>
  )
}

// --- Artboard 12 · mobile ---------------------------------------------------------------------

function MobileColumn({ view }: { view: ToolsReferencesView }) {
  const navigate = useNavigate()

  return (
    <div className={styles.column}>
      <div className={styles.head}>
        <StackedTitle className={styles.title} lines={['Mes', 'références']} />
        <div className={styles.headMeta}>
          {view.lastTestLabel ? `saisies à la main · dernier test ${view.lastTestLabel}` : 'saisies à la main'}
        </div>
      </div>

      <ProgressBar
        className={styles.frieze}
        segments={DISCIPLINE_FRIEZE}
        height={14}
        framed
        label="Les trois disciplines dont l’écran porte les références"
      />

      {view.lines.length === 0 ? (
        <div className={styles.refList}>
          <EmptyState
            headline="Aucune référence"
            sentence="Le profil n’est pas encore enregistré : rien n’est mesuré, donc rien n’est affiché — et rien n’est estimé à la place."
          />
        </div>
      ) : (
        <div className={styles.refList}>
          {view.lines.map((line) => (
            <ReferenceRow key={line.key} line={line} />
          ))}
        </div>
      )}

      {view.measures.length > 0 && (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Mesure</span>
            <span>Valeur</span>
          </div>
          {view.measures.map((measure) => (
            <div key={measure.label} className={styles.tableRow}>
              <span className={styles.tableLabel}>{measure.label}</span>
              <span className={measure.value ? styles.tableValue : styles.tableValueEmpty}>
                {measure.value ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footnote}>
        <span className={styles.footnoteMark}>{FTP_FOOTNOTE.mark}</span>
        <span className={styles.footnoteText}>{FTP_FOOTNOTE.text}</span>
      </div>

      <div className={styles.cta}>
        <PrimaryAction tone="ink" className={styles.ctaButton} onClick={() => navigate(CALCULATORS_PATH)}>
          Ouvrir les calculateurs
        </PrimaryAction>
        {/* L'écran 14 porte le fil « Outils / Import-export » et son carré de retour mène ici —
            mais rien ici n'y menait. Un fil qui ne se descend pas est aussi faux qu'un fil qui ne
            se remonte pas. */}
        <SecondaryAction
          shape="block"
          className={styles.ctaSecondary}
          onClick={() => navigate(IMPORT_EXPORT_PATH)}
        >
          Import / export
        </SecondaryAction>
      </div>
    </div>
  )
}

function ReferenceRow({ line }: { line: ReferenceLine }) {
  return (
    <div className={styles.refRow}>
      <DisciplineTag discipline={line.discipline} size="md" />
      <div className={styles.refBody}>
        <div className={styles.refLabel}>
          {line.label}
          {line.noteNumber !== undefined && <sup className={styles.refNote}>{line.noteNumber}</sup>}
        </div>
        <div className={line.value ? styles.refValue : `${styles.refValue} ${styles.refValueEmpty}`}>
          {line.value ?? '—'} <span className={styles.refUnit}>{line.unit}</span>
        </div>
      </div>
      <span className={styles.refMeta}>{line.meta ?? line.sinceLabel}</span>
    </div>
  )
}

// --- Artboard S8 · tablette et desktop ---------------------------------------------------------

function DesktopLayout({
  view,
  profile,
  nextTest,
  tablet,
}: {
  view: ToolsReferencesView
  profile: AthleteProfile | undefined
  nextTest: ReturnType<typeof findNextReferenceTest>
  tablet: boolean
}) {
  const navigate = useNavigate()

  return (
    <div className={`${styles.layout} ${tablet ? styles.layoutTablet : styles.layoutDesktop}`}>
      <div className={styles.grid}>
        <div className={styles.cards}>
          {CALCULATORS.map((definition) => (
            <CalculatorCard key={definition.id} definition={definition} profile={profile} />
          ))}
        </div>

        <NoteBox className={styles.gridNote} title="Un calcul ne modifie rien tout seul">
          le résultat s’affiche ici ; pour qu’il devienne ta référence et change les allures du plan,
          il faut l’enregistrer — et l’app montre d’abord quelles séances bougent
        </NoteBox>

        <div className={styles.gridFooter}>
          Chaque formule est nommée, avec sa source et son niveau de preuve : ni boîte noire, ni
          « score de forme » propriétaire.
        </div>
      </div>

      <div className={styles.side}>
        <div className={styles.sideLabel}>Mes références actuelles</div>

        {view.lines.length === 0 ? (
          <EmptyState
            className={styles.sideEmpty}
            tone="hypothesis"
            sentence="Le profil n’est pas encore enregistré : aucune référence à afficher, et aucune n’est estimée."
          />
        ) : (
          <div className={styles.sideList}>
            {view.lines.map((line) => (
              <div key={line.key} className={styles.sideRow}>
                <span className={styles.sideRowBody}>
                  <span className={styles.sideRowName}>{line.longLabel}</span>
                  {line.sinceLabel && <span className={styles.sideRowSince}>{line.sinceLabel}</span>}
                </span>
                <span className={line.value ? styles.sideRowValue : `${styles.sideRowValue} ${styles.sideRowValueEmpty}`}>
                  {line.value ? `${line.value}${line.unit === 'W' ? ' W' : ''}` : '—'}
                </span>
              </div>
            ))}
            <div className={styles.sideRow}>
              <span className={styles.sideRowBody}>
                <span className={styles.sideRowName}>{view.heartRate.label}</span>
                {view.heartRate.sinceLabel && (
                  <span className={styles.sideRowSince}>{view.heartRate.sinceLabel}</span>
                )}
              </span>
              <span
                className={
                  view.heartRate.value ? styles.sideRowValue : `${styles.sideRowValue} ${styles.sideRowValueEmpty}`
                }
              >
                {view.heartRate.value ?? '—'}
              </span>
            </div>
          </div>
        )}

        {view.heartRate.value === null && (
          <EmptyState
            className={styles.sideEmpty}
            tone="hypothesis"
            sentence={
              <>
                <span className={styles.sideEmptyTitle}>Le tiret veut dire « pas de donnée »</span>
                <span className={styles.sideEmptyBody}>
                  aucune FC max n’est estimée d’après ton âge : les zones cardio restent masquées tant
                  qu’elle n’est pas mesurée
                </span>
              </>
            }
          />
        )}

        <div className={styles.sideBlock}>
          <div className={styles.sideLabel}>Prochain test au plan</div>
          {nextTest ? (
            <>
              <div className={styles.sideBlockTitle}>{nextTest.title}</div>
              <div className={styles.sideBlockMeta}>
                {nextTest.weekLabel} · {nextTest.whenLabel}
              </div>
            </>
          ) : (
            <EmptyState
              className={styles.sideBlockEmpty}
              sentence="Aucun test de référence à venir dans le plan actif : les allures restent celles de ta dernière mesure."
            />
          )}
        </div>

        <div className={styles.sideActions}>
          <SecondaryAction
            shape="block"
            className={styles.sideExit}
            onClick={() => navigate(IMPORT_EXPORT_PATH)}
          >
            Import / export
          </SecondaryAction>
          <PrimaryAction
            tone="ink"
            className={styles.sidePrimary}
            disabled
            title="Écrire une référence change les allures du plan : l’écran qui montre quelles séances bougent n’existe pas encore."
          >
            Enregistrer une référence
          </PrimaryAction>
          <SecondaryAction className={styles.sideChip} disabled title="Export .CSV pas encore disponible">
            .CSV
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}
