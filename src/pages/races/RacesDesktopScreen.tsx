import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { usePublishRailBlock } from '../../context/RailBlockContext'
import { formatDayMonthLong, weekdayName } from '../../domain/planGenerator/dates'
import {
  MISSING,
  formatKm,
  formatNumberFr,
  formatRaceDistances,
  formatSwimDistance,
  preparationNote,
  raceCountdown,
  raceResultLabel,
  racesOverview,
} from '../../domain/raceView'
import type { Race } from '../../domain/types'
import { splitName } from './splitName'
import { GENERATOR_PATH } from '../../navigation'
import { racePath } from './routes'
import { EXPORTS_PRINT_PATH } from '../exports/exportsRoutes'
import s from './RaceScreens.module.css'
import own from './RacesDesktopScreen.module.css'
import { InertNote } from '../../components/ui/InertNote/InertNote'
import { buildRaceIcs, raceIcsFileName } from '../../domain/exports/raceIcs'
import { downloadIcs } from '../exports/download'

export interface RacesDesktopScreenProps {
  races: Race[]
  today: string
  /** Nombre de semaines d'affûtage du plan lié à l'objectif, quand un plan actif le vise. */
  taperWeeks?: number
}

/** « dim. 30 août » — l'en-tête de la fiche de droite (artboard S7). */
const WEEKDAY_SHORT: Record<string, string> = {
  lundi: 'lun.',
  mardi: 'mar.',
  mercredi: 'mer.',
  jeudi: 'jeu.',
  vendredi: 'ven.',
  samedi: 'sam.',
  dimanche: 'dim.',
}

function longDateLabel(race: Race): string {
  const weekday = WEEKDAY_SHORT[weekdayName(race.date)] ?? ''
  const date = `${weekday} ${formatDayMonthLong(race.date)}`.trim()
  return race.startTime ? `${date} · ${race.startTime} départ` : date
}

/**
 * Artboard S7 · Courses · desktop — le calendrier de la saison à gauche, la fiche complète de
 * l'objectif à droite. Rendu au-delà de 1024 px seulement : en deçà, la section reste sur ses
 * artboards mobiles (27 puis 08), le canevas ne lui donnant pas de mise en page tablette.
 *
 * LIMITATIONS assumées : « Ajouter une course », « Atlas des zones », « Plan de course .PDF » et
 * l'export `.ICS` sont rendus inertes — aucun de ces quatre chemins n'existe encore.
 */
