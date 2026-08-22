import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { PlanSegment } from '../../components/navigation/PlanSegment/PlanSegment'
import { WeekNavigator } from './WeekNavigator'
import { DisciplineTag, ZoneTag, type TagTone, type ZoneNumber } from '../../components/ui/Badge/Badge'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { WeekStrip, type WeekStripDay } from '../../components/ui/WeekStrip/WeekStrip'
import { usePublishRailBlock } from '../../context/RailBlockContext'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { PlanWeek, Race, TrainingPlan, Workout } from '../../domain/types'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { demoWorkouts } from '../../domain/demoData'
import { selectOpeningState } from '../../domain/openingState'
import {
  TRIATHLON_DISCIPLINES,
  buildWeekDays,
  computeDisciplineShares,
  computeWeekListCounts,
  computeWeekTotals,
  findCurrentWeek,
  todayIso,
  weekdayIndex,
  workoutSubDetail,
  type DisciplineShare,
  type WeekDay,
  type WeekListCounts,
} from '../../domain/planWeek'
import { DAY_LABELS, computeWeekBars, type WeekBar } from '../../domain/weekContext'
import { buildWeekNav } from '../../domain/weekNav'
import { formatDurationCompact, formatDurationMin, zoneToNumber } from '../../domain/workoutFormat'
import { workoutPath } from '../../navigation'
import { EXPORTS_PRINT_PATH, exportSheetPath } from '../exports/exportsRoutes'
import styles from './SemaineScreen.module.css'
import { planSettingPath } from '../planSettings/planSettingsRoutes'

/**
 * Catalogue de résolution des identifiants du plan : la bibliothèque d'abord, les séances de
 * démonstration ensuite (les deux espaces d'identifiants sont disjoints, cf. `demoData` vs
 * `seedWorkouts`). Un identifiant introuvable reste visible dans la liste, jamais effacé.
 */
const WORKOUT_CATALOGUE: Workout[] = [...SEED_WORKOUTS, ...demoWorkouts]

export interface SemaineScreenProps {
  plan: TrainingPlan
  /**
   * Séances contre lesquelles résoudre les identifiants du plan. Un plan généré référence ses
   * propres séances, enregistrées en base : `PlanRoute` les injecte ici. Par défaut, seul le
   * catalogue statique est consulté — ce qui suffit à la semaine de démonstration.
   */
  catalogue?: Workout[]
  /**
   * Courses connues. Elles ne servent qu'au bloc du rail desktop (S6 l. 1794 : « J-77 · 70.3
   * Vichy ») ; sans elles le bloc garde son intitulé et sa barre, et perd sa ligne de décompte.
   */
  races?: Race[]
  /** Injecté par les tests ; par défaut le jour courant du navigateur. */
  today?: string
  /**
   * Semaine à afficher. Absente, c'est celle d'aujourd'hui — le comportement d'origine. Le Mois
   * (04m) ouvre une semaine passée par ce biais : sans elle, « appui sur une ligne de semaine →
   * la semaine » ramènerait toujours à la semaine en cours, quelle que soit la ligne touchée.
   */
  weekNumber?: number
  /** Vrai quand la semaine affichée vient du jeu de démonstration et non d'un plan enregistré. */
  isDemo?: boolean
}

