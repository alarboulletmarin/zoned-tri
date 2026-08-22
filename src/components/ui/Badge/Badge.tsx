import styles from './Badge.module.css'

/**
 * `DisciplineTag` / `ZoneTag` — README §4.
 *
 * Un seul gabarit pour les deux : un aplat de couleur, une ou deux lettres en Space Mono 700,
 * capitales, sans rayon. La couleur ne dit que ça — la discipline, ou la zone. Le canevas ne
 * l'emploie jamais pour autre chose.
 *
 * Deux tailles, relevées sur les artboards : `sm` = 10 px / `padding:2px 6px` (lignes de liste,
 * frises), `md` = 11 px / `padding:3px 7px` (en-têtes de séance, cartes). Une troisième,
 * `padding:4px 8px`, n'apparaît qu'à trois endroits : c'est `lg`.
 *
 * Le texte est en encre partout, sauf là où l'aplat est trop sombre pour la porter : le vélo
 * `#2F6BE0`, la zone 5 `#E5261B` et la zone 6 `#8A46E0` passent en papier.
 */
export type DisciplineCode = 'N' | 'V' | 'C' | 'R'
export type ZoneNumber = 1 | 2 | 3 | 4 | 5 | 6
export type TagSize = 'sm' | 'md' | 'lg'

/**
 * Deux variantes du même gabarit, toutes deux littérales dans la liste des jours de la Semaine :
 *
 * - `outline` — artboards 03 l. 469 et 16 l. 2503, la ligne « Renforcement 25 min · optionnel » :
 *   `border:1px solid #0B0B0A; color:#5B594F; padding:1px 5px`, aucun aplat. Le renforcement ne
 *   dispute pas la couleur aux trois disciplines du triathlon. (En colonne desktop — S6 l. 1933 —
 *   il reprend au contraire son aplat gris : c'est bien la liste mobile qui le met au filet.)
 * - `ink` — artboards 03 l. 452 et 16 l. 2524, la ligne du jour courant posée en aplat lime : le
 *   jeton s'inverse, aplat d'encre et lettre lime, pour rester lisible sur le lime.
 */
export type TagTone = 'fill' | 'outline' | 'ink'

const disciplineColor: Record<DisciplineCode, string> = {
  N: 'var(--color-discipline-n)',
  V: 'var(--color-discipline-v)',
  C: 'var(--color-discipline-c)',
  R: 'var(--color-discipline-r)',
}

/** Seul V est assez sombre pour exiger du papier (canevas : `background:#2F6BE0; color:#FCFBF6`). */
const disciplineTextColor: Record<DisciplineCode, string> = {
  N: 'var(--color-ink)',
  V: 'var(--color-paper)',
  C: 'var(--color-ink)',
  R: 'var(--color-ink)',
}

const zoneColor: Record<ZoneNumber, string> = {
  1: 'var(--color-zone-1)',
  2: 'var(--color-zone-2)',
  3: 'var(--color-zone-3)',
  4: 'var(--color-zone-4)',
  5: 'var(--color-zone-5)',
  6: 'var(--color-zone-6)',
}

const zoneTextColor: Record<ZoneNumber, string> = {
  1: 'var(--color-ink)',
  2: 'var(--color-ink)',
  3: 'var(--color-ink)',
  4: 'var(--color-ink)',
  5: 'var(--color-paper)',
  6: 'var(--color-paper)',
}

export interface DisciplineBadgeProps {
  discipline: DisciplineCode
  size?: TagSize
  /** Voir `TagTone` : `outline` pour le renforcement de la liste mobile, `ink` sur l'aplat lime. */
  tone?: TagTone
}

const TONE_CLASS: Record<TagTone, string> = {
  fill: '',
  outline: styles.outline,
  ink: styles.ink,
}

export function DisciplineBadge({ discipline, size = 'sm', tone = 'fill' }: DisciplineBadgeProps) {
  return (
    <span
      className={[styles.tag, styles[size], TONE_CLASS[tone]].filter(Boolean).join(' ')}
      style={
        tone === 'fill'
          ? { background: disciplineColor[discipline], color: disciplineTextColor[discipline] }
          : undefined
      }
      role="img"
      aria-label={`Discipline ${discipline}`}
    >
      {discipline}
    </span>
  )
}

export interface ZoneBadgeProps {
  zone: ZoneNumber
  size?: TagSize
}

export function ZoneBadge({ zone, size = 'sm' }: ZoneBadgeProps) {
  return (
    <span
      className={`${styles.tag} ${styles[size]}`}
      data-zone={zone}
      style={{ background: zoneColor[zone], color: zoneTextColor[zone] }}
      role="img"
      aria-label={`Zone ${zone}`}
    >
      Z{zone}
    </span>
  )
}

/**
 * Troisième emploi du même gabarit, et le seul autre que le canevas s'autorise : les deux
 * transitions d'une course (artboard 09, tableau de pacing). Elles ne sont ni une discipline ni une
 * zone — le canevas leur donne le gris de repos `#8F8F86`, exactement l'aplat de la discipline R.
 * Une variante nommée plutôt qu'un aplat repeint dans le CSS de l'écran.
 */
export type TransitionCode = 'T1' | 'T2'

export interface TransitionBadgeProps {
  transition: TransitionCode
  size?: TagSize
}

export function TransitionBadge({ transition, size = 'sm' }: TransitionBadgeProps) {
  return (
    <span
      className={`${styles.tag} ${styles[size]}`}
      style={{ background: 'var(--color-discipline-r)', color: 'var(--color-ink)' }}
      role="img"
      aria-label={transition === 'T1' ? 'Transition 1' : 'Transition 2'}
    >
      {transition}
    </span>
  )
}

/** Noms du README §4 — mêmes composants, nommés comme la spécification les nomme. */
export { DisciplineBadge as DisciplineTag, ZoneBadge as ZoneTag, TransitionBadge as TransitionTag }
