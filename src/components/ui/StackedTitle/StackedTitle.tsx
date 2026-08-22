import type { ElementType } from 'react'
import styles from './StackedTitle.module.css'

/**
 * Titre d'affiche coupé en lignes — « UN PLAN / QUI DIT / POURQUOI », « MES / RÉFÉRENCES »,
 * « RIEN / AUJOURD'HUI ». Le canevas coupe ces titres à la main, avec des `<br>`, et la coupure
 * fait partie du dessin : elle donne à l'affiche sa silhouette.
 *
 * Mais un `<br>` n'apporte aucune espace au texte : `Mes<br>références` se lit **« Mesréférences »**
 * pour une technologie d'assistance, et c'est ce que rendaient tous les titres du produit. On coupe
 * donc par le texte lui-même — un saut de ligne, rendu visible par `white-space: pre-line` — et non
 * par un élément vide. Le dessin est identique, le mot est rendu.
 */
export interface StackedTitleProps {
  /** Une entrée par ligne, dans l'ordre où le canevas les écrit. */
  lines: string[]
  /**
   * Mot entier, quand le canevas coupe AU MILIEU d'un mot avec un trait d'union
   * (« Biblio- / thèque », artboard 07). Le saut de ligne s'entend comme une espace : sans ce
   * secours, le titre se lirait « biblio, thèque ». À ne pas renseigner autrement — un titre coupé
   * entre deux mots se lit déjà correctement.
   */
  label?: string
  /** `h1` par défaut ; `h2` quand le titre n'est pas celui de l'écran. */
  as?: ElementType
  className?: string
}

export function StackedTitle({ lines, label, as: Tag = 'h1', className }: StackedTitleProps) {
  return (
    <Tag className={[styles.title, className].filter(Boolean).join(' ')} aria-label={label}>
      {lines.join('\n')}
    </Tag>
  )
}
