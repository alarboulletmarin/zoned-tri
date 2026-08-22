import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import type { Race } from '../../domain/types'
import { disciplineShares, timelineGroups } from '../../domain/raceView'
import { racePath, raceTimelineEditPath } from './routes'
import s from './RaceScreens.module.css'
import own from './RaceDayScreen.module.css'
import { InertNote } from '../../components/ui/InertNote/InertNote'
import { buildRaceIcs, raceIcsFileName } from '../../domain/exports/raceIcs'
import { downloadIcs } from '../exports/download'
import { RaceSegment } from '../../components/navigation/RaceSegment/RaceSegment'

export interface RaceDayScreenProps {
  race: Race
}

/**
 * Artboard 11 · Courses · timeline du jour J — la veille, puis le compte à rebours du matin, et le
 * départ en capitales. Consultable hors ligne, sans aucune notification : l'app ne réveille personne.
 *
 * LIMITATION assumée : l'export `.ICS` est rendu inerte, aucun générateur de calendrier n'existe.
 */
export function RaceDayScreen({ race }: RaceDayScreenProps) {
  const navigate = useNavigate()
  const groups = timelineGroups(race)
  const shares = disciplineShares(race)
  const ics = buildRaceIcs(race)

  return (
    <div className={s.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', { label: race.name, to: racePath(race.id) }, 'Jour J']}
        onBack={() => navigate(racePath(race.id))}
      />
      <RaceSegment raceId={race.id} current="jour-j" />

      <div className={s.column}>
        <div className={s.hero}>
          <h1 className={s.title42}>Jour J</h1>
          {race.startTime && <span className={s.heroAside}>départ {race.startTime}</span>}
        </div>

        {shares.length > 0 && (
          <ProgressBar
            className={s.strip}
            segments={shares}
            height={14}
            framed
            label="Répartition du temps cible par discipline"
          />
        )}

        {groups.length === 0 ? (
          <div className={s.emptyBlock}>
            <EmptyState
              headline="Pas de timeline"
              sentence="Aucun horaire n’est enregistré pour cette course : rien n’est inventé à la place de ton propre déroulé."
            />
            {/* Le vide se nommait, et ne se remplissait pas : `Race.timeline` n'avait aucun écran
                d'écriture, donc cet écran restait vide pour toujours. */}
            <PrimaryAction
              tone="ink"
              className={own.emptyAction}
              onClick={() => navigate(raceTimelineEditPath(race.id))}
            >
              Écrire le déroulé
            </PrimaryAction>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.phase} className={s.block}>
              <div className={s.sectionLabel}>{group.label}</div>
              <div className={`${s.listTop} ${s.listTop8}`}>
                {group.events.map((event) =>
                  event.isStart ? (
                    <div key={`${event.at}-${event.label}`} className={own.startRow}>
                      <span className={own.startTime}>{event.at}</span>
                      <span className={own.startLabel}>{event.label}</span>
                    </div>
                  ) : (
                    <div key={`${event.at}-${event.label}`} className={s.timeRow}>
                      <span className={s.timeCell}>{event.at}</span>
                      {/* Sans sous-ligne, le canevas fait du titre l'enfant direct de la ligne :
                          sa hauteur est alors celle de ses 14 px, pas celle du corps de texte. */}
                      {event.detail ? (
                        <div className={s.timeBody}>
                          <div className={s.rowTitleStrong}>{event.label}</div>
                          <div className={own.detail}>{event.detail}</div>
                        </div>
                      ) : (
                        <span className={s.rowTitle}>{event.label}</span>
                      )}
                    </div>
                  ),
                )}
              </div>
            </section>
          ))
        )}

        <div className={s.footer}>
          <div className={s.footerNote}>
            Consultable hors ligne. Aucune notification : l’app ne te réveillera pas, ton réveil le fera.
          </div>
          <div className={s.actionRow}>
            <PrimaryAction
              tone="ink"
              className={s.primary}
              onClick={() => navigate(racePath(race.id, 'checklist'))}
              disabled={!race.transitionChecklist?.length}
              aria-describedby={race.transitionChecklist?.length ? undefined : 'inert-checklist'}
            >
              Checklist parc
            </PrimaryAction>
            {/* Le moteur d'agenda existe depuis l'artboard 24 : il ne manquait qu'un lecteur de
                timeline. Inerte seulement quand la course n'en porte aucune — il n'y a alors rien
                à mettre dans un agenda, et la note le dit à l'écran. */}
            <button
              type="button"
              className={s.chipButton}
              disabled={!ics}
              aria-describedby={ics ? undefined : 'inert-ics-course'}
              onClick={() => ics && downloadIcs(raceIcsFileName(race), ics)}
            >
              .ICS
            </button>
          </div>
          {!race.transitionChecklist?.length && (
            <InertNote id="inert-checklist">
              Aucune checklist de parc enregistrée pour cette course : les affaires de T1, du vélo et
              de T2 se saisissent course par course, et cet écran n’existe pas encore.
            </InertNote>
          )}
          {!ics && (
            <InertNote id="inert-ics-course">
              Aucune heure de départ ni timeline enregistrée pour cette course : il n’y a rien à mettre
              dans l’agenda.
            </InertNote>
          )}
        </div>
      </div>
    </div>
  )
}
