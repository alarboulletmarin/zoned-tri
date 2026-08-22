import type { Zone } from '../../../domain/types'
import { formatDurationMin } from '../../../domain/workoutFormat'
import { sessionContextLabel } from '../../../domain/todayState'
import { mainEffortColorVar, mainRecoveryColorVar } from '../../../domain/workoutBlocks'
import { heartRateZones } from '../../../domain/calculators/heartRateZones'
import { NoteBox } from '../../../components/ui/NoteBox/NoteBox'
import { WorkoutDetailHero } from './WorkoutDetailHero'
import { WorkoutTimelineChart } from './WorkoutTimelineChart'
import { WorkoutWhySection } from './WorkoutWhySection'
import { DetailCtaRow } from './DetailCtaRow'
import { bikeFtpScale, bikeMainTargetPercent, bikeTargetColumnLabel, buildBikeBlockRows } from './bikeBlockRows'
import type { DisciplineDetailProps } from './detailProps'
import styles from './BikeWorkoutDetail.module.css'

/** Fourchette de FC de la zone du corps de séance — l'artboard 28 écrit « Blocs à 161–172 bpm ». */
function mainHeartRateRange(zone: Zone | null, maxHeartRateBpm: number | undefined): string | null {
  if (!zone || !maxHeartRateBpm) return null
  const bound = heartRateZones(maxHeartRateBpm).value.find((entry) => entry.zone === zone)
  if (!bound?.minBpm || !bound.maxBpm) return null
  return `${bound.minBpm}–${bound.maxBpm} bpm`
}

/**
 * Artboard 28 · Séance vélo (l. 3051-3109) — « cibles en watts et en % de FTP · repli FC quand il
 * n'y a pas de capteur ».
 *
 * Les deux unités coexistent, comme dans l'artboard : la rangée de tête et le tableau donnent des
 * watts (dérivés de la FTP mesurée), le graphe est titré « Déroulé · % de FTP » et porte ses trois
 * repères en pourcents. Sans FTP au profil, tout redescend en % de FTP et l'encart jaune du canevas
 * apparaît : les watts sont masqués, jamais estimés.
 */
export function BikeWorkoutDetail({ workout, layout = 'compact', profile }: DisciplineDetailProps) {
  const ftpWatts = profile?.ftp?.watts ?? null
  const rows = buildBikeBlockRows(workout.blocks, ftpWatts)
  const targetPercent = bikeMainTargetPercent(workout)
  const scale = bikeFtpScale(workout.blocks)
  const heartRate = mainHeartRateRange(workout.zone, profile?.maxHeartRateBpm)

  const targetValue =
    targetPercent === null ? '—' : ftpWatts === null ? `${targetPercent} %` : `${Math.round((targetPercent * ftpWatts) / 100)} W`

  return (
    <div className={styles.screen}>
      <WorkoutDetailHero
        discipline="V"
        zone={workout.zone}
        subtitle={sessionContextLabel(workout)}
        title={workout.title}
        titleSize="bike"
        stripColorVar="var(--color-discipline-v)"
        layout={layout}
      />

      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <div className={styles.statLabel}>DURÉE</div>
          <div className={styles.statValue}>{formatDurationMin(workout.durationMin)}</div>
        </div>
        <div className={styles.statCell}>
          <div className={styles.statLabel}>CIBLE</div>
          <div className={styles.statValue}>{targetValue}</div>
        </div>
        {/* L'artboard donne un IF. Il vaut, par définition (Coggan), puissance NORMALISÉE / FTP :
            une puissance normalisée demande un enregistrement, que la séance prévue n'a pas. On rend
            la case, inerte, avec la raison — plutôt qu'une moyenne pondérée maquillée en IF. */}
        <div className={styles.statCell} title="Demande une puissance normalisée, donc une séance enregistrée">
          <div className={styles.statLabel}>IF</div>
          <div className={styles.statValue}>—</div>
        </div>
      </div>

      <WorkoutTimelineChart
        caption="Déroulé · % de FTP"
        blocks={workout.blocks}
        discipline={workout.discipline}
        size="bike"
        legend={[
          { color: mainEffortColorVar(workout.blocks), label: 'bloc' },
          { color: mainRecoveryColorVar(workout.blocks), label: 'récup. active' },
          { color: 'var(--color-hairline)', label: 'arrêt · roue libre', thin: true },
        ]}
        scale={scale ? [scale.start, scale.main, scale.end] : undefined}
      />

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div>Bloc</div>
          <div>{bikeTargetColumnLabel(ftpWatts)}</div>
          <div>Cadence</div>
        </div>
        {rows.map((row) => (
          <div key={row.key} className={`${styles.tableRow} ${row.emphasis ? styles.tableRowEmphasis : ''}`}>
            <div>{row.label}</div>
            <div>{row.target}</div>
            <div>{row.cadence}</div>
          </div>
        ))}
      </div>

      {ftpWatts === null && (
        <NoteBox className={styles.noPower} title="Sans capteur de puissance">
          {heartRate
            ? `Blocs à ${heartRate}. Les watts sont masqués, pas estimés.`
            : 'Les cibles restent en % de FTP. Les watts sont masqués, pas estimés — et le repli en fréquence cardiaque demande une FC max au profil.'}
        </NoteBox>
      )}

      {workout.why && <WorkoutWhySection title="Pourquoi cette séance" why={workout.why} proseSize="sm" />}

      <DetailCtaRow exportChips={['.ZWO', '.FIT']} workoutId={workout.id} sourceRef={workout.why?.sourceRef} />
    </div>
  )
}
