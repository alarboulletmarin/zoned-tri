import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { PlanSegment } from '../../components/navigation/PlanSegment/PlanSegment'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { buildPlanMonthView, type MonthDay, type MonthWeekRow } from '../../domain/planMonth'
import { todayIso } from '../../domain/planWeek'
import { DISCIPLINE_LABELS } from '../../domain/workoutFormat'
import { PLAN_PATH, WEEK_PATH } from '../../navigation'
import type { Race, TrainingPlan, Workout } from '../../domain/types'
import styles from './PlanMonthScreen.module.css'

const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export interface PlanMonthScreenProps {
  plan: TrainingPlan
  catalogue: Workout[]
  races?: Race[]
  /** Jour courant — injecté par les tests et l'atelier d'aperçu. */
  today?: string
  /** Mois affiché (n'importe quel jour de ce mois). Par défaut celui d'aujourd'hui. */
  anchor?: string
  onNavigateMonth: (firstDayOfMonth: string) => void
}

/**
 * Écran 04m · Plan / Mois — le niveau que le canevas a ajouté entre la semaine et la saison.
 *
 * Il montre, il n'arbitre pas : la note du bas de l'artboard est explicite, « le mois ne se
 * modifie pas ici ». Deux gestes seulement, et l'artboard les nomme lui-même — appui sur un jour
 * pour ouvrir la journée, appui sur une ligne de semaine pour ouvrir la semaine.
 *
 * Tout est dérivé par `domain/planMonth.ts` : cet écran ne compte ni les heures, ni les séances,
 * ni les semaines. Il place.
 */
export function PlanMonthScreen({
  plan,
  catalogue,
  races,
  today,
  anchor,
  onNavigateMonth,
}: PlanMonthScreenProps) {
  const navigate = useNavigate()
  const reference = today ?? todayIso()

  const view = useMemo(
    () =>
      buildPlanMonthView({
        plan,
        catalogue,
        today: reference,
        ...(anchor ? { anchor } : {}),
        ...(races ? { races } : {}),
      }),
    [plan, catalogue, reference, anchor, races],
  )

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Plan', 'Mois']}
        onBack={() => navigate(PLAN_PATH)}
      />
      <PlanSegment current="mois" />

      {/* 04m : flèche, bloc central sur trois lignes, flèche. Un mois hors du plan n'a pas de
          flèche vers lui — le canevas n'ouvre pas de mois vide. */}
      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.navArrow}
          onClick={() => view.previousMonth && onNavigateMonth(view.previousMonth)}
          disabled={!view.previousMonth}
          aria-label="Mois précédent"
        >
          ←
        </button>
        <div className={styles.monthHeading}>
          <div className={styles.spanLabel}>{view.spanLabel}</div>
          <h1 className={styles.monthTitle}>{view.monthLabel}</h1>
          <div className={styles.totals}>{view.totalsLabel}</div>
        </div>
        <button
          type="button"
          className={styles.navArrow}
          onClick={() => view.nextMonth && onNavigateMonth(view.nextMonth)}
          disabled={!view.nextMonth}
          aria-label="Mois suivant"
        >
          →
        </button>
      </div>

      {/* 04m : frise de 14 px entre deux filets de 2 px — la même qu'en tête de la Semaine. */}
      {view.shares.length > 0 && (
        <ProgressBar
          className={styles.proportion}
          segments={view.shares.map((share) => ({
            key: share.discipline,
            percent: share.percent,
            color: `var(--color-discipline-${share.discipline.toLowerCase()})`,
          }))}
          height={14}
          framed
          label={view.shares
            .map((share) => `${DISCIPLINE_LABELS[share.discipline]} ${Math.round(share.percent)} %`)
            .join(', ')}
        />
      )}

      {/* Une seule et même suite de blocs, en colonne sur mobile, en deux colonnes au-delà de
          1024 px (cf. la feuille de style) : le calendrier prend la largeur, la charge par semaine
          tient la colonne de droite. Aucun bloc n'apparaît ni ne disparaît avec la largeur. */}
      <div className={styles.split}>
        <div className={styles.calendarCol}>
          <div className={styles.grid} role="grid" aria-label={`Calendrier de ${view.monthLabel}`}>
            <div className={styles.gridHead} role="row">
              {WEEKDAY_INITIALS.map((initial, index) => (
                <span key={`${initial}-${index}`} className={styles.gridHeadCell} role="columnheader">
                  {initial}
                </span>
              ))}
            </div>
            <div className={styles.gridBody}>
              {/* « Appui sur un jour → la journée ». L'écran Jour ne montre qu'aujourd'hui : un
                  autre jour s'ouvre donc dans sa semaine, au plus près de ce que le canevas
                  demande sans inventer un écran « journée du 12 août » qu'aucun artboard ne dessine. */}
              {view.days.map((day) => (
                <MonthCell
                  key={day.date}
                  day={day}
                  onOpen={() =>
                    navigate(day.weekNumber !== undefined ? `${WEEK_PATH}?semaine=${day.weekNumber}` : WEEK_PATH)
                  }
                />
              ))}
            </div>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendToday}>aujourd’hui</span>
            <span className={styles.legendDash}>— jour sans séance</span>
          </div>
          <p className={styles.raceNote}>{view.raceNote}</p>
        </div>

        <section className={styles.weeks}>
          <div className={styles.weeksLabel}>Charge par semaine · appui pour ouvrir</div>
          {view.weeks.map((week) => (
            <WeekRow
              key={week.weekNumber}
              week={week}
              onOpen={() => navigate(`${WEEK_PATH}?semaine=${week.weekNumber}`)}
            />
          ))}
        </section>
      </div>

      <p className={styles.footnote}>
        Appui sur un jour → la journée. Appui sur une ligne de semaine → la semaine. Le mois ne se
        modifie pas ici : il montre, il n’arbitre pas.
      </p>
    </div>
  )
}

