import { Link } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { Card } from '../../components/ui/Card/Card'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { formatDayMonthLong } from '../../domain/planGenerator/dates'
import {
  disciplineShares,
  formatFullTime,
  preparationNote,
  preparednessLabel,
  raceCountdown,
  raceResultLabel,
  racesOverview,
} from '../../domain/raceView'
import type { Race } from '../../domain/types'
import { racePath } from './routes'
import s from './RaceScreens.module.css'
import own from './RacesListScreen.module.css'

/** Position du plan lié à l'objectif — « plan : semaine 07 / 18 » sur la carte de l'artboard 27. */
export interface PlanPosition {
  weekNumber: number
  weeksCount: number
}

export interface RacesListScreenProps {
  races: Race[]
  today: string
  /** Absente quand aucun plan actif ne vise l'objectif : la carte se passe alors de sa barre. */
  planPosition?: PlanPosition
}

/** « 12 JUIL » — la colonne de gauche des lignes de l'artboard 27, en capitales mono. */
const SHORT_MONTHS = [
  'JANV',
  'FÉVR',
  'MARS',
  'AVR',
  'MAI',
  'JUIN',
  'JUIL',
  'AOÛT',
  'SEPT',
  'OCT',
  'NOV',
  'DÉC',
]

function shortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return `${String(date.getUTCDate()).padStart(2, '0')} ${SHORT_MONTHS[date.getUTCMonth()]}`
}

/**
 * Artboard 27 · Courses · mes courses — la racine de la section dès qu'il y a plus d'une course :
 * l'objectif principal en carte, les préparations en liste, les passées en dessous.
 *
 * LIMITATION assumée : « Ajouter une course » est rendu inerte, aucun formulaire de création
 * n'existe encore dans le produit.
 */
export function RacesListScreen({ races, today, planPosition }: RacesListScreenProps) {
  const overview = racesOverview(races, today)
  const goal = overview.goal
  const shares = goal ? disciplineShares(goal) : []

  return (
    <div className={s.screen}>
      <AppHeader variant="root" label="Courses" desktopTitle="Courses" />

      <div className={s.column}>
        <div className={`${s.hero} ${s.heroDense}`}>
          <h1 className={s.title38}>
            Mes
            <br />
            courses
          </h1>
          <span className={`${s.heroAside} ${s.heroAsideSm}`}>{overview.countLabel}</span>
        </div>

        {shares.length > 0 && (
          <ProgressBar
            className={s.strip}
            segments={shares}
            height={14}
            framed
            label="Répartition du temps cible de l’objectif principal"
          />
        )}

        <section className={s.block}>
          <div className={s.sectionLabel}>Objectif principal</div>
          {goal ? (
            <Link className={own.goalLink} to={racePath(goal.id)}>
            <Card tone="featured" className={own.goalCard}>
              <div className={own.goalTop}>
                <span className={own.goalDate}>
                  {formatDayMonthLong(goal.date)} · {goal.format}
                </span>
                <span className={own.goalCountdown}>{raceCountdown(goal, today).label}</span>
              </div>
              <div className={own.goalTitle}>{goal.name}</div>
              <div className={own.goalMeta}>
                {[
                  goal.pacing ? `cible ${formatFullTime(goal.pacing.targetTimeSec)}` : null,
                  preparednessLabel(goal),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {planPosition && (
                <>
                  <ProgressBar
                    className={own.goalProgress}
                    percent={(planPosition.weekNumber / planPosition.weeksCount) * 100}
                    height={8}
                    label="Avancement du plan"
                  />
                  <div className={own.goalPlan}>
                    plan : semaine {String(planPosition.weekNumber).padStart(2, '0')} /{' '}
                    {planPosition.weeksCount}
                  </div>
                </>
              )}
            </Card>
            </Link>
          ) : (
            <EmptyState
              className={own.blockEmpty}
              sentence="Aucune course n’est marquée objectif principal : c’est elle qui façonnerait le plan et son affûtage."
            />
          )}
        </section>

        <section className={`${s.block} ${s.blockWide}`}>
          <div className={s.sectionLabel}>Courses de préparation</div>
          {overview.preparations.length > 0 ? (
            <div className={s.listTop}>
              {overview.preparations.map((race) => (
                <Link key={race.id} className={own.raceRow} to={racePath(race.id)}>
                  <span className={own.rowDate}>{shortDate(race.date)}</span>
                  <span className={s.timeBody}>
                    <span className={own.rowHead}>
                      <span className={own.prepTag}>PRÉPA</span>
                      <span className={s.rowTitleStrong}>{race.name}</span>
                    </span>
                    {preparationNote(race) && <span className={own.rowNote}>{preparationNote(race)}</span>}
                  </span>
                  <span className={own.rowAside}>{raceCountdown(race, today).label}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              className={own.blockEmpty}
              sentence="Aucune course de préparation d’ici l’objectif : le plan n’a donc aucun jour facile à réserver."
            />
          )}
        </section>

        <section className={`${s.block} ${s.blockWide}`}>
          <div className={s.sectionLabel}>Passées</div>
          {overview.past.length > 0 ? (
            <div className={s.listTop}>
              {overview.past.map((race) => (
                <Link key={race.id} className={own.raceRow} to={racePath(race.id)}>
                  <span className={own.rowDate}>{shortDate(race.date)}</span>
                  <span className={s.timeBody}>
                    <span className={own.pastTitle}>{race.name}</span>
                    <span className={own.rowNote}>
                      {raceResultLabel(race) ?? 'résultat non renseigné'}
                    </span>
                  </span>
                  <span className={own.pastMark} aria-hidden="true">
                    ✓
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              className={own.blockEmpty}
              sentence="Aucune course courue pour l’instant : cette liste se remplira toute seule, une course à la fois."
            />
          )}
        </section>

        <div className={s.footer}>
          <div className={`${s.footerNote} ${s.footerNoteTight}`}>
            Une seule course est l’objectif principal : elle seule façonne le plan et son affûtage. Une
            prépa apparaît encadrée « PRÉPA », avec ses jours faciles avant.
          </div>
          <PrimaryAction tone="ink" className={s.primary} disabled title="Bientôt disponible">
            Ajouter une course
          </PrimaryAction>
        </div>
      </div>
    </div>
  )
}
