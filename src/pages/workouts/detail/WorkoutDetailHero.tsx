import type { Zone } from '../../../domain/types'
import type { DisciplineCode } from '../../../components/ui/Badge/Badge'
import { DisciplineTag, ZoneTag } from '../../../components/ui/Badge/Badge'
import { StackedTitle } from '../../../components/ui/StackedTitle/StackedTitle'
import { zoneToNumber } from '../../../domain/workoutFormat'
import type { DetailLayout } from './detailProps'
import styles from './WorkoutDetailHero.module.css'

export interface WorkoutDetailHeroProps {
  discipline: DisciplineCode
  zone: Zone | null
  /**
   * Ligne de contexte à droite des pastilles. Les trois artboards y écrivent la ZONE NOMMÉE puis
   * le lieu — « Seuil · bassin 25 m » (05), « Seuil · home-trainer » (28), « Seuil · piste ou
   * plat » (29) — et non le lieu seul. `sessionContextLabel` la compose déjà pour l'écran
   * Aujourd'hui : les fiches l'appellent, elles n'en écrivent pas une seconde.
   */
  subtitle: string
  title: string
  titleSize: 'swim' | 'bike' | 'run'
  stripColorVar: string
  layout?: DetailLayout
  /** Ligne de méta mono du panneau de S5 (« 2 400 m · 55 min · 1:34/100 ») — colonne large. */
  meta?: string
}

/**
 * En-tête des fiches de séance : pastilles, titre, bandeau de discipline.
 * Canevas 05 l. 567-575, 28 l. 3059-3067, 29 l. 3120-3128, panneau de S5 l. 1742-1746.
 *
 * Les pastilles sont le gabarit `md` du canevas — Space Mono 11 px gras, `padding:3px 7px`, texte en
 * encre — et non le carré de 28 px des lignes de liste.
 *
 * Le titre est le `h1` de l'écran (le fil d'Ariane du bandeau n'est pas un titre) et passe par
 * `StackedTitle` : le canevas le coupe à la main avec un `<br>`, qui n'apporte aucune espace au
 * texte rendu (méthode §5 bis). Nos titres viennent des données et tiennent sur une ligne logique ;
 * `StackedTitle` garantit que le jour où l'un d'eux portera une coupure, elle sera une vraie espace.
 */
export function WorkoutDetailHero({
  discipline,
  zone,
  subtitle,
  title,
  titleSize,
  stripColorVar,
  layout = 'compact',
  meta,
}: WorkoutDetailHeroProps) {
  const wide = layout === 'wide'

  return (
    <>
      <div className={`${styles.headerBlock} ${wide ? styles.headerWide : styles[`header_${titleSize}`]}`}>
        <div className={styles.badgeRow}>
          <DisciplineTag discipline={discipline} size="md" />
          {zone && <ZoneTag zone={zoneToNumber(zone)} size="md" />}
          <span className={`${styles.subtitle} ${wide ? styles.subtitleWide : ''}`}>{subtitle}</span>
        </div>
        <StackedTitle
          className={`${styles.title} ${wide ? styles.titleWide : styles[titleSize]}`}
          lines={title.split('\n')}
        />
        {wide && meta && <div className={styles.meta}>{meta}</div>}
      </div>
      {/* Le panneau de S5 n'a pas de bandeau de discipline : sa fiche commence au titre. */}
      {!wide && <div className={styles.strip} style={{ background: stripColorVar }} />}
    </>
  )
}
