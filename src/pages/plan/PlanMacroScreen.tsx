import { useMemo } from 'react'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { ProofPip } from '../../components/ui/ProofBadge/ProofBadge'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import {
  LOAD_PROGRESSION_CAVEAT,
  TAPER_EVIDENCE,
  buildPlanMacroView,
  type PlanMacroPhaseRow,
  type PlanMacroShare,
  type PlanMacroView,
} from '../../domain/planMacro'
import { todayIso } from '../../domain/planWeek'
import { formatDurationCompact } from '../../domain/workoutFormat'
import type { Race, TrainingPlan } from '../../domain/types'
import styles from './PlanMacroScreen.module.css'

const INERT_TITLE = 'Bientôt disponible'

/** Le mot que la note de bas d'écran reprend en encre — même vocabulaire que la jauge de preuve. */
const PROOF_WORD = { solid: 'solide', moderate: 'modérée', weak: 'faible' } as const

export interface PlanMacroScreenProps {
  plan: TrainingPlan
  /** Course visée : elle donne l'objectif (« 70.3 Vichy ») et sa date. Absente, le format du plan sert de titre. */
  race?: Race
  /** Injecté par les tests et l'atelier d'aperçu ; par défaut le jour courant du navigateur. */
  today?: string
  onBack: () => void
}

/**
 * Écran 04 · Plan / Vue macro — artboard 04 (canevas l. 491-548), atteint « depuis Semaine →
 * appui sur « Semaine 07 » ».
 *
 * Le seul écran qui parle du plan dans son ENTIER, et il le dit dans cet ordre : l'objectif et sa
 * date, la répartition des trois disciplines sur les dix-huit semaines, trois compteurs, le volume
 * semaine par semaine, les quatre phases avec leur état, l'export et deux notes de preuve.
 *
 * Tout est dérivé par `domain/planMacro.ts` : cet écran ne calcule ni pourcentage, ni décompte, ni
 * couleur. Le canevas ne donne pas d'artboard large à cet écran ; la largeur borne donc la colonne
 * (560 px) au lieu d'allonger les lignes — les dix-huit barres se lisent en comparant, pas en
 * s'étirant (méthode §7).
 *
 * LIMITATIONS assumées :
 * — les exports `.PDF` / `.ICS` sont rendus mais inertes (`disabled` + `title`), comme partout
 *   ailleurs dans le produit : `storage/` n'écrit que la sauvegarde `.JSON` ;
 * — les deux notes de bas d'écran ne sont pas des données du plan mais deux affirmations du
 *   moteur, vraies pour tous les plans qu'il produit (cf. `TAPER_EVIDENCE`).
 */
