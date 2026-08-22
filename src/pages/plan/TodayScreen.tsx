import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePlans, useProfile, useRaces, useWorkouts } from '../../context/AppDataContext'
import { usePublishRailBlock } from '../../context/RailBlockContext'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { todayIso, weekdayIndex } from '../../domain/planWeek'
import { selectOpeningState } from '../../domain/openingState'
import { DAY_LABELS, buildWeekContext, type WeekBar, type WeekContext } from '../../domain/weekContext'
import { buildSwimSetRows } from '../../domain/swimSetRows'
import {
  buildTodayView,
  type TodayAllDoneView,
  type TodayHeader,
  type TodayRestDayView,
  type TodaySessionCard,
  type TodaySessionsView,
  type TodayWeekPausedView,
  type UpcomingSession,
} from '../../domain/todayState'
import { formatDurationMin, zoneToNumber } from '../../domain/workoutFormat'
import { TODAY_FRAME_COLOR_VAR, buildTodayProfileBars, repeatRestLabel } from '../../domain/workoutBlocks'
import type { AthleteProfile, EvidenceNoteData, ProofLevel, Race, TrainingPlan, Workout } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { DisciplineTag, ZoneTag, type ZoneNumber } from '../../components/ui/Badge/Badge'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { WeekStrip, type WeekStripDay } from '../../components/ui/WeekStrip/WeekStrip'
import styles from './TodayScreen.module.css'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'

const WEEK_PATH = '/plan/semaine'

/** Nombre de lignes de « reste cette semaine » (artboard 02) et de « prochaine échéance » (02b). */
const REST_LIMIT = 3
const NEXT_LIMIT = 2

export interface TodayScreenProps {
  plan: TrainingPlan
  /**
   * Catalogue de résolution des identifiants du plan. Par défaut les séances enregistrées en base
   * — c'est le cas du produit. L'atelier d'aperçu et les tests passent le leur, comme le fait déjà
   * `SemaineScreen`.
   */
  catalogue?: Workout[]
  /**
   * Profil de l'athlète. Par défaut celui de la base ; il n'alimente que la colonne latérale
   * large (canevas S4), dont la note « prochaine référence » dérive des dates de test du profil.
   */
  profile?: AthleteProfile
  /** Courses connues, pour le décompte `J-77` du bloc de rail. Par défaut celles de la base. */
  races?: Race[]
  /** Injecté par les tests ; par défaut le jour courant du navigateur. */
  today?: string
  /** Injecté par les tests ; par défaut l'horloge du navigateur (date du « il y a 2 h »). */
  now?: Date
}

/**
 * Écran 02 · Plan · Aujourd'hui — la réponse à « qu'est-ce que je fais aujourd'hui ».
 *
 * Quatre états, un seul flux vertical : séance(s) du jour (02 / 15), jour de repos (02a),
 * journée finie (02b), semaine en pause (02c). L'en-tête de section (mot-symbole, recherche,
 * burger) appartient à la coquille : cet écran ne rend que son propre contenu.
 *
 * Dès la tablette, l'écran passe en deux colonnes (canevas S4) : la séance et son déroulé à
 * gauche, le contexte de la semaine à droite. Le flux mobile n'est pas étiré — il gagne ce que le
 * canevas lui ajoute (`showSets`, `showWeekBars`), rien de plus.
 *
 * LIMITATIONS assumées, faute de données ou de moteur derrière :
 * — « Ajouter une séance légère », « Noter le ressenti » et les exports `.FIT` / `.ICS` / `.PDF`
 *   sont rendus mais inertes (`disabled`) ;
 * — l'encart « Ce que la séance a donné » n'affiche que des tirets : le modèle ne porte aucune
 *   donnée réalisée, et rien n'est estimé à la place d'une mesure absente.
 */
