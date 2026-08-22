import styles from './ProgressBar.module.css'

/**
 * `ProgressBar` — README §4 : « encre / #E4E1D6 ».
 *
 * Deux emplois dans le canevas, une seule mécanique : une barre pleine largeur découpée en parts
 * proportionnelles, sans rayon ni bordure interne.
 *
 * - **Avancement** (`percent`) : une part d'encre, le reste en `#E4E1D6`. Le gris n'est jamais
 *   « zéro », il est « pas encore » — c'est la règle du Design System sur l'aplat non renseigné.
 *   Artboard 01, carte du plan en cours : `height:8px`, 39 % / 61 %.
 * - **Répartition** (`segments`) : plusieurs aplats de discipline ou de zone bout à bout, toujours
 *   à l'échelle du temps réel. Artboard 01, frise sous le bandeau : `height:14px`, quatre parts,
 *   filet d'encre en dessous.
 *
 * Les deux formes ne coexistent pas sur une même barre : `segments` l'emporte s'il est fourni.
 */
export interface ProgressSegment {
  key: string
  percent: number
  color: string
  /** Nommé pour les lecteurs d'écran ; sans lui la barre reste purement décorative. */
  label?: string
}

export interface ProgressBarProps {
  /** Part réalisée, 0-100. Ignoré si `segments` est fourni. */
  percent?: number
  segments?: ProgressSegment[]
  /**
   * Hauteur en px, telle que l'artboard la donne (8 pour l'avancement, 14 pour la frise).
   *
   * Une longueur CSS est acceptée pour les gabarits d'impression : l'A4 de l'artboard 21 ne
   * mesure pas en pixels mais en unités d'artboard (`calc(14 * var(--u))`), pour que le même
   * dessin fasse 520 px à l'écran et 210 mm sur le papier.
   */
  height?: number | string
  /** Filet d'encre 2 px sous la barre — la frise du bandeau d'ouverture le porte, pas l'avancement. */
  underlined?: boolean
  /** Filets d'encre 2 px au-dessus ET en dessous — la frise d'Aujourd'hui (artboards 02, 15, S4). */
  framed?: boolean
  /** Filet d'encre 1 px tout autour — les barres de couverture de langue (artboard S3). */
  outlined?: boolean
  /** Décrit ce que la barre mesure. Sans lui, la barre est masquée aux lecteurs d'écran. */
  label?: string
  className?: string
}

export function ProgressBar({
  percent,
  segments,
  height = 8,
  underlined = false,
  framed = false,
  outlined = false,
  label,
  className,
}: ProgressBarProps) {
  const classes = [
    styles.bar,
    underlined ? styles.underlined : '',
    framed ? styles.framed : '',
    outlined ? styles.outlined : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Une barre dont aucune part n'est nommée n'a rien à énumérer : son `label` EST la phrase
  // complète (semaine en pause, aplat unique). Sinon on énumère, c'est là tout l'intérêt.
  const named = segments?.some((segment) => segment.label)
  const accessibility = label
    ? ({
        role: 'img' as const,
        'aria-label': segments
          ? named
            ? `${label} : ${segments.map((s) => `${s.label ?? s.key} ${s.percent} %`).join(', ')}`
            : label
          : `${label} : ${Math.round(percent ?? 0)} %`,
      })
    : { 'aria-hidden': true as const }

  return (
    <div
      className={classes}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      {...accessibility}
    >
      {segments
        ? segments.map((segment) => (
            <div key={segment.key} style={{ width: `${segment.percent}%`, background: segment.color }} />
          ))
        : [
            <div key="done" className={styles.done} style={{ width: `${percent ?? 0}%` }} />,
            <div key="todo" className={styles.todo} style={{ width: `${100 - (percent ?? 0)}%` }} />,
          ]}
    </div>
  )
}