/**
 * Écran Semaine — TROIS artboards, DEUX dispositions.
 *
 * - Mobile, artboard **03** (l. 414-486) : titre « SEMAINE 07 » 38 px, frise de répartition,
 *   volume par discipline, histogramme de sept barres, une ligne par jour avec la journée courante
 *   en aplat lime, pied « 81 % facile / 19 % dur » et exports `.ICS` / `.PDF`.
 * - Mobile, artboard **16** (l. 2459-2551) : le MÊME écran quand un jour porte deux séances. Le
 *   canevas y change trois choses, et rien d'autre : la ligne de volumes cède la place au décompte
 *   « 10 séances · 6 jours / 3 jours doublés », l'histogramme disparaît (la liste, plus haute,
 *   prend sa place), et le jour doublé n'écrit son nom qu'une fois — un filet de 2 px relie ses
 *   séances. La bascule est donc une propriété des données, pas un réglage : `doubledDayCount > 0`.
 * - Desktop, artboard **S6** (l. 1778-1956) : sept colonnes égales, une par jour.
 *
 * Le DOM diffère réellement d'un artboard à l'autre (ce ne sont pas les mêmes éléments, pas
 * seulement les mêmes éléments autrement disposés) : la bascule mobile / desktop se fait donc en
 * `useBreakpoint()`, pas en media query.
 *
 * Les totaux (titre, frise, pieds de colonne, légende) sont dérivés des séances réellement
 * résolues, pas de `PlanWeek.volumeByDiscipline` : un seul chiffre pour l'écran.
 *
 * LIMITATION : le glisser-déposer entre jours (artboard 34) n'est PAS branché. La poignée `≡` de
 * chaque carte S6 et la mention du pied de page sont rendues — elles sont dans le canevas — mais
 * inertes, et le disent au survol. Un déplacement doit montrer la charge avant / après, se faire
 * confirmer, puis laisser 6 s pour être annulé : à moitié, il écrirait dans le dos de l'utilisateur.
 */
export function SemaineScreen({
  plan,
  catalogue = WORKOUT_CATALOGUE,
  races = [],
  today,
  weekNumber: requestedWeek,
  isDemo = false,
}: SemaineScreenProps) {
  const navigate = useNavigate()
  const [, setSearch] = useSearchParams()
  const isDesktop = useBreakpoint() === 'desktop'
  const reference = today ?? todayIso()
  // Un rang demandé qui ne correspond à aucune semaine retombe sur la semaine courante : on
  // n'affiche jamais un écran vide pour une URL bricolée.
  const week =
    (requestedWeek !== undefined
      ? plan.weeks.find((candidate) => candidate.weekNumber === requestedWeek)
      : undefined) ?? findCurrentWeek(plan, reference)

  const days = useMemo(
    () => (week ? buildWeekDays(week, catalogue, reference) : []),
    [week, catalogue, reference],
  )
  const totals = useMemo(() => computeWeekTotals(days), [days])
  const counts = useMemo(() => computeWeekListCounts(days), [days])
  // Frise et légende : les trois disciplines du triathlon (cf. `TRIATHLON_DISCIPLINES`).
  const shares = useMemo(() => computeDisciplineShares(days, TRIATHLON_DISCIPLINES), [days])

  /**
   * Bloc contextuel du rail (S6 l. 1791-1795) : intitulé de semaine, avancement du plan, puis
   * « J-77 · 70.3 Vichy ». Les trois viennent de `selectOpeningState`, seule autorité du domaine
   * sur ces libellés — l'écran ne calcule ni pourcentage ni décompte.
   *
   * Le rang de la semaine est aussi le dernier segment du fil (« Plan / Semaine 07 ») : c'est lui
   * qui nomme la page, ici comme dans l'onglet du navigateur.
   */
  const railCard = useMemo(
    () => selectOpeningState({ plans: [plan], races, workouts: catalogue, today: reference }).activePlan,
    [plan, races, catalogue, reference],
  )
  const railTitle =
    railCard?.weekLabel ??
    (week ? `Semaine ${String(week.weekNumber).padStart(2, '0')} / ${plan.weeksCount}` : 'Semaine')
  const railLines = railCard?.countdownLabel ? [`${railCard.countdownLabel} · ${railCard.title}`] : []
  // L'encart jaune du rail n'existe que sur S6 : c'est le seul écran où l'on déplace une séance,
  // et il annonce la règle avant le geste (canevas S6 l. 1796).
  usePublishRailBlock(
    railTitle,
    railLines,
    railCard?.progressPercent,
    'Rien n’est écrit sans que tu le voies : un déplacement montre d’abord ce que la semaine devient.',
  )

  if (!week) {
    return (
      <div className={styles.screen}>
        <AppHeader variant="detail" trail={['Plan', 'Semaine']} onBack={() => navigate('/plan')} />
        <div className={styles.footerBar}>Ce plan ne contient aucune semaine.</div>
      </div>
    )
  }

  const weekNumber = String(week.weekNumber).padStart(2, '0')
  // Le volume passé à la barre est celui des séances RÉSOLUES, pas `week.totalVolumeMin` : la
  // barre annoncerait sinon un volume que la liste des jours en dessous ne montre pas.
  const weekNav = buildWeekNav({ plan, week, today: reference, plannedMin: totals.totalMin })

  return (
    <div className={styles.screen}>
      {/* Artboard 03 l. 415-421 (mobile) et S6 l. 1803-1810 (desktop) : UN seul bandeau. */}
      <AppHeader
        variant="detail"
        trail={['Plan', `Semaine ${weekNumber}`]}
        onBack={() => navigate('/plan')}
        desktopActions={
          isDesktop ? (
            <>
              <span className={styles.headerStats}>
                {formatDurationCompact(totals.totalMin)} prévues · {totals.remainingCount} restantes
              </span>
              {/* La commande était éteinte au motif que « l'écran qui montre ce que le plan
                  devient n'existe qu'au niveau du jour ». Il existe : c'est le réglage
                  « Semaines réduites », qui montre l'avant / après semaine par semaine avant
                  d'écrire (artboard 38). On y mène plutôt que de s'éteindre. */}
              <Link className={styles.headerButton} to={planSettingPath('reduced_weeks')}>
                Alléger des semaines
              </Link>
              <Link className={styles.headerButton} to={exportSheetPath({ week: week.weekNumber })}>
                .ICS
              </Link>
            </>
          ) : undefined
        }
      />

      {/* Segment des quatre niveaux de zoom (artboard 03) — la semaine n'est plus le seul chemin
          vers la vue macro, et le mois cesse d'être invisible. */}
      <PlanSegment current="semaine" />

      {/* 03 l. 415-435 : flèches ← →, état de la semaine, rail des dix-huit. Sans elle, la Semaine
          ne montrait que la semaine en cours et rien ne permettait d'en sortir. */}
      <WeekNavigator view={weekNav} onSelect={(number) => setSearch({ semaine: String(number) })} />

      {isDesktop ? (
        <DesktopWeek days={days} shares={shares} isDemo={isDemo} />
      ) : (
        <MobileWeek
          week={week}
          days={days}
          shares={shares}
          counts={counts}
          isDemo={isDemo}
          onOpenWorkout={(id) => navigate(`/workouts/${id}`, { state: { from: 'Semaine' } })}
        />
      )}
    </div>
  )
}