export function TodayScreen({ plan, catalogue, profile, races, today, now }: TodayScreenProps) {
  const { workouts, saveWorkout } = useWorkouts()
  const { savePlan } = usePlans()
  const { profile: storedProfile } = useProfile()
  const { races: storedRaces } = useRaces()
  const breakpoint = useBreakpoint()

  const resolved = catalogue ?? workouts
  const reference = today ?? todayIso()
  const athlete = profile ?? storedProfile
  const raceList = races ?? storedRaces
  // L'horloge n'entre pas dans les dépendances : elle ne sert qu'à dater un « il y a 2 h »,
  // qui n'a pas à provoquer un recalcul à chaque rendu.
  const view = useMemo(
    () => buildTodayView(plan, resolved, reference, now ?? new Date()),
    [plan, resolved, reference, now],
  )

  /**
   * Colonne latérale de S4 (l. 1616-1655). `showWeekBars` et `showSets` sont faux en mobile :
   * l'artboard 02 n'a ni histogramme ni tableau, et on ne les lui ajoute pas. Sans profil, il n'y
   * a pas de « prochaine référence » à dériver — `buildWeekContext` le dit lui-même.
   * Midi UTC : le jour injecté par les tests et l'aperçu doit rester celui-là, quel que soit le
   * fuseau du navigateur.
   */
  const weekContext = useMemo(
    () =>
      breakpoint === 'mobile' || !athlete
        ? null
        : buildWeekContext(plan, resolved, athlete, new Date(`${reference}T12:00:00Z`)),
    [breakpoint, plan, resolved, athlete, reference],
  )

  // Bloc du rail (S4 l. 1556-1560) : intitulé de semaine, avancement du plan, décompte. Les trois
  // viennent de `selectOpeningState`, seule autorité du domaine sur ces libellés — l'écran ne
  // calcule ni pourcentage ni date.
  const railCard = useMemo(
    () =>
      selectOpeningState({ plans: [plan], races: raceList, workouts: resolved, profile: athlete, today: reference })
        .activePlan,
    [plan, raceList, resolved, athlete, reference],
  )
  const railLines =
    railCard && view.kind !== 'out_of_range' ? (railCard.countdownLabel ? [railCard.countdownLabel] : []) : null
  usePublishRailBlock(railCard?.weekLabel ?? '', railLines, railLines ? railCard?.progressPercent : undefined)

  async function markDone(workout: Workout) {
    await saveWorkout({ ...workout, status: 'completed', completedAt: new Date().toISOString() })
  }

  async function undoDone(workout: Workout) {
    const restored: Workout = { ...workout, status: 'planned' }
    delete restored.completedAt
    await saveWorkout(restored)
  }

  async function resumePlan(weekNumber: number) {
    await savePlan({
      ...plan,
      weeks: plan.weeks.map((week) => {
        if (week.weekNumber !== weekNumber) return week
        const resumed = { ...week }
        delete resumed.blockedReason
        return resumed
      }),
    })
  }

  async function blockOneMoreWeek(weekNumber: number, reason: string) {
    await savePlan({
      ...plan,
      weeks: plan.weeks.map((week) =>
        week.weekNumber === weekNumber + 1 ? { ...week, blockedReason: reason } : week,
      ),
    })
  }

  if (view.kind === 'out_of_range') return null

  // Deux colonnes : seule la journée à une séance a un artboard large (S4). La journée à deux
  // séances (15) et les états 02a/02b/02c n'en ont pas — ils gardent leur colonne bornée.
  const split =
    breakpoint !== 'mobile' && view.kind === 'sessions' && view.cards.length === 1 && weekContext !== null

  const remaining =
    view.kind === 'sessions' && view.rest.length > 0 ? (
      <span className={styles.todayLabel}>{remainingLabel(view.rest.length)}</span>
    ) : undefined

  return (
    <div className={split ? `${styles.screen} ${styles.screenSplit}` : styles.screen}>
      {/* Artboard 02 : bandeau de section « Plan », puis le titre du jour, qui est du contenu.
          Le bandeau reste hors de `.column` : sur desktop (S4) il court sur toute la largeur du
          cadre, à droite du rail, tandis que le contenu se borne à une colonne centrée. */}
      {/* S4 pose le décompte de la semaine à droite du titre, dès la tablette : `rootActions` le
          porte sur la barre de 46 px, `desktopActions` sur celle de 52 px. */}
      <AppHeader
        variant="root"
        label="Plan"
        rootActions={remaining}
        desktopActions={remaining}
      />

      <div className={split ? `${styles.column} ${styles.columnSplit}` : styles.column}>
      <ScreenHeader view={view} oneLine={split} />

      {view.missingWorkoutIds.length > 0 && (
        <div className={styles.body}>
          <div className={styles.missing}>
            {view.missingWorkoutIds.length === 1 ? 'séance introuvable' : 'séances introuvables'} ·{' '}
            {view.missingWorkoutIds.join(', ')}
          </div>
        </div>
      )}

      {view.kind === 'sessions' && (
        <SessionsState
          view={view}
          context={split ? weekContext : null}
          onMarkDone={markDone}
        />
      )}
      {view.kind === 'rest_day' && <RestDayState view={view} />}
      {view.kind === 'all_done' && <AllDoneState view={view} onUndo={undoDone} />}
      {view.kind === 'week_paused' && (
        <WeekPausedState
          view={view}
          onResume={() => resumePlan(view.weekNumber)}
          onBlockMore={() => blockOneMoreWeek(view.weekNumber, view.reason)}
        />
      )}
      </div>
    </div>
  )
}