function MonthCell({ day, onOpen }: { day: MonthDay; onOpen: () => void }) {
  const classes = [
    styles.cell,
    day.outsideMonth ? styles.cellOutside : '',
    day.isToday ? styles.cellToday : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Un jour hors du plan n'ouvre rien : la semaine qui le contiendrait n'existe pas.
  if (day.outsidePlan) {
    return (
      <span className={`${classes} ${styles.cellInert}`} role="gridcell">
        <span className={styles.cellNumber}>{day.dayOfMonth}</span>
        <span className={styles.cellMark} aria-hidden="true" />
      </span>
    )
  }

  const label =
    day.disciplines.length > 0
      ? `${day.dayOfMonth} · ${day.disciplines.join(' puis ')}`
      : `${day.dayOfMonth} · jour sans séance`

  return (
    <button type="button" className={classes} onClick={onOpen} role="gridcell" aria-label={label}>
      <span className={styles.cellNumber}>{day.dayOfMonth}</span>
      {/* Une pastille et une initiale PAR SÉANCE : un jour doublé montre ses deux entraînements
          — « C C » pour deux courses, « C V » pour une course puis un vélo. La couleur ne dit que
          la discipline. */}
      {day.disciplines.length > 0 ? (
        <span className={styles.cellMarks}>
          {day.disciplines.map((discipline, index) => (
            <span key={`${discipline}-${index}`} className={styles.cellMark}>
              <span
                className={styles.cellSwatch}
                style={{ background: `var(--color-discipline-${discipline.toLowerCase()})` }}
              />
              {discipline}
            </span>
          ))}
        </span>
      ) : (
        <span className={`${styles.cellMark} ${styles.cellMarkEmpty}`}>—</span>
      )}
    </button>
  )
}

function WeekRow({ week, onOpen }: { week: MonthWeekRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.weekRow} ${week.isCurrent ? styles.weekRowCurrent : ''}`}
      onClick={onOpen}
    >
      <span className={styles.weekLabel}>{week.label}</span>
      <span className={styles.weekBody}>
        <span className={styles.weekVolume}>{week.volumeLabel}</span>
        <span className={styles.weekRange}>
          {week.rangeLabel} · {week.statusLabel}
        </span>
      </span>
      {/* Jauge de 58 px : la semaine rapportée à la plus chargée du mois, encre pour la semaine
          en cours, gris pour les autres — la couleur ne dit ici que « c'est celle-ci ». */}
      <span className={styles.weekGauge} aria-hidden="true">
        <span className={styles.weekGaugeFill} style={{ width: `${week.volumePercent}%` }} />
      </span>
      <span className={styles.weekArrow} aria-hidden="true">
        →
      </span>
    </button>
  )
}