export function RacesDesktopScreen({ races, today, taperWeeks }: RacesDesktopScreenProps) {
  const navigate = useNavigate()
  const overview = racesOverview(races, today)
  const goal = overview.goal
  const countdown = goal ? raceCountdown(goal, today) : null

  // Bloc contextuel du rail (canevas S7 : « Objectif principal », le nom, la date et le compte à
  // rebours). Le rail appartient à la coquille, le chiffre appartient à l'écran.
  usePublishRailBlock(
    'Objectif principal',
    goal && countdown ? [goal.name, `${formatDayMonthLong(goal.date)} · ${countdown.label}`] : null,
  )

  const season = new Date(`${today}T00:00:00Z`).getUTCFullYear()

  return (
    <div className={own.screen}>
      <AppHeader
        variant="root"
        label="Courses"
        desktopTitle="Courses"
        desktopActions={
          <>
            <span className={own.breakdown}>{overview.breakdownLabel || 'aucune course'}</span>
            <SecondaryAction
              shape="chip"
              className={own.headerChip}
              onClick={() => navigate(GENERATOR_PATH)}
            >
              Ajouter une course
            </SecondaryAction>
          </>
        }
      />

      <div className={own.grid}>
        <div className={own.calendar}>
          <div className={own.columnLabel}>Saison {season}</div>

          {goal && (
            <Link className={`${own.calendarRow} ${own.calendarRowGoal}`} to={racePath(goal.id)}>
              <span className={own.calendarBody}>
                <span className={own.calendarHead}>
                  <span className={own.tagGoal}>Objectif</span>
                  <span className={own.calendarName}>{goal.name}</span>
                </span>
                <span className={own.calendarNoteOnInk}>
                  {[formatRaceDistances(goal), taperWeeks ? `affûtage ${taperWeeks} sem.` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className={own.calendarDateOnInk}>{formatDayMonthLong(goal.date)}</span>
            </Link>
          )}

          {overview.preparations.map((race) => (
            <Link key={race.id} className={own.calendarRow} to={racePath(race.id)}>
              <span className={own.calendarBody}>
                <span className={own.calendarHead}>
                  <span className={own.tagPrep}>Prépa</span>
                  <span className={own.calendarName}>{race.name}</span>
                </span>
                <span className={own.calendarNote}>
                  {[formatRaceDistances(race), preparationNote(race)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className={own.calendarDate}>{formatDayMonthLong(race.date)}</span>
            </Link>
          ))}

          {!goal && overview.preparations.length === 0 && (
            <EmptyState
              className={own.calendarEmpty}
              sentence="Aucune course à venir : la saison est vide, et le plan n’a donc rien à viser."
            />
          )}

          <div className={own.columnLabelTop}>Passées</div>
          {overview.past.length > 0 ? (
            overview.past.map((race) => (
              <Link key={race.id} className={`${own.calendarRow} ${own.calendarRowPast}`} to={racePath(race.id)}>
                <span className={own.calendarBody}>
                  <span className={own.calendarName}>{race.name}</span>
                  <span className={own.calendarNote}>
                    {raceResultLabel(race) ?? 'résultat non renseigné'}
                  </span>
                </span>
                <span className={own.calendarDate}>{formatDayMonthLong(race.date)}</span>
              </Link>
            ))
          ) : (
            <EmptyState
              className={own.calendarEmpty}
              sentence="Aucune course courue pour l’instant : cette liste se remplira toute seule."
            />
          )}

          <div className={own.calendarFooter}>
            Une seule course peut être l’objectif principal : elle seule façonne le plan. Changer
            d’objectif se fait ici, et montre d’abord ce que le plan devient.
          </div>
        </div>

        <aside className={own.detail} aria-label="Fiche de l’objectif principal">
          {!goal ? (
            <EmptyState
              headline="Pas d’objectif"
              sentence="Aucune course n’est marquée objectif principal : sans elle, il n’y a pas de fiche à ouvrir ici."
            />
          ) : (
            <>
              <div className={own.detailTop}>
                <span className={own.detailBadge}>Objectif principal</span>
                <span className={own.detailDate}>{longDateLabel(goal)}</span>
              </div>

              {/* Le canevas casse le nom après le premier mot, comme l'artboard 08. */}
              <h1 className={own.detailTitle}>
                {splitName(goal.name)[0]}
                {splitName(goal.name)[1] && (
                  <>
                    <br />
                    {splitName(goal.name)[1]}
                  </>
                )}
              </h1>

              <div className={own.stats}>
                <div className={own.stat}>
                  <div className={own.statLabel}>Natation</div>
                  <div className={own.statValue}>{formatSwimDistance(goal.distances.swimM)}</div>
                  <div className={own.statNote}>
                    {[
                      goal.swimVenue,
                      goal.waterTemperatureC !== undefined
                        ? `${formatNumberFr(goal.waterTemperatureC, 1)} °C`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || MISSING}
                  </div>
                </div>
                <div className={own.stat}>
                  <div className={own.statLabel}>Vélo</div>
                  <div className={own.statValue}>
                    {goal.distances.bikeKm > 0 ? formatKm(goal.distances.bikeKm) : MISSING}
                  </div>
                  <div className={own.statNote}>
                    {goal.elevationGainM !== undefined ? `+ ${goal.elevationGainM} m D+` : MISSING}
                  </div>
                </div>
                <div className={own.stat}>
                  <div className={own.statLabel}>Course</div>
                  <div className={own.statValue}>{formatKm(goal.distances.runKm)}</div>
                  <div className={own.statNote}>{goal.runCourseNote ?? MISSING}</div>
                </div>
              </div>

              <section className={own.detailBlock}>
                <div className={s.sectionLabel}>Ce que cette course impose au plan</div>
                {goal.planImplications && goal.planImplications.length > 0 ? (
                  <div className={own.implications}>
                    {goal.planImplications.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    className={own.detailEmpty}
                    sentence="Aucune contrainte n’est enregistrée pour cette course : le plan ne s’en déduit donc pas encore."
                  />
                )}
              </section>

              <section className={own.detailBlockRuled}>
                <div className={s.sectionLabel}>Préparation logistique</div>
                <div className={own.chips}>
                  <SecondaryAction
                    shape="chip"
                    className={own.chip}
                    onClick={() => navigate(racePath(goal.id, 'checklist'))}
                    disabled={!goal.transitionChecklist?.length}
                    aria-describedby={
                      goal.transitionChecklist?.length ? undefined : 'inert-checklist-parc'
                    }
                  >
                    Checklist parc à vélo
                  </SecondaryAction>
                  {!goal.transitionChecklist?.length && (
                    <InertNote id="inert-checklist-parc">
                      Aucune checklist de parc enregistrée pour cette course : les affaires de T1, du
                      vélo et de T2 se saisissent course par course.
                    </InertNote>
                  )}
                  {/* L'atlas des zones n'était pas « à venir » : c'est la première page du
                      document A4, qui se rend depuis toujours dans `PrintDocument`. */}
                  <SecondaryAction
                    shape="chip"
                    className={own.chip}
                    onClick={() => navigate(EXPORTS_PRINT_PATH)}
                  >
                    Atlas des zones
                  </SecondaryAction>
                  <SecondaryAction
                    shape="chip"
                    className={own.chip}
                    disabled
                    aria-describedby="inert-plan-course-pdf"
                  >
                    Plan de course .PDF
                  </SecondaryAction>
                  <InertNote id="inert-plan-course-pdf">
                    Les documents du produit portent le plan et les zones, pas une course : il n’existe
                    aucun gabarit de plan de course à écrire.
                  </InertNote>
                </div>
              </section>

              <div className={own.detailFooter}>
                <PrimaryAction
                  tone="ink"
                  className={`${s.primary} ${own.footerPrimary}`}
                  onClick={() => navigate('/plan')}
                >
                  Voir le plan de cette course
                </PrimaryAction>
                {/* Le moteur d'agenda existe : ce qui manque, quand il manque, c'est la timeline
                    de la course — et la note le dit à l'écran. */}
                <button
                  type="button"
                  className={`${s.chipButton} ${own.footerChip}`}
                  disabled={!buildRaceIcs(goal)}
                  aria-describedby={buildRaceIcs(goal) ? undefined : 'inert-ics-objectif'}
                  onClick={() => {
                    const ics = buildRaceIcs(goal)
                    if (ics) downloadIcs(raceIcsFileName(goal), ics)
                  }}
                >
                  .ICS
                </button>
              </div>
              {!buildRaceIcs(goal) && (
                <InertNote id="inert-ics-objectif">
                  Aucune timeline enregistrée pour cette course : il n’y a rien à mettre dans l’agenda.
                </InertNote>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