/** `3 séances restantes cette semaine` — bandeau de S4 (l. 1572), à droite du titre de section. */
function remainingLabel(count: number): string {
  return count > 1 ? `${count} séances restantes cette semaine` : '1 séance restante cette semaine'
}

// --- En-tête du jour + barre de répartition ---------------------------------------------

function proportionLabel(view: TodayHeader): string {
  if (view.paused) return 'Semaine en pause, aucun volume prévu'
  if (view.shares.length === 0) return 'Aucune séance cette semaine'
  return view.shares.map((share) => `${share.label} ${Math.round(share.percent)} %`).join(', ')
}

function ScreenHeader({ view, oneLine }: { view: TodayHeader; oneLine: boolean }) {
  return (
    <>
      {/* `div` et non `header` : dans l'artboard 02 ce bloc est du contenu (le titre du jour), pas
          un bandeau — le seul bandeau de l'écran est l'`AppHeader` au-dessus. */}
      {/* Artboard 15 : quand la journée porte une pile de séances, l'en-tête se resserre
          (`14px 20px 12px` au lieu de `16px 20px 14px`) et le titre passe de 34 à 32 px — la place
          gagnée revient aux cartes. */}
      <div className={`${styles.dayHeader} ${view.headerRight.emphasis ? styles.dayHeaderDense : ''}`}>
        <div>
          <div className={styles.weekLabel}>{view.weekLabel}</div>
          {/* L'artboard 02 casse la date en deux lignes (`Mardi<br>25 août`) parce que la colonne
              mobile ne tient pas la ligne entière ; S4, lui, l'écrit d'un trait (`MARDI 25 AOÛT`).
              On suit chaque artboard à sa largeur. */}
          <StackedTitle
            className={styles.dayTitle}
            lines={oneLine ? [`${view.dayName} ${view.dayDate}`] : [view.dayName, view.dayDate]}
          />
        </div>
        <span className={view.headerRight.emphasis ? styles.headerCount : styles.headerVolume}>
          {view.headerRight.label}
        </span>
      </div>

      {/* `framed` : 14 px de couleur entre deux filets de 2 px, soit 18 px occupés — le canevas
          écrit cette frise en `content-box` sur les six artboards du bloc Aujourd'hui. */}
      <ProgressBar
        className={styles.proportion}
        segments={proportionSegments(view)}
        height={14}
        framed
        label={proportionLabel(view)}
      />
    </>
  )
}

/** Hachures de la semaine en pause : pas de couleur, il n'y a pas de volume à répartir. */
const PAUSED_SEGMENT: ProgressSegment[] = [
  {
    key: 'paused',
    percent: 100,
    color:
      'repeating-linear-gradient(135deg, var(--color-neutral-fill) 0 6px, var(--color-hairline) 6px 12px)',
  },
]

