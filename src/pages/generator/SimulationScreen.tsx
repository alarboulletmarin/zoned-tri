import type { Discipline, PlanFormat } from '../../domain/types'
import type { GeneratedPlan } from '../../domain/planGenerator/summary'
import { summarizePlan } from '../../domain/planGenerator/summary'
import { formatDayMonthLong } from '../../domain/planGenerator/dates'
import { RACE_FORMATS, largestFormatWithin, raceFormat } from '../../domain/planGenerator/formats'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import styles from './SimulationScreen.module.css'

export interface SimulationScreenProps {
  /** Format demandé par l'utilisateur, refusé faute de délai. */
  requestedFormat: PlanFormat
  requestedRaceDate: string
  weeksAvailable: number
  /** Plan de repli déjà généré (rien n'est écrit tant que l'utilisateur n'accepte pas). */
  fallback: GeneratedPlan
  onAcceptFallback: () => void
  onForceRequested: () => void
  onBack: () => void
}

const DISCIPLINE_COLORS: Record<Discipline, string> = {
  N: 'var(--color-discipline-n)',
  V: 'var(--color-discipline-v)',
  C: 'var(--color-discipline-c)',
  R: 'var(--color-discipline-r)',
}

const DISCIPLINE_NAMES: Record<Discipline, string> = {
  N: 'natation',
  V: 'vélo',
  C: 'course à pied',
  R: 'renfort',
}

/** Le plus court format du catalogue — sert à dire la vérité quand aucun format ne tient. */
const SHORTEST_FORMAT = RACE_FORMATS.reduce((shortest, definition) =>
  definition.minWeeks < shortest.minWeeks ? definition : shortest,
)

