import { LOCATION_LABELS } from '../../../domain/workoutFormat'
import { sessionContextLabel } from '../../../domain/todayState'
import { mainEffortColorVar, mainRecoveryColorVar, repeatRestLabel } from '../../../domain/workoutBlocks'
import { WorkoutDetailHero } from './WorkoutDetailHero'
import { WorkoutTimelineChart } from './WorkoutTimelineChart'
import { WorkoutWhySection } from './WorkoutWhySection'
import { DetailCtaRow } from './DetailCtaRow'
import { buildRunBlockRows, runStatBlocks } from './runBlockRows'
import type { DisciplineDetailProps } from './detailProps'
import styles from './RunWorkoutDetail.module.css'

/**
 * Artboard 29 · Séance course (l. 3112-3170) — « allures au kilomètre · terrain et récupération
 * explicites ».
 *
 * Le terrain a sa ligne à lui, sous l'encart « ce qui compte ici » (l. 3162). L'artboard y écrit
 * une consigne éditoriale (« piste ou route plate. Sur tapis, pente 1 % ») que les données ne
 * portent pas : on rend le seul terrain qu'elles connaissent, le lieu de la séance.
 */
export function RunWorkoutDetail({ workout, layout = 'compact' }: DisciplineDetailProps) {
  const stats = runStatBlocks(workout)
  const rows = buildRunBlockRows(workout.blocks)
  // « récupération explicite », dit la ligne grise de 29 : sa légende chiffre le trot (« trot 2′ »)
  // au lieu de le nommer en l'air. On reprend la durée réelle de la récupération de la série.
  const rest = repeatRestLabel(workout.blocks)

  return (
    <div className={styles.screen}>
      <WorkoutDetailHero
        discipline="C"
        zone={workout.zone}
        subtitle={sessionContextLabel(workout)}
        title={workout.title}
        titleSize="run"
        stripColorVar="var(--color-discipline-c)"
        layout={layout}
      />

      <div className={styles.statsGrid} data-columns={stats.length}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCell}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
          </div>
        ))}
      </div>

      <WorkoutTimelineChart
        caption="Déroulé"
        blocks={workout.blocks}
        discipline={workout.discipline}
        size="run"
        legend={[
          { color: mainEffortColorVar(workout.blocks), label: 'effort' },
          { color: mainRecoveryColorVar(workout.blocks), label: rest ? `récup. ${rest}` : 'récup.' },
          { color: 'var(--color-hairline)', label: 'arrêt complet', thin: true },
        ]}
      />

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div>Répétition</div>
          <div>Allure</div>
          <div>Temps</div>
        </div>
        {rows.map((row) => (
          <div key={row.key} className={`${styles.tableRow} ${row.emphasis ? styles.tableRowEmphasis : ''}`}>
            <div>{row.label}</div>
            <div>{row.pace}</div>
            <div>{row.time}</div>
          </div>
        ))}
      </div>

      {workout.why && <WorkoutWhySection title="Ce qui compte ici" why={workout.why} proseSize="sm" />}

      {workout.location && <p className={styles.terrain}>Terrain : {LOCATION_LABELS[workout.location].toLowerCase()}.</p>}

      <DetailCtaRow exportChips={['.FIT', '.PNG']} workoutId={workout.id} sourceRef={workout.why?.sourceRef} />
    </div>
  )
}