function proportionSegments(view: TodayHeader): ProgressSegment[] {
  if (view.paused) return PAUSED_SEGMENT
  return view.shares.map((share) => ({
    key: share.discipline,
    percent: share.percent,
    color: `var(--color-discipline-${share.discipline.toLowerCase()})`,
    label: share.label,
  }))
}

// --- Briques partagées -------------------------------------------------------------------

function SessionList({
  label,
  sessions,
  withSublineOnFirst = false,
  linkToWeek = true,
  className,
}: {
  label: string
  sessions: UpcomingSession[]
  withSublineOnFirst?: boolean
  linkToWeek?: boolean
  /** Placement propre à la colonne latérale large (canevas S4 : pas de filet haut, 26 px au-dessus). */
  className?: string
}) {
  if (sessions.length === 0) return null

  return (
    <section className={className ? `${styles.listBlock} ${className}` : styles.listBlock}>
      <div className={styles.sectionLabel}>
        {label}
        {linkToWeek && (
          <>
            {' · '}
            <Link className={styles.weekLink} to={WEEK_PATH}>
              voir la semaine →
            </Link>
          </>
        )}
      </div>
      {sessions.map((session, index) => (
        <div key={session.key} className={styles.listRow}>
          <DisciplineTag discipline={session.discipline} size="md" />
          <span className={styles.listTitle}>
            {session.title}
            {withSublineOnFirst && index === 0 && <span className={styles.listSubline}>{session.subline}</span>}
          </span>
          <span className={styles.listDay}>{session.dayLabel}</span>
        </div>
      ))}
    </section>
  )
}

function FooterNote({ children }: { children: string }) {
  return <div className={styles.footerNote}>{children}</div>
}

// --- 02 · une séance / 15 · deux séances --------------------------------------------------

function SessionsState({
  view,
  context,
  onMarkDone,
}: {
  view: TodaySessionsView
  /** Non nul = mise en page large (canevas S4) : la séance à gauche, la semaine à droite. */
  context: WeekContext | null
  onMarkDone: (workout: Workout) => void
}) {
  const framed = view.cards.length > 1

  if (context) {
    const card = view.cards[0]
    return (
      <>
        <div className={styles.split}>
          <SessionBlock card={card} framed={false} first wide onMarkDone={onMarkDone} />
          <WeekAside context={context} rest={view.rest} />
        </div>
        {/* S4 l. 1658 : la note court sous les deux colonnes, sur toute la largeur du cadre. */}
        {card.why && <ScreenFootnote why={card.why} />}
      </>
    )
  }

  return (
    <>
      {view.totalLabel && (
        <div className={styles.dayTotals}>
          <span>{view.totalLabel}</span>
          {view.brickNote && <span>{view.brickNote}</span>}
        </div>
      )}

      {view.cards.map((card, index) => (
        <SessionBlock
          key={card.workout.id}
          card={card}
          framed={framed}
          first={index === 0}
          onMarkDone={onMarkDone}
        />
      ))}

      <div className={`${styles.body} ${styles.bodyFlush}`}>
        {/* L'artboard 15 ne porte PAS « Reste cette semaine » : la journée à deux séances remplit
            déjà l'écran, et elle finit sur « pourquoi les deux » puis l'export. Seul 02 l'a. */}
        {!framed && <SessionList label="Reste cette semaine" sessions={view.rest.slice(0, REST_LIMIT)} />}

        {framed && view.brickWhy && (
          <section className={styles.whyBlock}>
            <div className={styles.whyHeader}>
              <span className={styles.sectionLabel}>Pourquoi les deux le même jour</span>
              <ProofGauge level={view.brickWhy.level} />
            </div>
            <p className={styles.whyText}>{view.brickWhy.text}</p>
          </section>
        )}

      </div>

      {/* Les deux pieds d'écran sont collés en bas par `margin-top:auto`, comme le canevas les pose
          (02 : `justify-content:space-between` ; 15 : `margin-top:auto`). Ils sortent donc du corps :
          un pied ne flotte pas au milieu de la page quand le contenu est court. */}
      {!framed && view.cards[0].why && <ScreenFootnote why={view.cards[0].why} />}

      {framed && (
        <div className={styles.exportRow}>
          <span className={styles.exportLabel}>Exporter la journée</span>
          <button type="button" className={styles.chipButton} disabled title="Bientôt disponible">
            .ICS
          </button>
          <button type="button" className={styles.chipButton} disabled title="Bientôt disponible">
            .PDF
          </button>
        </div>
      )}
    </>
  )
}

