import type { Discipline, WorkoutBlock } from '../../../domain/types'
import { buildTimelineBars } from '../../../domain/workoutBlocks'
import styles from './WorkoutTimelineChart.module.css'

export interface TimelineLegendItem {
  color: string
  label: string
  thin?: boolean
}

export interface WorkoutTimelineChartProps {
  /** Les artboards mobiles titrent le graphe (« Déroulé ») ; le panneau de S5 le laisse nu. */
  caption?: string
  blocks: WorkoutBlock[]
  discipline: Discipline
  legend: TimelineLegendItem[]
  /**
   * Repères sous la légende — artboard 28 l. 3083 : « 65 % · 96 % FTP sur les blocs · 55 % ».
   * Trois entrées, réparties aux deux bords et au centre : le graphe se lit alors comme une échelle.
   */
  scale?: string[]
  /** Hauteur du graphe, littérale par artboard : 05 → 24 px, 28 → 44 px, 29 → 48 px, S5 → 34 px. */
  size: 'swim' | 'bike' | 'run' | 'wide'
}

/**
 * Graphique « Déroulé » des fiches de séance (05 l. 580-588, 28 l. 3073-3084, 29 l. 3134-3144,
 * panneau de S5 l. 1746-1748). Chaque répétition a sa barre : le canevas n'agrège jamais une série.
 * Les pastilles de légende reprennent la couleur exacte des barres qu'elles nomment.
 *
 * Le graphe lui-même sort de l'arbre d'accessibilité : c'est un dessin de ce que la légende et le
 * tableau disent déjà en toutes lettres — « le tableau donne les chiffres exacts sous le graphique,
 * jamais l'inverse » (Design System).
 */
export function WorkoutTimelineChart({ caption, blocks, discipline, legend, scale, size }: WorkoutTimelineChartProps) {
  const bars = buildTimelineBars(blocks, discipline)

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <div className={styles.chart} aria-hidden="true">
        {bars.map((bar) => (
          <div
            key={bar.key}
            className={bar.thin ? styles.barThin : styles.bar}
            style={{ width: `${bar.widthPercent}%`, height: bar.thin ? '2px' : `${bar.heightPercent}%`, background: bar.colorVar }}
          />
        ))}
      </div>
      <div className={styles.legend}>
        {legend.map((item) => (
          <span key={item.label} className={styles.legendItem}>
            <span className={item.thin ? styles.legendLineSwatch : styles.legendSwatch} style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      {scale && (
        <div className={styles.scale}>
          {scale.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      )}
    </div>
  )
}
