import { formatDurationMin } from '../../../domain/workoutFormat'
import { sessionContextLabel } from '../../../domain/todayState'
import { describeBlocks } from '../../../domain/workoutBlocks'
import { WorkoutDetailHero } from './WorkoutDetailHero'
import { WorkoutWhySection } from './WorkoutWhySection'
import { DetailCtaRow } from './DetailCtaRow'
import type { DisciplineDetailProps } from './detailProps'
import styles from './GenericWorkoutDetail.module.css'

/** Gabarit de repli pour la discipline R (repos/renfort) — aucun artboard dédié dans le canevas :
 * même ossature que l'artboard 05, sans distance ni allure puisque ces séances n'en portent pas. */
export function GenericWorkoutDetail({ workout, layout = 'compact' }: DisciplineDetailProps) {
  const blocks = describeBlocks(workout.blocks, workout.discipline)

  return (
    <div className={styles.screen}>
      <WorkoutDetailHero
        discipline="R"
        zone={workout.zone}
        subtitle={sessionContextLabel(workout)}
        title={workout.title}
        titleSize="run"
        stripColorVar="var(--color-discipline-r)"
        layout={layout}
      />

      <div className={styles.statsRow}>
        <div className={styles.statCell}>
          <div className={styles.statLabel}>DURÉE</div>
          <div className={styles.statValue}>{formatDurationMin(workout.durationMin)}</div>
        </div>
      </div>

      <div className={styles.blockList}>
        {blocks.map((row) => (
          <div key={row.key} className={styles.blockRow}>
            <div>
              <div className={styles.blockTitle}>{row.title}</div>
              {row.meta && <div className={styles.blockMeta}>{row.meta}</div>}
            </div>
            <span className={styles.blockDuration}>{row.durationLabel}</span>
          </div>
        ))}
      </div>

      {workout.why && <WorkoutWhySection title="Pourquoi cette séance" why={workout.why} />}

      <DetailCtaRow exportChips={['.PNG']} sourceRef={workout.why?.sourceRef} />
    </div>
  )
}
