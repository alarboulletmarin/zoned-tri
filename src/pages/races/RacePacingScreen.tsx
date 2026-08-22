import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { DisciplineTag, TransitionTag } from '../../components/ui/Badge/Badge'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { ProofGauge } from '../../components/ui/ProofBadge/ProofBadge'
import type { Race } from '../../domain/types'
import {
  PROOF_WORD,
  bikeIfHeading,
  formatCumulative,
  formatFullTime,
  formatSegmentTime,
  pacingRows,
  pacingShares,
} from '../../domain/raceView'
import { racePath } from './routes'
import s from './RaceScreens.module.css'
import own from './RacePacingScreen.module.css'
import { InertNote } from '../../components/ui/InertNote/InertNote'

export interface RacePacingScreenProps {
  race: Race
}

/**
 * Artboard 09 · Courses · plan de pacing — le temps cible, sa décomposition segment par segment, et
 * la raison de l'intensité retenue au vélo, qualifiée par sa jauge de preuve.
 *
 * Le temps cible affiché est `pacing.targetTimeSec`, qui vaut la somme des segments : un total qui
 * ne serait pas celui de ses parts ne tracerait pas sa source. LIMITATION assumée : « Exporter la
 * fiche » est rendu inerte — aucun générateur de document n'existe encore.
 */
export function RacePacingScreen({ race }: RacePacingScreenProps) {
  const navigate = useNavigate()
  const pacing = race.pacing
  const rows = pacingRows(race)
  const shares = pacingShares(race)
  const heading = pacing ? bikeIfHeading(pacing) : null
  const why = pacing?.why
  const noteRef = rows.find((row) => row.noteRef !== undefined)?.noteRef

  return (
    <div className={s.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', { label: race.name, to: racePath(race.id) }, 'Pacing']}
        onBack={() => navigate(racePath(race.id))}
      />

      <div className={s.column}>
        {!pacing ? (
          <div className={s.emptyBlock}>
            <EmptyState
              headline="Pas de pacing"
              sentence="Aucun plan de pacing n’est enregistré pour cette course : rien n’est estimé à la place d’un temps cible que tu n’as pas posé."
            />
          </div>
        ) : (
          <>
            <div className={own.target}>
              <div className={s.overline}>Temps cible · transitions comptées</div>
              <div className={own.targetValue}>{formatFullTime(pacing.targetTimeSec)}</div>
            </div>

            {shares.length > 0 && (
              <ProgressBar
                className={s.strip}
                segments={shares}
                height={14}
                framed
                label="Répartition du temps cible par segment"
              />
            )}

            <div className={own.table}>
              <div className={own.tableHead}>
                <span className={own.headSeg}>Seg.</span>
                <span className={own.headTarget}>Allure cible</span>
                <span className={own.headCumul}>Cumul</span>
              </div>
              {rows.map((row) => (
                <div key={row.key} className={own.row}>
                  {row.discipline ? (
                    <DisciplineTag discipline={row.discipline} size="sm" />
                  ) : (
                    <TransitionTag transition={row.segment as 'T1' | 'T2'} size="sm" />
                  )}
                  <div className={own.rowBody}>
                    <div className={row.discipline ? own.rowTitleStrong : own.rowTitle}>{row.title}</div>
                    <div className={own.rowTarget}>
                      {row.pace}
                      {row.noteRef !== undefined && <sup className={own.noteRef}>{row.noteRef}</sup>}
                      {row.pace && row.note ? ' · ' : ''}
                      {row.note}
                    </div>
                  </div>
                  <div className={own.rowTimes}>
                    <div className={own.rowDuration}>{formatSegmentTime(row.durationSec)}</div>
                    <div className={own.rowCumul}>{formatCumulative(row.cumulativeTimeSec)}</div>
                  </div>
                </div>
              ))}
            </div>

            {why && (
              <section className={own.why}>
                <div className={s.proofHeader}>
                  <span className={s.sectionLabel}>{heading ?? 'Pourquoi cette intensité'}</span>
                  <ProofGauge level={why.level} />
                </div>
                <p className={s.proofText}>{why.text}</p>
              </section>
            )}

            <div className={s.footer}>
              {why?.sourceRef && (
                <div className={`${s.footerNote} ${own.footnoteBlock}`}>
                  <span className={s.footnote}>
                    <span className={s.footnoteMark}>{noteRef ?? 1}.</span>
                    <span className={s.footnoteText}>
                      {why.sourceRef} — <span className={s.footnoteLevel}>preuve {PROOF_WORD[why.level]}</span>.
                    </span>
                  </span>
                </div>
              )}
              <PrimaryAction
                tone="ink"
                className={s.primary}
                disabled
                aria-describedby="inert-fiche-pacing"
              >
                Exporter la fiche
              </PrimaryAction>
              <InertNote id="inert-fiche-pacing">
                Les documents du produit portent le plan et les zones, pas une course : il n’existe
                aucun gabarit de fiche de pacing à écrire.
              </InertNote>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