/**
 * Jauge de preuve des artboards 15 et 32 : un rectangle de 22 × 9 px bordé de 2 px, rempli à
 * proportion du niveau, suivi du mot. Ni pilule ni pastille — le canevas dessine une jauge.
 */
const PROOF_FILL: Record<ProofLevel, { percent: number; label: string }> = {
  solid: { percent: 100, label: 'solide' },
  moderate: { percent: 55, label: 'modérée' },
  weak: { percent: 25, label: 'faible' },
}

function ProofGauge({ level }: { level: ProofLevel }) {
  const { percent, label } = PROOF_FILL[level]
  return (
    <span className={styles.proofGauge}>
      <span className={styles.proofTrack} aria-hidden="true">
        <span className={styles.proofFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.proofLabel}>{label}</span>
    </span>
  )
}

/**
 * Note de bas de page de l'artboard 02 : « 1. » puis la phrase, en mono 10 px, la qualification de
 * la preuve reprise en encre à la fin. Ce n'est pas un encart — c'est un appel de note, lié au
 * `<sup>1</sup>` posé sur la ligne chiffrée de la séance.
 */
function ScreenFootnote({ why }: { why: EvidenceNoteData }) {
  return (
    <div className={styles.footnote}>
      <span className={styles.footnoteMark}>1.</span>
      <span className={styles.footnoteText}>
        {why.text}
        {why.sourceRef && ` ${why.sourceRef}`} — <span className={styles.footnoteLevel}>preuve {PROOF_FILL[why.level].label}</span>.
      </span>
    </div>
  )
}

function SessionBlock({
  card,
  framed,
  first,
  wide = false,
  onMarkDone,
}: {
  card: TodaySessionCard
  framed: boolean
  /** Première carte de la pile : sa gouttière haute diffère (artboard 15). */
  first: boolean
  /** Colonne principale de S4 : le déroulé en tableau apparaît, la rangée de fin descend en bas. */
  wide?: boolean
  onMarkDone: (workout: Workout) => void
}) {
  const { workout } = card
  // Encadrée (artboard 15) : couleurs de zone, sans légende. Nue (artboard 02) : profil
  // « Aujourd'hui », coloré par discipline, avec sa légende à trois entrées.
  const bars = framed ? card.bars : buildTodayProfileBars(workout.blocks, workout.discipline)
  const restLabel = framed ? null : repeatRestLabel(workout.blocks)

  const inner = (
    <>
      <div className={styles.badgeRow}>
        <DisciplineTag discipline={workout.discipline} size="md" />
        {workout.zone && <ZoneTag zone={zoneToNumber(workout.zone) as ZoneNumber} size="md" />}
        {framed ? (
          <span className={styles.badgeDuration}>{formatDurationMin(workout.durationMin)}</span>
        ) : (
          card.contextLabel && <span className={styles.badgeContext}>{card.contextLabel}</span>
        )}
      </div>

      <h2 className={framed ? styles.cardTitle : styles.sessionTitle}>{workout.title}</h2>
      <div className={framed ? styles.cardMeta : styles.sessionMeta}>
        {card.meta}
        {!framed && card.why && <sup className={styles.noteRef}>1</sup>}
      </div>

      {bars.length > 1 && (
        <>
          <div className={framed ? styles.timelineDense : styles.timeline} aria-hidden="true">
            {bars.map((bar) => (
              <div
                key={bar.key}
                className={bar.thin ? styles.timelineRest : styles.timelineBar}
                style={{ width: `${bar.widthPercent}%`, height: `${bar.heightPercent}%`, background: bar.colorVar }}
              />
            ))}
          </div>
          {/* Trois entrées, celles de l'artboard 02 — et les pastilles reprennent EXACTEMENT la
              couleur des barres qu'elles nomment, sinon la légende ment. */}
          {!framed && (
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: `var(--color-discipline-${workout.discipline.toLowerCase()})` }}
                />
                effort
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: TODAY_FRAME_COLOR_VAR }} />
                éch. / RAC
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendRest} />
                repos{restLabel && ` · ${restLabel} au mur`}
              </span>
            </div>
          )}
        </>
      )}

      {/* `showSets` du canevas S4 : le déroulé chiffré n'apparaît qu'à partir de la tablette —
          l'artboard 02 ne le montre pas, la largeur mobile n'a pas la place de le lire. */}
      {wide && <BlockTable workout={workout} />}

      <div className={styles.doneRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={false}
            onChange={() => onMarkDone(workout)}
          />
          Marquer comme faite
        </label>
        {(framed || wide) && (
          <button type="button" className={styles.chipButton} disabled title="Bientôt disponible">
            .FIT
          </button>
        )}
      </div>
    </>
  )

  if (wide) return <div className={styles.mainCol}>{inner}</div>
  if (!framed) return <div className={styles.body}>{inner}</div>

  // Artboard 15 : la première carte respire de 14 px sous la ligne des cumuls, les suivantes de 10.
  return (
    <div className={`${styles.cardSlot} ${first ? styles.cardSlotFirst : ''}`}>
      <article className={styles.card}>
        <div className={styles.cardStrip}>
          <span>{card.positionLabel}</span>
          {card.roleLabel && <span>{card.roleLabel}</span>}
        </div>
        <div className={styles.cardInner}>{inner}</div>
      </article>
    </div>
  )
}

