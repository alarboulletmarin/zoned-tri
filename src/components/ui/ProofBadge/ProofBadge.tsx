import type { ProofLevel } from '../../../domain/types'
import styles from './ProofBadge.module.css'

export type { ProofLevel }

const levelLabel: Record<ProofLevel, string> = {
  solid: 'SOLIDE',
  moderate: 'MODÉRÉE',
  weak: 'FAIBLE',
}

const levelClass: Record<ProofLevel, string> = {
  solid: styles.solid,
  moderate: styles.moderate,
  weak: styles.weak,
}

const pipClass: Record<ProofLevel, string> = {
  solid: styles.pipSolid,
  moderate: styles.pipModerate,
  weak: styles.pipWeak,
}

/** Intitulé accessible du rectangle, quand il est posé seul (G6, 14, 19). */
const pipLabel: Record<ProofLevel, string> = {
  solid: 'Preuve solide',
  moderate: 'Preuve modérée',
  weak: 'Preuve faible',
}

export interface ProofBadgeProps {
  level: ProofLevel
}

/**
 * Ancienne forme en pilule. Elle ne correspond à aucun artboard : le canevas dessine partout le
 * rectangle de 22 × 9 px (`ProofPip`), seul ou suivi de son mot (`ProofGauge`). Elle ne sert plus
 * qu'aux écrans pas encore repris — à remplacer par `ProofGauge` au fil des reprises.
 *
 * @deprecated Utiliser `ProofGauge` (rectangle + mot) ou `ProofPip` (rectangle seul).
 */
export function ProofBadge({ level }: ProofBadgeProps) {
  return (
    <span className={`${styles.badge} ${levelClass[level]}`} data-level={level}>
      {levelLabel[level]}
    </span>
  )
}

/**
 * Deux tailles, toutes deux relevées sur le canevas :
 * - `pip` : 22 × 9 px, le rectangle qui qualifie une SOURCE (26 occurrences) ;
 * - `legend` : 30 × 10 px et sans contour, le rectangle qui sert de LÉGENDE à une phrase —
 *   artboard 04 l. 547, où la hachure annonce « non démontrée » devant la règle des 10 %.
 *   Le motif est le même ; c'est sa fonction, pas son sens, qui change.
 */
export type ProofPipSize = 'pip' | 'legend'

export interface ProofPipProps {
  level: ProofLevel
  size?: ProofPipSize
  /**
   * Le rectangle accompagne déjà un texte qui dit le niveau (c'est le cas de `ProofGauge`) : il
   * n'a alors rien à annoncer de plus et sort de l'arbre d'accessibilité.
   */
  decorative?: boolean
}

/**
 * Le rectangle de preuve du canevas : 22 × 9 px, en `content-box` comme le canevas l'écrit, avec
 * **trois remplissages et non une jauge proportionnelle** — c'est la lecture exacte des 26 occurrences
 * du canevas (G2, G5, G6, 05, 09, 10, 13, 14, 15, 19, 28, 29, 32, 33, 35, 38) :
 *
 * | Niveau | Canevas |
 * |---|---|
 * | solide | aplat d'encre, sans contour |
 * | modérée | contour de 2 px, vide |
 * | faible | hachures à 45°, filet de 1 px |
 *
 * Les trois formes se distinguent donc *au motif*, pas à une longueur remplie : elles restent
 * lisibles sans couleur et sans comparaison entre elles.
 *
 * Posé seul, il porte le niveau en toutes lettres (G6 « Ce que le moteur va faire », 14, 19).
 */
export function ProofPip({ level, size = 'pip', decorative = false }: ProofPipProps) {
  return (
    <span
      className={[styles.pip, pipClass[level], size === 'legend' ? styles.pipLegend : ''].filter(Boolean).join(' ')}
      data-level={level}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : pipLabel[level]}
    />
  )
}

export interface ProofGaugeProps {
  level: ProofLevel
}

/**
 * Le rectangle suivi de son mot en mono 10 px capitales, séparés de 6 px — la forme que le canevas
 * donne à la qualification quand elle accompagne un intitulé de section plutôt qu'une note
 * (artboards G2, G5, 09, 10, 13, 15, 32, 38).
 */
export function ProofGauge({ level }: ProofGaugeProps) {
  return (
    <span className={styles.gauge} data-level={level}>
      <ProofPip level={level} decorative />
      <span className={styles.gaugeLabel}>{levelLabel[level]}</span>
    </span>
  )
}
