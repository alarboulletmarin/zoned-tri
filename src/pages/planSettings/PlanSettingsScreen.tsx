import { useMemo } from 'react'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import {
  IMPACT_LABEL,
  engineDecisions,
  planDisciplineShares,
  planSettingRows,
  type PlanSettingImpact,
} from '../../domain/planSettings'
import type { PlanSettingKey, Race, TrainingPlan } from '../../domain/types'
import styles from './PlanSettingsScreen.module.css'

const IMPACT_CLASS: Record<PlanSettingImpact, string> = {
  sessions: styles.impactSessions,
  upcoming: styles.impactUpcoming,
  whole_plan: styles.impactWhole,
}

/** Pourquoi une ligne d'impact « tout » ne s'ouvre pas en avant / après. */
const WHOLE_PLAN_TITLE =
  'Changer le format ou la date refait le plan entier : ça repasse par le générateur, pas par un avant / après.'

export interface PlanSettingsScreenProps {
  plan: TrainingPlan
  /** Course visée, quand le plan en porte une : elle nomme la ligne « Format et course ». */
  race?: Race
  onBack: () => void
  /** Ouvre l'écran 38 pour ce réglage. */
  onOpenSetting: (key: PlanSettingKey) => void
  onOpenJournal: () => void
  /** Repart de l'étape 1 du générateur — « Générer n'écrase rien », le plan passe en archive. */
  onRegenerate: () => void
}

/**
 * Écran 37 · Réglages du plan — « tout est réouvrable ».
 *
 * C'est la contrepartie du parcours G1→G6 : les six étapes restent modifiables après acceptation,
 * une par une, et chaque ligne dit d'avance **jusqu'où** son changement porte (le choix des
 * séances, les semaines à venir, ou le plan entier). Rien ne s'applique depuis cet écran : toute
 * ligne réouvrable mène à l'écran 38, en pointillé, qui montre l'avant / après avant d'écrire.
 *
 * Sous le tableau, ce que le moteur a décidé SEUL, avec son motif. Deux de ces décisions ont un
 * réglage derrière elles et y renvoient ; les deux autres sont des règles du moteur — leur bouton
 * reste dessiné, comme dans le canevas, mais inerte et il dit pourquoi (méthode §4).
 */
export function PlanSettingsScreen({
  plan,
  race,
  onBack,
  onOpenSetting,
  onOpenJournal,
  onRegenerate,
}: PlanSettingsScreenProps) {
  const rows = useMemo(() => planSettingRows(plan, race), [plan, race])
  const shares = useMemo(() => planDisciplineShares(plan), [plan])
  const decisions = useMemo(() => engineDecisions(plan), [plan])

  const segments: ProgressSegment[] = shares.map((share) => ({
    key: share.discipline,
    percent: share.percent,
    color: `var(--color-discipline-${share.discipline.toLowerCase()})`,
    label: share.discipline,
  }))

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Plan', 'Réglages du plan']}
        onBack={onBack}
        desktopTitle="Plan · réglages"
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <StackedTitle className={styles.title} lines={['Ton plan,', 'tes réglages']} />
          <p className={styles.headNote}>chaque ligne se change sans refaire le plan</p>
        </div>

        {/* Frise de 14 px entre deux filets de 2 px — la répartition du plan entier, telle que le
            moteur l'a écrite semaine par semaine. */}
        <ProgressBar
          className={styles.band}
          segments={segments}
          height={14}
          framed
          label={
            segments.length === 0
              ? 'Aucun volume enregistré sur ce plan'
              : 'Répartition du plan par discipline'
          }
        />

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Réglage</span>
            <span>Valeur</span>
            <span>Impact</span>
          </div>
          {rows.map((row) => {
            const impact = (
              <>
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.rowValue}>{row.value}</span>
                <span className={`${styles.rowImpact} ${IMPACT_CLASS[row.impact]}`}>
                  {IMPACT_LABEL[row.impact]}
                </span>
              </>
            )

            if (!row.reopenable) {
              return (
                <div key={row.key} className={`${styles.row} ${styles.rowInert}`} title={WHOLE_PLAN_TITLE}>
                  {impact}
                </div>
              )
            }

            return (
              <button
                key={row.key}
                type="button"
                className={styles.row}
                onClick={() => onOpenSetting(row.key)}
              >
                {impact}
              </button>
            )
          })}
        </div>

        {/* Légende des trois portées — sans elle, les trois couleurs ne disent rien. */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendPip} ${styles.impactSessionsFill}`} />
            choix de séance
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendPip} ${styles.impactUpcomingFill}`} />
            semaines à venir
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendPip} ${styles.impactWholeFill}`} />
            plan entier
          </span>
        </div>

        <section className={styles.decisions}>
          <h2 className={styles.sectionLabel}>Décisions prises par le moteur</h2>
          {decisions.length === 0 ? (
            <EmptyState
              className={styles.noDecision}
              sentence="Ce plan ne porte aucune décision de moteur enregistrée."
            />
          ) : (
            <div className={styles.decisionList}>
              {decisions.map((decision) => (
                <div key={decision.id} className={styles.decision}>
                  <div className={styles.decisionBody}>
                    <div className={styles.decisionTitle}>{decision.title}</div>
                    <div className={styles.decisionReason}>{decision.reason}</div>
                  </div>
                  <SecondaryAction
                    className={styles.decisionAction}
                    disabled={decision.setting === undefined}
                    title={decision.inertReason}
                    onClick={
                      decision.setting ? () => onOpenSetting(decision.setting as PlanSettingKey) : undefined
                    }
                  >
                    Changer
                  </SecondaryAction>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Aucun réglage ne s’applique sans te montrer d’abord la semaine avant / après. Les séances
            déjà faites ne sont jamais réécrites.
          </p>
          <div className={styles.footerActions}>
            <SecondaryAction className={styles.footerButton} onClick={onOpenJournal}>
              Journal des changements
            </SecondaryAction>
            <SecondaryAction
              className={`${styles.footerButton} ${styles.footerButtonEnd}`}
              onClick={onRegenerate}
            >
              Refaire le plan
            </SecondaryAction>
          </div>
        </div>
      </div>
    </div>
  )
}
