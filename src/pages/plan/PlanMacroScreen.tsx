import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { PlanSegment } from '../../components/navigation/PlanSegment/PlanSegment'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { ProofPip } from '../../components/ui/ProofBadge/ProofBadge'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
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
import { weekPath } from '../../navigation'
import { EXPORTS_PRINT_PATH, exportSheetPath } from '../exports/exportsRoutes'
import styles from './PlanMacroScreen.module.css'


/** Le mot que la note de bas d'écran reprend en encre — même vocabulaire que la jauge de preuve. */
const PROOF_WORD = { solid: 'solide', moderate: 'modérée', weak: 'faible' } as const

export interface PlanMacroScreenProps {
  plan: TrainingPlan
  /** Course visée : elle donne l'objectif (« 70.3 Vichy ») et sa date. Absente, le format du plan sert de titre. */
  race?: Race
  /** Injecté par les tests et l'atelier d'aperçu ; par défaut le jour courant du navigateur. */
  today?: string
  onBack: () => void
  /** Ouvre l'écran 37 : les réglages portent sur le plan entier, comme cet écran. */
  onOpenSettings: () => void
}

/**
 * Écran 04 · Plan / Saison — artboard 04 (canevas l. 491-548). Le canevas le rattache désormais
 * au segment SAISON du plan ; il restait atteint « depuis Semaine →
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
export function PlanMacroScreen({ plan, race, today, onBack, onOpenSettings }: PlanMacroScreenProps) {
  const reference = today ?? todayIso()
  const view = useMemo(
    () => buildPlanMacroView({ plan, race: race ? { name: race.name, date: race.date } : undefined, today: reference }),
    [plan, race, reference],
  )

  return (
    <div className={styles.screen}>
      {/* Le canevas rebaptise cet écran : « Plan → segment SAISON ». Le fil le suit. */}
      <AppHeader variant="detail" trail={['Plan', 'Saison']} onBack={onBack} />
      <PlanSegment current="saison" />

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
          {/* Écart assumé à l'artboard 04, qui ne dessine pas cette commande. Les trois écrans de
              réglages du plan (37, 38, 39) n'étaient atteints par AUCUN clic : l'artboard 37 se
              dit lui-même ouvert « depuis le plan » et n'avait pas de porte. La Saison est le seul
              écran qui parle du plan dans son entier — c'est donc ici qu'on change ce qui le
              gouverne. */}
          <SecondaryAction shape="block" className={styles.settingsAction} onClick={onOpenSettings}>
            Réglages du plan
          </SecondaryAction>

          <div className={styles.exportRow}>
            <span className={styles.exportLabel}>Exporter les {view.weeksLabel}</span>
            <Link className={styles.chipButton} to={EXPORTS_PRINT_PATH}>
              .PDF
            </Link>
            <Link className={styles.chipButton} to={exportSheetPath()}>
              .ICS
            </Link>
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

  // `role="img"` masquait les enfants du conteneur : dix-huit liens invisibles au lecteur d'écran
  // seraient pires que dix-huit barres muettes. Chaque barre porte donc son propre nom.
  return (
    <div className={styles.chart}>
      {view.bars.map((bar) => (
        <Link
          key={bar.key}
          className={styles.chartBar}
          style={{ height: `${bar.heightPercent}%`, background: bar.colorVar }}
          to={weekPath(bar.weekNumber)}
          aria-label={`Semaine ${bar.weekNumber} · ${formatDurationCompact(bar.volumeMin)}`}
          title={`Semaine ${bar.weekNumber} · ${formatDurationCompact(bar.volumeMin)}`}
        />
      ))}
    </div>
  )
}

/**
 * Une phase de la saison. Les quatre lignes étaient inertes : la Saison montrait dix-huit semaines
 * et quatre phases sans qu'aucune ne descende vers ce qu'elle décrit. Chacune mène désormais à sa
 * première semaine — `PlanWeekRoute` lit déjà `?semaine=N`, personne ne le lui envoyait.
 */
function PhaseRow({ phase }: { phase: PlanMacroPhaseRow }) {
  return (
    <Link
      className={phase.isActive ? `${styles.phaseRow} ${styles.phaseRowActive}` : styles.phaseRow}
      to={weekPath(phase.firstWeekNumber)}
    >
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
    </Link>
  )
}