/** « 7,4 » : les décimales se lisent à la française, et toute quantité passe en mono à l'affichage. */
function formatDecimal(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

/**
 * Écran 06 · Simulation — le repli proposé quand le délai est trop court pour le format demandé.
 *
 * Composant purement présentationnel : il ne génère rien et n'écrit rien. Le cadre pointillé
 * (`--border-style-simulation`) est le signe visuel, constant dans tout le produit, que ce qui est
 * à l'écran n'existe pas encore en base. Tous les chiffres viennent de `summarizePlan(fallback)`,
 * donc des séances réellement placées — jamais des intentions du formulaire.
 *
 * LIMITATION assumée : le canevas ferme l'écran sur « Ce qui va coincer sur le 70.3 » et y écrit
 * « Ta natation monte de 40 % — c'est le point de rupture le plus probable ». Ce diagnostic compare
 * le plan proposé au volume ACTUEL de l'athlète par discipline, que rien n'enregistre encore. La
 * section est donc rendue, et son vide est nommé (règle 1) plutôt que comblé par une phrase
 * plausible.
 */
export function SimulationScreen({
  requestedFormat,
  requestedRaceDate,
  weeksAvailable,
  fallback,
  onAcceptFallback,
  onForceRequested,
  onBack,
}: SimulationScreenProps) {
  const summary = summarizePlan(fallback)
  const fallbackFormat = fallback.plan.format
  const fallbackWeeks = fallback.plan.weeksCount
  const requested = raceFormat(requestedFormat)
  const missingWeeks = Math.max(0, requested.minWeeks - weeksAvailable)
  // `undefined` = même le format le plus court ne tient pas dans le délai. On ne masque pas le cas :
  // le plan de repli reste affiché, avec la mention de ce qui lui manque.
  const fits = largestFormatWithin(weeksAvailable)

  const { intensity } = summary

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Plan', 'Simulation']}
        onBack={onBack}
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <p className={styles.kicker}>Simulation · aucune donnée enregistrée</p>
          {/* Canevas : « Olympique / 11 semaines », coupé à la main. La coupure vit dans le texte
              et non dans un `<br>` — sans quoi le titre se lirait « Olympique11 semaines ». */}
          <StackedTitle className={styles.title} lines={[fallbackFormat, `${fallbackWeeks} semaines`]} />
          <p className={styles.lede}>
            Ton {requestedFormat} du {formatDayMonthLong(requestedRaceDate)} n'est pas jouable dans
            les délais : voici à quoi ressemblerait un plan {fallbackFormat} à la place.
          </p>
        </div>

        <div
          className={styles.disciplineBand}
          role="img"
          aria-label={
            summary.disciplineShares.length === 0
              ? 'Aucune séance placée'
              : `Répartition par discipline : ${summary.disciplineShares
                  .map((share) => `${DISCIPLINE_NAMES[share.discipline]} ${share.percent} %`)
                  .join(', ')}`
          }
        >
          {summary.disciplineShares.map((share) => (
            <span
              key={share.discipline}
              className={styles.disciplineSlice}
              style={{ width: `${share.percent}%`, background: DISCIPLINE_COLORS[share.discipline] }}
            />
          ))}
        </div>

        <div className={styles.counters}>
          <div className={styles.counter}>
            <div className={styles.counterLabel}>SÉANCES</div>
            <div className={styles.counterValue}>{summary.sessionsCount}</div>
          </div>
          <div className={styles.counter}>
            <div className={styles.counterLabel}>H / SEM</div>
            <div className={styles.counterValue}>{formatDecimal(summary.hoursPerWeek)}</div>
          </div>
          <div className={styles.counter}>
            <div className={styles.counterLabel}>AFFÛTAGE</div>
            {/* Pas de phase d'affûtage dans ce plan = tiret, jamais « 0 sem » qui laisserait
                croire à un affûtage de durée nulle. */}
            <div className={styles.counterValue}>
              {summary.taperWeeks > 0 ? `${summary.taperWeeks} sem` : '—'}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Ce qui change par rapport à ton {requestedFormat}</h2>
          <p className={styles.sectionText}>
            {missingWeeks > 0
              ? `Il te manque ${missingWeeks} semaines sur les ${requested.minWeeks} qu'un ${requestedFormat} demande : il en reste ${weeksAvailable}. Un ${fallbackFormat} bien préparé te fera progresser davantage qu'un ${requestedFormat} subi.`
              : `Le délai de ${weeksAvailable} semaines suffit au ${requestedFormat} : ce repli n'est proposé qu'à titre de comparaison.`}
          </p>
          {!fits && (
            <p className={styles.sectionWarning}>
              Aucun format ne tient dans {weeksAvailable} semaines : même un {SHORTEST_FORMAT.format}{' '}
              en demande {SHORTEST_FORMAT.minWeeks}. Ce plan de repli reste sous le plancher
              raisonnable de préparation.
            </p>
          )}
        </section>

        <section className={`${styles.section} ${styles.sectionTight}`}>
          <h2 className={styles.sectionLabel}>Répartition d'intensité</h2>
          <div
            className={styles.intensityBar}
            role="img"
            aria-label={`Z1 à Z2 ${intensity.z1z2Percent} %, Z3 ${intensity.z3Percent} %, Z4 et plus ${intensity.z4PlusPercent} %`}
          >
            <span
              className={styles.intensitySlice}
              style={{ width: `${intensity.z1z2Percent}%`, background: 'var(--color-zone-2)' }}
            />
            <span
              className={styles.intensitySlice}
              style={{ width: `${intensity.z3Percent}%`, background: 'var(--color-zone-3)' }}
            />
            <span
              className={styles.intensitySlice}
              style={{ width: `${intensity.z4PlusPercent}%`, background: 'var(--color-zone-4)' }}
            />
          </div>
          <div className={styles.intensityLegend} aria-hidden="true">
            <span>Z1–Z2 {intensity.z1z2Percent} %</span>
            <span>Z3 {intensity.z3Percent} %</span>
            <span>Z4+ {intensity.z4PlusPercent} %</span>
          </div>
          {/* Canevas : « Distribution pyramidale.³ » — la qualification de la preuve n'est pas
              ici, elle est dans l'appel de note du pied d'écran. */}
          <p className={styles.intensityClaim}>
            Distribution pyramidale.<sup className={styles.noteRef}>3</sup>
          </p>
        </section>

        <section className={`${styles.section} ${styles.sectionTight}`}>
          <h2 className={styles.sectionLabel}>Ce qui va coincer sur le {requestedFormat}</h2>
          <EmptyState
            className={styles.unknown}
            tone="hypothesis"
            sentence="Rien à annoncer ici : l’app ne connaît pas ton volume actuel par discipline, elle ne peut donc pas dire lequel va rompre. Aucun point de rupture n’est deviné."
          />
        </section>

        <div className={styles.footer}>
          <div className={styles.footnote}>
            <span className={styles.footnoteMark}>3.</span>
            <span className={styles.footnoteText}>
              Distribution polarisée / pyramidale — <span className={styles.footnoteLevel}>preuve solide</span>{' '}
              en endurance.
            </span>
          </div>
          <PrimaryAction tone="ink-shadow" className={styles.accept} onClick={onAcceptFallback}>
            Utiliser ce plan {fallbackFormat}
          </PrimaryAction>
          <SecondaryAction shape="link" className={styles.forceLink} onClick={onForceRequested}>
            Générer le {requestedFormat} quand même
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}
