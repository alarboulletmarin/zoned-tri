import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import type { Race } from '../../domain/types'
import {
  MISSING,
  aidStationsLabel,
  disciplineShares,
  formatKm,
  formatNumberFr,
  formatSwimDistance,
  raceCountdown,
} from '../../domain/raceView'
import { formatDayMonthLong } from '../../domain/planGenerator/dates'
import { splitName } from './splitName'
import { racePath } from './routes'
import s from './RaceScreens.module.css'
import own from './RaceSheetScreen.module.css'

export interface RaceSheetScreenProps {
  race: Race
  /** Jour de référence du compte à rebours — injecté par les tests et l'atelier d'aperçu. */
  today: string
  /**
   * Racine quand la course est la seule (bandeau « Courses »), détail quand elle est ouverte depuis
   * « Mes courses » (fil d'Ariane « Courses / 70.3 Vichy »).
   */
  variant?: 'root' | 'detail'
}

const ROLE_LABEL: Record<Race['role'], string> = {
  primary_goal: 'objectif principal',
  preparation: 'course de préparation',
}

/**
 * Artboard 08 · Courses · fiche course — la racine de la section quand il n'y a qu'une course, et la
 * fiche d'une course quand il y en a plusieurs.
 *
 * LIMITATIONS assumées : les trois sous-écrans qu'elle ouvre (pacing, nutrition, jour J) ne
 * s'affichent que si la course porte la donnée correspondante ; sans elle, l'action reste rendue
 * mais inerte, avec un `title` qui dit pourquoi — jamais un bouton mort sans explication.
 */
export function RaceSheetScreen({ race, today, variant = 'root' }: RaceSheetScreenProps) {
  const navigate = useNavigate()
  const countdown = raceCountdown(race, today)
  const [first, second] = splitName(race.name)
  const shares = disciplineShares(race)
  const profile = race.bikeElevationProfile ?? []

  return (
    <div className={s.screen}>
      {variant === 'root' ? (
        <AppHeader variant="root" label="Courses" />
      ) : (
        <AppHeader
          variant="detail"
          trail={['Courses', race.name]}
          onBack={() => navigate('/races')}
        />
      )}

      <div className={s.column}>
        <div className={s.hero}>
          <div>
            <div className={s.overline}>
              {formatDayMonthLong(race.date)} · {ROLE_LABEL[race.role]}
            </div>
            <h1 className={s.title40}>
              {first}
              {second && (
                <>
                  <br />
                  {second}
                </>
              )}
            </h1>
          </div>
          <span className={s.countdown}>{countdown.label}</span>
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

        <div className={own.distances}>
          <div className={own.distanceCell}>
            <div className={own.distanceLabel}>N</div>
            <div className={own.distanceValue}>{formatSwimDistance(race.distances.swimM)}</div>
          </div>
          <div className={own.distanceCell}>
            <div className={own.distanceLabel}>V</div>
            <div className={own.distanceValue}>
              {race.distances.bikeKm > 0 ? formatKm(race.distances.bikeKm) : MISSING}
            </div>
          </div>
          <div className={own.distanceCell}>
            <div className={own.distanceLabel}>C</div>
            <div className={own.distanceValue}>{formatKm(race.distances.runKm)}</div>
          </div>
        </div>

        {race.elevationGainM !== undefined && (
          <section className={own.elevation}>
            <div className={s.sectionLabel}>Altimétrie vélo · {race.elevationGainM} m D+</div>
            {profile.length > 0 ? (
              <>
                <div className={own.profile} aria-hidden="true">
                  {profile.map((bar) => (
                    <div
                      key={bar.key}
                      className={bar.steep ? own.profileSteep : own.profileFlat}
                      style={{ height: `${bar.heightPercent}%` }}
                    />
                  ))}
                </div>
                <div className={own.legend}>
                  <span className={own.legendItem}>
                    <span className={own.legendSteep} />
                    pente &gt; 4 %
                  </span>
                  <span className={own.legendItem}>
                    <span className={own.legendFlat} />
                    pente ≤ 4 %
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                className={own.profileEmpty}
                sentence="Le dénivelé total est connu, pas son découpage : sans trace du parcours, aucun profil n’est dessiné."
              />
            )}
          </section>
        )}

        <div className={`${s.block} ${s.blockWide}`}>
          <div className={own.facts}>
            <div className={s.factRow}>
              <span className={s.factLabel}>Température de l’eau</span>
              <span
                className={`${s.factValue} ${race.waterTemperatureC === undefined ? s.factMissing : ''}`}
              >
                {race.waterTemperatureC === undefined
                  ? MISSING
                  : `${formatNumberFr(race.waterTemperatureC, 1)} °C`}
              </span>
            </div>
            <div className={s.factRow}>
              <span className={s.factLabel}>Combinaison</span>
              <span className={`${s.factValue} ${race.wetsuitAllowed === undefined ? s.factMissing : ''}`}>
                {race.wetsuitAllowed === undefined ? MISSING : race.wetsuitAllowed ? 'autorisée' : 'interdite'}
              </span>
            </div>
            <div className={s.factRow}>
              <span className={s.factLabel}>Drafting</span>
              <span className={`${s.factValue} ${race.draftingAllowed === undefined ? s.factMissing : ''}`}>
                {race.draftingAllowed === undefined ? MISSING : race.draftingAllowed ? 'autorisé' : 'interdit'}
              </span>
            </div>
            <div className={s.factRow}>
              <span className={s.factLabel}>Ravitos vélo</span>
              <span className={`${s.factValue} ${race.aidStationsKm?.length ? '' : s.factMissing}`}>
                {aidStationsLabel(race)}
              </span>
            </div>
          </div>
        </div>

        <div className={s.navStack}>
          <SecondaryAction
            shape="block"
            className={s.navAction}
            onClick={() => navigate(racePath(race.id, 'pacing'))}
            disabled={!race.pacing}
            title={race.pacing ? undefined : 'Aucun plan de pacing enregistré pour cette course'}
          >
            Plan de pacing
            <span aria-hidden="true">→</span>
          </SecondaryAction>
          <SecondaryAction
            shape="block"
            className={s.navAction}
            onClick={() => navigate(racePath(race.id, 'nutrition'))}
            disabled={!race.nutrition}
            title={race.nutrition ? undefined : 'Aucun plan nutrition enregistré pour cette course'}
          >
            Plan nutrition
            <span aria-hidden="true">→</span>
          </SecondaryAction>
          <SecondaryAction
            shape="block"
            className={s.navAction}
            onClick={() => navigate(racePath(race.id, 'jour-j'))}
            disabled={!race.timeline?.length}
            title={race.timeline?.length ? undefined : 'Aucune timeline enregistrée pour cette course'}
          >
            Timeline du jour J
            <span aria-hidden="true">→</span>
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}
