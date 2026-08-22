import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import type { Race } from '../../domain/types'
import { disciplineShares, timelineGroups } from '../../domain/raceView'
import { racePath } from './routes'
import s from './RaceScreens.module.css'
import own from './RaceDayScreen.module.css'

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

  return (
    <div className={s.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', race.name, 'Jour J']}
        desktopTitle={`${race.name} · jour J`}
        onBack={() => navigate(racePath(race.id))}
      />

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
              title={
                race.transitionChecklist?.length
                  ? undefined
                  : 'Aucune checklist de parc enregistrée pour cette course'
              }
            >
              Checklist parc
            </PrimaryAction>
            <button type="button" className={s.chipButton} disabled title="Bientôt disponible">
              .ICS
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