/**
 * Répartition d'intensité du pied de page. La part modérée — ce que le plan ne range ni en facile
 * ni en dur — n'est écrite que si elle existe : sur une semaine où les deux parts se complètent,
 * l'écran retrouve mot pour mot la formule du canevas.
 */
function intensityLabel(week: PlanWeek): string {
  const moderate = 100 - week.easyPercent - week.hardPercent
  const parts = [`${week.easyPercent} % facile`]
  if (moderate > 0) parts.push(`${moderate} % modéré`)
  parts.push(`${week.hardPercent} % dur`)
  return parts.join(' / ')
}

/* --- Frise de répartition (03 l. 426 · 16 l. 2471 · S6 l. 1811) ----------------------------- */

function proportionLabel(shares: DisciplineShare[]): string {
  if (shares.length === 0) return 'Aucune séance cette semaine'
  return shares.map((share) => `${share.label} ${Math.round(share.percent)} %`).join(', ')
}

function proportionSegments(shares: DisciplineShare[]): ProgressSegment[] {
  return shares.map((share) => ({
    key: share.discipline,
    percent: share.percent,
    color: `var(--color-discipline-${share.discipline.toLowerCase()})`,
    label: share.label,
  }))
}

/* --- Artboards 03 et 16 · mobile ------------------------------------------------------------ */

interface MobileWeekProps {
  week: PlanWeek
  days: WeekDay[]
  shares: DisciplineShare[]
  counts: WeekListCounts
  isDemo: boolean
  onOpenWorkout: (id: string) => void
}

