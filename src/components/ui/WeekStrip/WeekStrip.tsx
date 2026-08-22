import styles from './WeekStrip.module.css'
import type { DisciplineCode } from '../Badge/Badge'

/**
 * `WeekStrip` — README §4 : « barres par jour ».
 *
 * L'histogramme de la semaine, artboard 03 : sept colonnes alignées sur leur base, hauteur relative
 * à la journée la plus chargée, couleur donnée par la discipline dominante du jour, initiales en
 * mono sous les barres. C'est le seul endroit où la couleur code une charge : elle continue de ne
 * dire que la discipline, la hauteur seule dit le volume.
 *
 * Un jour sans séance ne devient pas une colonne absente ni un blanc : il porte une colonne en
 * pointillé clair (README §3 règle 4). Le `title` de la colonne le nomme au survol, et la barre
 * entière est décrite aux lecteurs d'écran par `aria-label`.
 */
export interface WeekStripDay {
  /** Initiale affichée sous la colonne : L M M J V S D. */
  initial: string
  /** Nom complet du jour, pour l'infobulle et les lecteurs d'écran. */
  name: string
  /** Hauteur relative, 0-100. `0` = jour libre → colonne en pointillé. */
  percent: number
  /** Discipline dominante du jour. Absente quand le jour est libre. */
  discipline?: DisciplineCode
  /**
   * Aplat déjà résolu par le domaine — `WeekBar.colorVar` de `weekContext.ts` donne la couleur,
   * pas le code de discipline. Prioritaire sur `discipline` quand les deux sont fournis.
   */
  colorVar?: string
  /** Volume lisible (« 1 h 10 »), lu par les lecteurs d'écran. */
  volumeLabel?: string
  /** Marque le jour courant : la colonne prend le filet d'encre. */
  isToday?: boolean
}

export interface WeekStripProps {
  days: WeekStripDay[]
  /** Hauteur de la zone des barres, en px (84 sur l'artboard 03, 78 dans la colonne de S4). */
  height?: number
  /**
   * Filet de la colonne du jour libre : `structure` = 2 px (artboard 03, frise pleine largeur),
   * `hairline` = 1 px (canevas S4 l. 1625, histogramme de la colonne de contexte).
   */
  emptyOutline?: 'structure' | 'hairline'
  /** Phrase décrivant ce que compare la frise. */
  label?: string
  className?: string
}

const DISCIPLINE_COLOR: Record<DisciplineCode, string> = {
  N: 'var(--color-discipline-n)',
  V: 'var(--color-discipline-v)',
  C: 'var(--color-discipline-c)',
  R: 'var(--color-discipline-r)',
}

const EMPTY_DAY = 'jour libre'

export function WeekStrip({
  days,
  height = 84,
  emptyOutline = 'structure',
  label = 'Charge de la semaine',
  className,
}: WeekStripProps) {
  const summary = days
    .map((day) => `${day.name} ${day.percent === 0 ? EMPTY_DAY : (day.volumeLabel ?? `${day.percent} %`)}`)
    .join(', ')

  return (
    <div className={[styles.strip, className].filter(Boolean).join(' ')}>
      <div className={styles.bars} style={{ height: `${height}px` }} role="img" aria-label={`${label} : ${summary}`}>
        {days.map((day, index) => {
          const isEmpty = day.percent === 0
          return (
            <div
              key={`${day.initial}-${index}`}
              className={[
                styles.column,
                isEmpty ? (emptyOutline === 'hairline' ? styles.emptyHairline : styles.empty) : '',
                day.isToday ? styles.today : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                isEmpty
                  ? undefined
                  : {
                      height: `${day.percent}%`,
                      background:
                        day.colorVar ??
                        (day.discipline ? DISCIPLINE_COLOR[day.discipline] : 'var(--color-neutral-fill)'),
                    }
              }
              title={isEmpty ? `${day.name} · ${EMPTY_DAY}` : `${day.name} · ${day.volumeLabel ?? ''}`.trim()}
            />
          )
        })}
      </div>
      <div className={styles.initials} aria-hidden="true">
        {days.map((day, index) => (
          <span key={`${day.initial}-${index}`} className={day.isToday ? styles.initialToday : undefined}>
            {day.initial}
          </span>
        ))}
      </div>
    </div>
  )
}
