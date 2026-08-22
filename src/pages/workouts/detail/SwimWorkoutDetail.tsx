import { sessionContextLabel } from '../../../domain/todayState'
import { describeBlocks, mainEffortColorVar, repeatRestLabel, workoutStatBlocks } from '../../../domain/workoutBlocks'
import { WorkoutDetailHero } from './WorkoutDetailHero'
import { WorkoutTimelineChart } from './WorkoutTimelineChart'
import { WorkoutWhySection } from './WorkoutWhySection'
import { DetailCtaRow } from './DetailCtaRow'
import { buildDetailMetaLine, buildSwimSetRows } from '../../../domain/swimSetRows'
import type { DisciplineDetailProps } from './detailProps'
import styles from './SwimWorkoutDetail.module.css'

/**
 * Séance natation — artboard 05 en colonne étroite, panneau de S5 (l. 1741-1768) en colonne large.
 * Les deux compositions diffèrent réellement dans le canevas : la colonne large remplace le bandeau
 * de discipline, la rangée Distance/Durée et la liste de blocs par une ligne de méta et le tableau
 * Bloc / Cible / Repos.
 */
export function SwimWorkoutDetail({ workout, layout = 'compact' }: DisciplineDetailProps) {
  const wide = layout === 'wide'
  const stats = workoutStatBlocks(workout)
  const blocks = describeBlocks(workout.blocks, workout.discipline)
  const setRows = buildSwimSetRows(workout)
  const rest = repeatRestLabel(workout.blocks)

  return (
    <div className={`${styles.screen} ${wide ? styles.wide : ''}`}>
      <WorkoutDetailHero
        discipline="N"
        zone={workout.zone}
        subtitle={sessionContextLabel(workout)}
        title={workout.title}
        titleSize="swim"
        stripColorVar="var(--color-discipline-n)"
        layout={layout}
        meta={buildDetailMetaLine(workout)}
      />

      {!wide && (
        <div className={styles.statsRow}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCell}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <WorkoutTimelineChart
        caption={wide ? undefined : 'Déroulé'}
        blocks={workout.blocks}
        discipline={workout.discipline}
        size={wide ? 'wide' : 'swim'}
        legend={[
          { color: mainEffortColorVar(workout.blocks), label: 'effort' },
          { color: 'var(--color-zone-1)', label: 'éch. / RAC' },
          { color: 'var(--color-hairline)', label: rest ? `repos · ${rest} au mur` : 'repos', thin: true },
        ]}
      />

      {wide ? (
        <div className={styles.setsTable}>
          <div className={styles.setsGrid}>
            <div className={styles.setsHeadCell}>Bloc</div>
            <div className={styles.setsHeadCell}>Cible</div>
            <div className={styles.setsHeadCell}>Repos</div>
            {setRows.map((row, index) => {
              const last = index === setRows.length - 1
              const cell = last ? styles.setsCellLast : styles.setsCell
              return (
                <div key={row.key} className={styles.setsRow}>
                  <div className={cell}>{row.block}</div>
                  <div className={cell}>{row.target}</div>
                  <div className={cell}>{row.rest}</div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={styles.blockList}>
          {blocks.map((row) => (
            <div key={row.key} className={styles.blockRow}>
              <div>
                <div className={row.emphasis ? styles.blockTitleEmphasis : styles.blockTitle}>{row.title}</div>
                <div className={styles.blockMeta}>{row.meta}</div>
              </div>
              <span className={row.emphasis ? styles.blockDurationEmphasis : styles.blockDuration}>{row.durationLabel}</span>
            </div>
          ))}
        </div>
      )}

      {workout.why && <WorkoutWhySection title="Pourquoi cette séance" why={workout.why} />}

      <DetailCtaRow exportChips={['.FIT', '.PNG']} workoutId={workout.id} sourceRef={workout.why?.sourceRef} />
    </div>
  )
}