function MobileWeek({ week, days, shares, counts, isDemo, onOpenWorkout }: MobileWeekProps) {
  // Artboard 16 dès qu'un jour porte plus d'une séance ; artboard 03 sinon.
  const dense = counts.doubledDayCount > 0
  const bars = useMemo(() => computeWeekBars(days), [days])

  return (
    <>
      {/* Le titre « Semaine 07 » et son volume vivent désormais dans `WeekNavigator`, entre les
          deux flèches (artboard 03 l. 424-428). Il n'y en a qu'un par écran. */}

      {/* `framed` : 14 px de couleur entre deux filets de 2 px, soit 18 px occupés — le canevas
          écrit cette frise en `content-box` (03 l. 426, 16 l. 2471). */}
      <ProgressBar
        className={styles.proportion}
        segments={proportionSegments(shares)}
        height={14}
        framed
        label={proportionLabel(shares)}
      />

      {/* 03 l. 427-429 : volume par discipline, sous la frise qui le découpe. */}
      <div className={styles.shares}>
        {shares.map((share) => (
          <span key={share.discipline}>
            {share.discipline} {formatDurationCompact(share.totalMin)}
          </span>
        ))}
      </div>

      {/* 16 l. 2472-2474 : le décompte des jours doublés. Le canevas le met À LA PLACE de
          l'histogramme parce que son artboard est de hauteur fixe et que la liste, plus haute,
          n'y laissait pas la place. L'application défile : les deux tiennent, et retirer la
          partie graphique dès qu'un jour porte deux séances privait la semaine de sa lecture
          d'ensemble — c'est précisément ce qu'on vient chercher ici. */}
      {dense && (
        <div className={styles.counts}>
          <span>
            {plural(counts.sessionCount, 'séance')} · {plural(counts.activeDayCount, 'jour')}
          </span>
          <span>{plural(counts.doubledDayCount, 'jour')} doublé{counts.doubledDayCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* 03 l. 430-443 : sept barres de 84 px, une par jour, puis l'initiale du jour. */}
      <div className={styles.histogram}>
        <WeekStrip days={bars.map(toStripDay)} height={84} label="Charge de la semaine" />
      </div>

      {/* 03 l. 444-482 · 16 l. 2475-2545 : la liste des jours, filet de tête compris. */}
      <div className={cls(styles.dayList, dense && styles.dayListDense)}>
        {days.map((day) => (
          <DayEntry key={day.date} day={day} dense={dense} onOpenWorkout={onOpenWorkout} />
        ))}
      </div>

      {/* 03 l. 483-485 · 16 l. 2546-2550 */}
      <div className={cls(styles.footerBar, dense && styles.footerBarDense)}>
        {/* Le canevas écrit « 81 % facile / 19 % dur », deux parts complémentaires. Le moteur en
            produit TROIS — facile (Z1-Z2), modéré (Z3), dur (Z4+) — et n'en afficher que deux
            donnait « 71 % facile / 15 % dur », qui se lit comme une erreur de calcul. La part
            modérée est donc nommée quand elle existe. */}
        <span className={styles.intensitySplit}>{intensityLabel(week)}</span>
        {/* Hors canevas, et assumé : le produit ne présente jamais une semaine de démonstration
            comme un plan réel (règle de l'artboard 01b). La mention part dès qu'un plan existe. */}
        {isDemo && (
          <span className={styles.demoMark} title="Semaine de démonstration : aucun plan enregistré sur cet appareil">
            démonstration
          </span>
        )}
        <span className={styles.exports}>
          <Link className={styles.exportButton} to={exportSheetPath({ week: week.weekNumber })}>
            .ICS
          </Link>
          <Link className={styles.exportButton} to={EXPORTS_PRINT_PATH}>
            .PDF
          </Link>
        </span>
      </div>
    </>
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

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`
}

function cls(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}

/** Une séance résolue, ou l'identifiant d'une séance que le catalogue ne connaît pas. */
type DayEntryItem = { workout: Workout } | { missingId: string }

function dayEntries(day: WeekDay): DayEntryItem[] {
  return [
    ...day.workouts.map((workout) => ({ workout })),
    ...day.missingWorkoutIds.map((missingId) => ({ missingId })),
  ]
}

/**
 * Un jour de la liste mobile. Trois formes, toutes dans le canevas :
 * — aucune séance → le jour est nommé « Repos » (16 l. 2513-2515) ;
 * — une séance → une ligne (03 l. 445-450) ;
 * — deux séances ou plus → le nom du jour écrit UNE fois, et un filet de 2 px qui relie les
 *   séances entre elles (16 l. 2482-2496, l'intention même de l'artboard).
 */
function DayEntry({
  day,
  dense,
  onOpenWorkout,
}: {
  day: WeekDay
  dense: boolean
  onOpenWorkout: (id: string) => void
}) {
  const entries = dayEntries(day)

  if (entries.length === 0) {
    return (
      <div className={cls(styles.row, dense && styles.rowDense, day.isToday && styles.rowToday)}>
        <span className={styles.dayName}>{day.label}</span>
        <span className={styles.restMark}>Repos</span>
        {day.isToday && <span className={styles.todayMark}>AUJ.</span>}
      </div>
    )
  }

  if (entries.length === 1) {
    return (
      <EntryRow
        entry={entries[0]}
        className={cls(styles.row, dense && styles.rowDense, day.isToday && styles.rowToday)}
        dayName={day.label}
        isToday={day.isToday}
        showStatus
        onOpenWorkout={onOpenWorkout}
      />
    )
  }

  return (
    <div className={cls(styles.group, day.isToday && styles.groupToday)}>
      <span className={cls(styles.dayName, styles.groupName)}>{day.label}</span>
      <div className={styles.groupBody}>
        {entries.map((entry, index) => (
          <EntryRow
            key={entryKey(entry, index)}
            entry={entry}
            className={styles.subRow}
            position={`${index + 1}/${entries.length}`}
            isToday={day.isToday}
            onOpenWorkout={onOpenWorkout}
          />
        ))}
      </div>
    </div>
  )
}

function entryKey(entry: DayEntryItem, index: number): string {
  return 'workout' in entry ? `${entry.workout.id}-${index}` : entry.missingId
}

/**
 * Une ligne de séance, seule dans son jour ou empilée sous le filet d'un jour doublé.
 * Le canevas ouvre la séance depuis la semaine (légende de l'artboard 05 : « depuis Aujourd'hui ou
 * Semaine → appui sur une séance ») : c'est un bouton, sauf quand l'identifiant est introuvable —
 * il n'y a alors rien à ouvrir.
 */
function EntryRow({
  entry,
  className,
  dayName,
  position,
  isToday,
  showStatus = false,
  onOpenWorkout,
}: {
  entry: DayEntryItem
  className: string
  /** Écrit sur la ligne seule ; le jour doublé porte son nom sur le groupe, pas sur ses lignes. */
  dayName?: string
  /** `1/2`, `2/2` — repère des jours doublés (16 l. 2485). */
  position?: string
  isToday: boolean
  /** `✓` de la séance faite / `AUJ.` du jour courant : le canevas ne les met que sur la ligne seule. */
  showStatus?: boolean
  onOpenWorkout: (id: string) => void
}) {
  const marker = (
    <>
      {dayName !== undefined && <span className={styles.dayName}>{dayName}</span>}
      {position !== undefined && <span className={styles.position}>{position}</span>}
    </>
  )

  if ('missingId' in entry) {
    return (
      <div className={cls(className, styles.rowMissing)}>
        {marker}
        <span className={styles.rowBody}>
          <span className={styles.rowTitle}>séance introuvable</span>
          <span className={styles.rowMeta}>{entry.missingId}</span>
        </span>
      </div>
    )
  }

  const { workout } = entry
  const tone: TagTone = isToday ? 'ink' : workout.discipline === 'R' ? 'outline' : 'fill'

  return (
    <Link
      className={className}
      to={workoutPath(workout.id)}
      state={{ from: 'Semaine' }}
      onClick={() => onOpenWorkout(workout.id)}
    >
      {marker}
      <DisciplineTag discipline={workout.discipline} size="sm" tone={tone} />
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{workout.title}</span>
        <span className={styles.rowMeta}>{rowMeta(workout)}</span>
      </span>
      {showStatus &&
        (isToday ? (
          <span className={styles.todayMark}>AUJ.</span>
        ) : (
          workout.status === 'completed' && <span className={styles.doneMark}>✓</span>
        ))}
    </Link>
  )
}

/**
 * Sous-titre d'une ligne de jour : durée puis zone (03 l. 448 « 45 min · Z2 », 16 l. 2487
 * « 06:30 · 55 min · Z4 »). L'heure de début du canevas n'est pas rendue : `Workout` ne porte
 * aucune heure, et on n'en invente pas une.
 */
function rowMeta(workout: Workout): string {
  const parts = [formatDurationMin(workout.durationMin)]
  if (workout.zone) parts.push(workout.zone)
  else {
    const detail = workoutSubDetail(workout)
    if (detail) parts.push(detail)
  }
  return parts.join(' · ')
}

/* --- Artboard S6 · desktop ------------------------------------------------------------------ */

function DesktopWeek({
  days,
  shares,
  isDemo,
}: {
  days: WeekDay[]
  shares: DisciplineShare[]
  isDemo: boolean
}) {
  return (
    <>
      {/* S6 l. 1811 : la frise ne porte QUE son filet bas — le bandeau lui tient lieu de filet haut. */}
      <ProgressBar
        className={styles.proportion}
        segments={proportionSegments(shares)}
        height={14}
        underlined
        label={proportionLabel(shares)}
      />

      <div className={styles.grid}>
        {days.map((day) => (
          <DayColumn key={day.date} day={day} />
        ))}
      </div>

      <div className={styles.legend}>
        {shares.map((share) => (
          <span key={share.discipline} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: `var(--color-discipline-${share.discipline.toLowerCase()})` }}
            />
            {share.label.toLowerCase()} {formatDurationCompact(share.totalMin)}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.legendDashed} />
          pointillé · jour libre
        </span>
        {isDemo && <span className={styles.legendItem}>semaine de démonstration</span>}
        <span className={styles.legendHint}>glisser par ≡ pour déplacer</span>
      </div>
    </>
  )
}

function DayColumn({ day }: { day: WeekDay }) {
  return (
    <section
      className={styles.column}
      aria-label={day.isToday ? `${day.label} ${day.dayNumber} · aujourd’hui` : `${day.label} ${day.dayNumber}`}
      aria-current={day.isToday ? 'date' : undefined}
    >
      <div className={cls(styles.columnHeader, day.isToday && styles.columnHeaderToday)}>
        <span className={styles.columnDay}>{day.label}</span>
        <span className={styles.columnDate}>{day.dayNumber}</span>
      </div>

      <div className={styles.columnBody}>
        {day.workouts.map((workout, index) => (
          <SessionCard key={`${workout.id}-${index}`} workout={workout} />
        ))}
        {day.missingWorkoutIds.map((id) => (
          <div key={id} className={styles.cardMissing}>
            séance introuvable
            <br />
            {id}
          </div>
        ))}
        {day.isFree && (
          <div className={styles.freeDay}>
            jour libre
            <br />
            déposer une séance ici
          </div>
        )}
      </div>

      <div className={styles.columnFooter}>
        {day.totalMin > 0 ? formatDurationCompact(day.totalMin) : '—'}
      </div>
    </section>
  )
}

/**
 * Une carte de la grille des sept colonnes. Elle était un `<article>` inerte : la Semaine large,
 * qui est le meilleur écran du produit et l'argument même de la règle nº 3, ne laissait ouvrir
 * aucune séance — alors que le mobile, lui, l'a toujours permis. Le lien enveloppe la carte : le
 * rendu ne change pas d'un pixel, et l'adresse se copie, s'ouvre dans un onglet et s'annonce.
 */
function SessionCard({ workout }: { workout: Workout }) {
  const detail = workoutSubDetail(workout)

  return (
    <Link className={styles.cardLink} to={workoutPath(workout.id)} state={{ from: 'Semaine' }}>
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <DisciplineTag discipline={workout.discipline} size="sm" />
        {workout.zone && <ZoneTag zone={zoneToNumber(workout.zone) as ZoneNumber} size="sm" />}
        <span className={styles.cardDuration}>{formatDurationCompact(workout.durationMin)}</span>
      </div>
      <div className={styles.cardTitle}>{workout.title}</div>
      {detail && <div className={styles.cardDetail}>{detail}</div>}
      {/* La poignée du canevas (S6 l. 1825). Elle est dessinée, donc elle est rendue — mais le
          déplacement n'est pas branché, et le survol le dit plutôt que de laisser un geste mort. */}
      <div className={styles.cardHandle} title="Le déplacement d’une séance n’est pas encore branché">
        ≡
      </div>
    </article>
    </Link>
  )
}
