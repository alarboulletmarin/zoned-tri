import { useMemo } from 'react'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { Card } from '../../components/ui/Card/Card'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { computePlanShares, type PlanMacroShare } from '../../domain/planMacro'
import { selectOpeningState } from '../../domain/openingState'
import { todayIso } from '../../domain/planWeek'
import type { Race, TrainingPlan, Workout } from '../../domain/types'
import styles from './PlansScreen.module.css'

export interface PlansScreenProps {
  plans: TrainingPlan[]
  races: Race[]
  /** Catalogue de résolution : il ne sert qu'à nommer la prochaine séance du plan en cours. */
  workouts: Workout[]
  /** Injecté par les tests et l'atelier d'aperçu ; par défaut le jour courant du navigateur. */
  today?: string
  onResume: () => void
  onGenerate: () => void
  /** Demande de réouverture d'un plan archivé — la confirmation appartient à l'appelant. */
  onReopen: (planId: string) => void
  /** Remonte à la section Plan : « Mes plans » en est l'antichambre, pas une section de plus. */
  onBack: () => void
}

/**
 * Écran 41 · Mes plans — artboard 41 (canevas l. 3839-3883).
 *
 * « L'écran 01 ne revient jamais : on reprend, on archive, on en crée un second. » C'est
 * l'ouverture du produit dès que plusieurs plans coexistent : le plan actif avec de quoi le
 * reprendre, les plans archivés avec de quoi les rouvrir, et la règle qui gouverne les deux —
 * générer n'écrase rien, un seul plan alimente « Aujourd'hui ».
 *
 * Tous les libellés viennent de `selectOpeningState`, seule autorité du domaine sur l'état
 * d'ouverture : cet écran ne calcule ni décompte, ni avancement, ni date.
 *
 * LIMITATIONS assumées :
 * — le canevas nomme un plan archivé « Hiver base », un nom que `TrainingPlan` ne porte pas : sans
 *   course rattachée, la ligne retombe sur le format du plan plutôt que d'inventer un intitulé ;
 * — l'artboard mentionne la suppression d'un plan dans sa note de pied, mais ne dessine aucun
 *   bouton pour la déclencher : aucun n'est ajouté ici.
 */
export function PlansScreen({
  plans,
  races,
  workouts,
  today,
  onResume,
  onGenerate,
  onReopen,
  onBack,
}: PlansScreenProps) {
  const reference = today ?? todayIso()
  const state = useMemo(
    () => selectOpeningState({ plans, races, workouts, today: reference }),
    [plans, races, workouts, reference],
  )

  const activePlan = plans.find((plan) => plan.status === 'active')
  const shares = useMemo(() => (activePlan ? computePlanShares(activePlan) : []), [activePlan])

  return (
    <div className={styles.screen}>
      {/* Écart assumé au canevas 41, qui coiffe l'écran d'un bandeau de section « Plans ».
          Il annonçait une cinquième section racine que rien ne porte — ni le rail numéroté, ni
          `buildMenuCounts` — et privait l'écran de tout retour. « Mes plans » est ce qui décide
          QUEL plan alimente « Aujourd'hui » : c'est un écran de la section Plan, et son fil le
          dit. */}
      <AppHeader variant="detail" trail={['Plan', 'Mes plans']} onBack={onBack} />

      <div className={styles.column}>
        {/* 41 l. 3844-3847 */}
        <div className={styles.titleRow}>
          <StackedTitle className={styles.title} lines={['Mes', 'plans']} />
          <span className={styles.summary}>{state.summaryLabel}</span>
        </div>

        {/* 41 l. 3848 : la même frise que la vue macro — la répartition du plan en cours. Sans plan
            actif il n'y a aucun volume à découper : le canevas ne dessine pas de barre vide. */}
        {shares.length > 0 && (
          <ProgressBar
            className={styles.proportion}
            segments={proportionSegments(shares)}
            height={14}
            framed
            label={proportionLabel(shares)}
          />
        )}

        {/* 41 l. 3849-3857 */}
        <div className={styles.currentSlot}>
          {state.activePlan ? (
            <Card tone="featured" className={styles.currentCard}>
              <div className={styles.cardTop}>
                <span className={styles.cardKicker}>En cours · {state.activePlan.title}</span>
                {state.activePlan.countdownLabel && (
                  <span className={styles.countdown}>{state.activePlan.countdownLabel}</span>
                )}
              </div>
              <div className={styles.cardHeadline}>{state.activePlan.weekLabel}</div>
              <ProgressBar
                className={styles.cardProgress}
                percent={state.activePlan.progressPercent}
                label={`Avancement du plan ${state.activePlan.title}`}
              />
              {state.activePlan.nextSession && (
                <div className={styles.cardDetail}>
                  prochaine séance : {state.activePlan.nextSession.dayLabel} · {state.activePlan.nextSession.detail}
                </div>
              )}
              <PrimaryAction tone="ink" className={styles.cardAction} onClick={onResume}>
                Reprendre
              </PrimaryAction>
            </Card>
          ) : (
            <EmptyState
              headline="Aucun plan actif"
              sentence="« Aujourd’hui » n’a rien à afficher tant qu’un plan n’est pas repris ou généré."
            />
          )}
        </div>

        {/* 41 l. 3858-3871 */}
        <section className={styles.archived}>
          <div className={styles.sectionLabel}>Archivés</div>
          {state.archivedPlans.length > 0 ? (
            <div className={styles.archivedList}>
              {state.archivedPlans.map((plan) => (
                <div key={plan.planId} className={styles.archivedRow}>
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{plan.title}</span>
                    <span className={styles.rowDetail}>{plan.detail}</span>
                  </span>
                  <SecondaryAction onClick={() => onReopen(plan.planId)}>Rouvrir</SecondaryAction>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              className={styles.archivedEmpty}
              sentence="aucun plan archivé · le premier y arrivera quand tu en généreras un second"
            />
          )}
        </section>

        {/* 41 l. 3872-3875 */}
        <NoteBox className={styles.callout} title="Si tu en génères un second">
          le plan en cours n’est pas écrasé : il passe en archive, et tu peux le reprendre là où il s’était arrêté
        </NoteBox>

        {/* 41 l. 3876-3879 */}
        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Un seul plan est actif à la fois — c’est lui qui alimente « Aujourd’hui ». Supprimer un plan est l’une
            des deux seules actions qui demandent une confirmation.
          </p>
          <SecondaryAction shape="block" onClick={onGenerate}>
            Générer un nouveau plan
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}

function proportionLabel(shares: PlanMacroShare[]): string {
  return shares.map((share) => `${share.label} ${Math.round(share.percent)} %`).join(', ')
}

function proportionSegments(shares: PlanMacroShare[]): ProgressSegment[] {
  return shares.map((share) => ({
    key: share.discipline,
    percent: share.percent,
    color: `var(--color-discipline-${share.discipline.toLowerCase()})`,
    label: share.label,
  }))
}
