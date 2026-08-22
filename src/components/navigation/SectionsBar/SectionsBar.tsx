import { Link, useLocation } from 'react-router-dom'
import { ROOT_SECTIONS, sectionForPath } from '../../../navigation'
import styles from './SectionsBar.module.css'

/**
 * Les quatre sections, en permanence, sur les largeurs tablette.
 *
 * Le canevas dessine deux navigations : le burger (mobile) et le rail de 236 px (desktop). Entre
 * les deux — 768 à 1023 px, l'iPad en portrait, le tiers d'écran d'un portable — le produit
 * appliquait la règle mobile : un panneau à ouvrir, un écran à choisir, un panneau à fermer, pour
 * chaque changement de section. C'est exactement ce que la règle nº 3 interdit dans l'autre sens
 * (« le desktop n'est pas un mobile étiré ») : une tablette n'est pas un mobile large.
 *
 * Elle a la place d'une rangée, pas d'une colonne : les quatre sections tiennent sur une ligne de
 * 38 px sous la barre de marque, et le burger reste là pour le reste (générer, mes plans,
 * import-export, réglages). La section courante est marquée comme dans le rail, par
 * `sectionForPath` — pas par un préfixe d'URL, qui manquerait `/generate-plan`.
 */
export function SectionsBar() {
  const location = useLocation()
  const active = sectionForPath(location.pathname)

  return (
    <nav className={styles.bar} aria-label="Sections">
      {ROOT_SECTIONS.map((section, index) => {
        const isActive = active?.to === section.to
        return (
          <Link
            key={section.to}
            to={section.to}
            className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.index} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