// --- S4 · ce que la largeur ajoute ----------------------------------------------------------

/**
 * Déroulé chiffré de la colonne principale (canevas S4 l. 1599-1607) : trois colonnes
 * `Bloc / Cible / Repos`, filets de 1 px, en-têtes mono 9 px en capitales. Un vrai tableau et non
 * une grille de `div` : ce sont des données, elles s'annoncent en lignes et en colonnes.
 *
 * Les lignes viennent de `buildSwimSetRows`, qui sert déjà ce même tableau sur la fiche de séance.
 * Le tiret y signifie « pas de cible enregistrée » — jamais « libre » à la place du domaine.
 */
function BlockTable({ workout }: { workout: Workout }) {
  const rows = buildSwimSetRows(workout)
  if (rows.length === 0) return null

  return (
    <div className={styles.setsTable}>
      <table>
        <thead>
          <tr>
            <th scope="col">Bloc</th>
            <th scope="col">Cible</th>
            <th scope="col">Repos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.block}</td>
              <td>{row.target}</td>
              <td>{row.rest}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Une colonne de l'histogramme : `WeekBar` résout déjà la couleur, la hauteur et l'initiale. */
function toStripDay(bar: WeekBar): WeekStripDay {
  return {
    initial: bar.dayInitial,
    name: DAY_LABELS[weekdayIndex(bar.key)],
    // `percent: 0` est la convention de `WeekStrip` pour un jour libre : colonne en pointillé.
    percent: bar.colorVar === null ? 0 : bar.heightPercent,
    colorVar: bar.colorVar ?? undefined,
    volumeLabel: bar.loadMin > 0 ? formatDurationMin(bar.loadMin) : undefined,
  }
}

/**
 * Colonne de droite de S4 (l. 1616-1655) : l'histogramme des sept jours, ce qui reste de la
 * semaine, et le pied « prochaine référence » collé en bas. Tout vient de `buildWeekContext`,
 * sauf la liste — celle de `TodayView`, la même qu'en mobile, qui exclut les séances déjà faites.
 */
function WeekAside({ context, rest }: { context: WeekContext; rest: UpcomingSession[] }) {
  return (
    <aside className={styles.sideCol} aria-label="Contexte de la semaine">
      <div>
        {/* S4 ne met aucun lien dans cette colonne — mais il faut bien que la semaine reste
            atteignable au-delà de 768 px, où le « voir la semaine → » de l'artboard 02 disparaît.
            C'est l'intitulé lui-même qui y mène : aucun élément ajouté, aucun cul-de-sac. */}
        <Link className={styles.weekLabelLink} to={WEEK_PATH}>
          <span className={styles.weekLabel}>{context.weekLabel}</span>
        </Link>
        <WeekStrip
          className={styles.weekChart}
          days={context.bars.map(toStripDay)}
          height={78}
          emptyOutline="hairline"
          label="Charge de la semaine"
        />
        {context.freeDayNote && <p className={styles.chartNote}>{context.freeDayNote}</p>}
      </div>

      {rest.length > 0 ? (
        <SessionList
          label="Reste cette semaine"
          sessions={rest.slice(0, REST_LIMIT)}
          className={styles.sideList}
          linkToWeek={false}
        />
      ) : (
        <section className={`${styles.listBlock} ${styles.sideList}`}>
          <div className={styles.sectionLabel}>Reste cette semaine</div>
          <p className={styles.chartNote}>plus aucune séance d’ici dimanche</p>
        </section>
      )}

      {context.nextReference && (
        <p className={styles.sideFooter}>
          {context.nextReference.label} · {context.nextReference.value}
          <br />
          {context.nextReference.note}
        </p>
      )}
    </aside>
  )
}

// --- 02a · jour de repos -------------------------------------------------------------------

function RestDayState({ view }: { view: TodayRestDayView }) {
  return (
    <>
      <div className={styles.body}>
      <div className={styles.badgeRow}>
        <DisciplineTag discipline="R" size="md" />
        <span className={styles.badgeContext}>{view.restLabel}</span>
      </div>

      <StackedTitle as="h2" className={styles.sessionTitle} lines={['Rien', 'aujourd’hui']} />
      <p className={styles.prose}>
        Le repos fait partie du plan : c’est lui qui transforme les séances dures de la semaine en progrès.
        Rien à cocher, rien à rattraper.
      </p>

      {view.prepares.length > 0 && (
        <div className={styles.dashedBox}>
          <div className={styles.boxLabel}>Ce que ça prépare</div>
          <div className={styles.boxLines}>
            {view.prepares.map((session, index) => (
              <div key={session.key}>
                {index === 0 ? '' : 'puis '}
                {session.headline}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.hairlineNote}>
        L’app ne propose rien d’elle-même : à toi d’ajouter une séance, en sachant ce qu’elle coûte à demain.
      </div>
      <SecondaryAction shape="block" className={styles.fullButton} disabled title="Bientôt disponible">
        Ajouter une séance légère
      </SecondaryAction>

      <SessionList label="Reste cette semaine" sessions={view.rest.slice(0, REST_LIMIT)} />
      </div>

      <FooterNote>Aucune notification envoyée : un jour vide n’a pas besoin d’être annoncé.</FooterNote>
    </>
  )
}

// --- 02b · séance faite ----------------------------------------------------------------------

function AllDoneState({ view, onUndo }: { view: TodayAllDoneView; onUndo: (workout: Workout) => void }) {
  return (
    <>
      <div className={styles.body}>
      {view.done.map((done) => (
        <section key={done.workout.id} className={styles.doneBlock}>
          <div className={styles.badgeRow}>
            <DisciplineTag discipline={done.workout.discipline} size="md" />
            <span className={styles.doneChip}>
              <CheckIcon />
              Faite
            </span>
            {done.sinceLabel && <span className={styles.badgeSince}>{done.sinceLabel}</span>}
          </div>

          <h2 className={styles.doneTitle}>{done.workout.title}</h2>
          <div className={styles.doneMeta}>{done.meta} réalisé</div>

          <div className={styles.solidBox}>
            <div className={styles.boxLabel}>Ce que la séance a donné</div>
            <div className={styles.statRow}>
              {done.stats.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div className={styles.boxNote}>
              Le tiret veut dire « pas de donnée », pas zéro. Rien n’est estimé à la place de la ceinture.
            </div>
          </div>

          <div className={styles.actionRow}>
            <SecondaryAction shape="block" className={styles.inlineAction} onClick={() => onUndo(done.workout)}>
              Annuler « faite »
            </SecondaryAction>
            <SecondaryAction shape="block" className={styles.inlineAction} disabled title="Bientôt disponible">
              Noter le ressenti
            </SecondaryAction>
          </div>
        </section>
      ))}

      {/* Artboard 02b : « Prochaine échéance », sans le lien « voir la semaine → » — la journée
          est finie, l'écran ne pousse plus nulle part. */}
      <SessionList
        label="Prochaine échéance"
        sessions={view.next.slice(0, NEXT_LIMIT)}
        withSublineOnFirst
        linkToWeek={false}
      />

      </div>

      <FooterNote>
        Ta journée est finie côté app : plus rien ne demande d’action ici avant demain.
      </FooterNote>
    </>
  )
}

// --- 02c · semaine bloquée --------------------------------------------------------------------

function WeekPausedState({
  view,
  onResume,
  onBlockMore,
}: {
  view: TodayWeekPausedView
  onResume: () => void
  onBlockMore: () => void
}) {
  return (
    <>
      <div className={styles.body}>
      <div className={styles.badgeRow}>
        <span className={styles.pauseChip}>
          <PauseIcon />
          Semaine en pause
        </span>
        <span className={styles.badgeSince}>{view.sinceLabel}</span>
      </div>

      <StackedTitle as="h2" className={styles.doneTitleInk} lines={['Le plan', 't’attend']} />
      <p className={styles.prose}>
        {view.reason
          ? 'Tu as bloqué cette semaine. Aucune séance n’est marquée manquée, aucun compteur ne repart à zéro.'
          : 'Tu as bloqué cette semaine — l’app n’a pas demandé pourquoi. Aucune séance n’est marquée manquée, aucun compteur ne repart à zéro.'}
      </p>
      {view.reason && <div className={styles.reason}>« {view.reason} »</div>}

      <div className={styles.yellowBox}>
        <div className={styles.boxLabelInk}>Ce qui se passe à la reprise</div>
        <div className={styles.boxLines}>
          {view.resumeLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>

      {/* Artboard 02c : la reprise est une action d'encre à ombre orange — c'est elle qui écrit. */}
      <div className={styles.ctaColumn}>
        <PrimaryAction tone="ink" className={styles.pausedPrimary} onClick={onResume}>
          Reprendre le plan
        </PrimaryAction>
        <SecondaryAction
          shape="block"
          className={styles.pausedSecondary}
          onClick={onBlockMore}
          disabled={!view.canBlockMore}
          title={view.canBlockMore ? undefined : 'Le plan ne compte pas de semaine suivante à bloquer'}
        >
          Bloquer une semaine de plus
        </SecondaryAction>
      </div>

      <div className={styles.waitingBlock}>
        <div className={styles.sectionLabel}>Ce qui était prévu · en attente</div>
        {view.firstWaiting ? (
          <>
            <div className={`${styles.listRow} ${styles.listRowWaiting}`}>
              <DisciplineTag discipline={view.firstWaiting.discipline} size="md" />
              <span className={styles.listTitleStruck}>{view.firstWaiting.title}</span>
              <span className={styles.listDay}>{view.firstWaiting.dayLabel}</span>
            </div>
            {view.otherWaitingCount > 0 && (
              <div className={styles.waitingCount}>
                + {view.otherWaitingCount} autre{view.otherWaitingCount > 1 ? 's' : ''} séance
                {view.otherWaitingCount > 1 ? 's' : ''} en attente
              </div>
            )}
          </>
        ) : (
          <div className={styles.waitingCount}>Aucune séance en attente sur cette semaine.</div>
        )}
      </div>

      </div>

      <FooterNote>Barré ne veut pas dire raté : hors du temps que tu t’es donné.</FooterNote>
    </>
  )
}

// --- Icônes ------------------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}