export function PlanMacroScreen({ plan, race, today, onBack }: PlanMacroScreenProps) {
  const reference = today ?? todayIso()
  const view = useMemo(
    () => buildPlanMacroView({ plan, race: race ? { name: race.name, date: race.date } : undefined, today: reference }),
    [plan, race, reference],
  )

  return (
    <div className={styles.screen}>
      {/* 04 l. 492-498 : carré de retour, fil « Plan / Vue macro », burger. */}
      <AppHeader variant="detail" trail={['Plan', 'Vue macro']} onBack={onBack} desktopTitle="Plan · vue macro" />

      <div className={styles.column}>
        {/* 04 l. 499-503 */}
        <section className={styles.goal}>
          <div className={styles.goalLabel}>Objectif principal</div>
          {/* Le canevas n'écrit ce titre que sur une ligne ; `StackedTitle` le porte quand même,
              c'est lui qui tient la casse et la chasse des titres d'affiche (méthode §5 bis). */}
          <StackedTitle className={styles.goalTitle} lines={[view.goalTitle]} />
          <div className={styles.goalMeta}>{view.goalMeta}</div>
        </section>

        {/* 04 l. 504 : `height:14px` entre deux filets de 2 px, écrit en `content-box`. */}
        <ProgressBar
          className={styles.proportion}
          segments={proportionSegments(view.shares)}
          height={14}
          framed
          label={proportionLabel(view.shares)}
        />

        {/* 04 l. 505-510 : trois cellules égales, filets de 1 px entre elles et sous la rangée. */}
        <div className={styles.counters}>
          <Counter label="Séances" value={String(view.sessionCount)} />
          <Counter label="Heures" value={view.hoursLabel} />
          <Counter label="Faites" value={view.weeksDoneLabel} />
        </div>

        {/* 04 l. 511-521 */}
        <section className={styles.volume}>
          <div className={styles.sectionLabel}>Volume hebdo · {view.weeksLabel}</div>
          <WeekVolumeChart view={view} />
        </section>

        {/* 04 l. 522-541 */}
        <div className={styles.phases}>
          {view.phases.map((phase) => (
            <PhaseRow key={phase.key} phase={phase} />
          ))}
        </div>

        {/* 04 l. 542-548 : l'export, puis les deux notes — collés en bas par `margin-top:auto`. */}
        <footer className={styles.footer}>
          <div className={styles.exportRow}>
            <span className={styles.exportLabel}>Exporter les {view.weeksLabel}</span>
            <button type="button" className={styles.chipButton} disabled title={INERT_TITLE}>
              .PDF
            </button>
            <button type="button" className={styles.chipButton} disabled title={INERT_TITLE}>
              .ICS
            </button>
          </div>

          <div className={styles.footnote}>
            <span className={styles.footnoteMark}>2.</span>
            <span className={styles.footnoteText}>
              {TAPER_EVIDENCE.sourceRef} —{' '}
              <span className={styles.footnoteLevel}>preuve {PROOF_WORD[TAPER_EVIDENCE.level]}</span>.{' '}
              {TAPER_EVIDENCE.text}
            </span>
          </div>

          <div className={styles.caveat}>
            {/* Le motif hachuré du système dit « preuve écartée » : c'est exactement ce que la
                phrase annonce, et le motif reste lisible sans couleur (`ProofPip`, variante large
                sans contour — la forme que le canevas donne à ce rectangle de légende). */}
            <ProofPip level="weak" size="legend" />
            <span className={styles.caveatText}>{LOAD_PROGRESSION_CAVEAT}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function proportionLabel(shares: PlanMacroShare[]): string {
  if (shares.length === 0) return 'Aucun volume enregistré sur ce plan'
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

/** Une des trois cellules chiffrées (04 l. 506-508). L'intitulé est en capitales par le CSS. */
function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.counter}>
      <div className={styles.counterLabel}>{label}</div>
      <div className={styles.counterValue}>{value}</div>
    </div>
  )
}

/**
 * L'histogramme des semaines (04 l. 513-520) : une colonne par semaine, hauteur relative à la
 * semaine la plus chargée, couleur donnée par la phase.
 *
 * Il n'emprunte pas `WeekStrip` : celui-ci décrit SEPT jours nommés par leur initiale, et son
 * modèle (`initial`, `name`, jour libre en pointillé) n'a pas de sens pour dix-huit semaines que
 * le canevas dessine sans axe. C'est un graphique propre à cet écran, comme le mini-profil de
 * blocs l'est à l'écran Aujourd'hui.
 */
function WeekVolumeChart({ view }: { view: PlanMacroView }) {
  if (view.bars.length === 0) {
    return <div className={styles.chartEmpty}>Ce plan ne porte aucune semaine : rien à comparer.</div>
  }

  const summary = view.bars
    .map((bar) => `semaine ${bar.weekNumber} ${formatDurationCompact(bar.volumeMin)}`)
    .join(', ')

  return (
    <div className={styles.chart} role="img" aria-label={`Volume hebdomadaire : ${summary}`}>
      {view.bars.map((bar) => (
        <div
          key={bar.key}
          className={styles.chartBar}
          style={{ height: `${bar.heightPercent}%`, background: bar.colorVar }}
          title={`Semaine ${bar.weekNumber} · ${formatDurationCompact(bar.volumeMin)}`}
        />
      ))}
    </div>
  )
}

function PhaseRow({ phase }: { phase: PlanMacroPhaseRow }) {
  return (
    <div className={phase.isActive ? `${styles.phaseRow} ${styles.phaseRowActive}` : styles.phaseRow}>
      <span className={styles.phaseSwatch} style={{ background: phase.colorVar }} aria-hidden="true" />
      <span className={styles.phaseBody}>
        <span className={styles.phaseTitle}>{phase.label}</span>
        {phase.description && (
          <span className={styles.phaseDetail}>
            {phase.description}
            {phase.hasEvidence && <sup className={styles.noteRef}>2</sup>}
          </span>
        )}
      </span>
      {phase.statusLabel && <span className={styles.phaseStatus}>{phase.statusLabel}</span>}
    </div>
  )
}
