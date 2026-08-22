import { useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { usePlans, useRaces } from '../context/AppDataContext'
import { buildMenuCounts } from '../domain/menuCounts'
import { todayIso } from '../domain/planWeek'
import { MENU_ACTIONS, OPENING_PATH, ROOT_SECTIONS, SETTINGS_ACTION, sectionForPath } from '../navigation'
import { IS_DEMO_BUILD } from '../demoBuild'
import styles from './BurgerMenu.module.css'
import { APP_VERSION } from '../domain/types'

export interface BurgerMenuProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Écran S1 « Menu (burger ouvert) » : seule navigation du produit en mobile et tablette,
 * panneau d'encre pleine page. Le desktop ne l'ouvre jamais — le rail latéral le remplace.
 */
export function BurgerMenu({ isOpen, onClose }: BurgerMenuProps) {
  // Le panneau est un composant à part : fermé, il ne lit ni la base ni le focus.
  if (!isOpen) return null
  return <BurgerMenuPanel onClose={onClose} />
}

interface BurgerMenuPanelProps {
  onClose: () => void
}

function BurgerMenuPanel({ onClose }: BurgerMenuPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, true, onClose)

  const { plans } = usePlans()
  const { races } = useRaces()
  const counts = useMemo(() => buildMenuCounts({ plans, races, today: todayIso() }), [plans, races])

  // Le panneau est la SEULE navigation en mobile et en tablette, et il ne disait pas d'où on
  // l'ouvrait : quatre sections identiques, aucune marque de position. Le rail desktop, lui, allume
  // la sienne depuis toujours (aplat d'encre, libellé lime) — les deux navigations doivent dire la
  // même chose.
  const { pathname } = useLocation()
  const activeSection = sectionForPath(pathname)

  return (
    <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label="Menu">
      <div className={styles.header}>
        {/* En mobile, le panneau est le seul endroit où le mot-symbole reste visible hors de
            l'ouverture : c'est donc lui qui doit y ramener. */}
        <Link to={OPENING_PATH} className={styles.wordmark} onClick={onClose}>
          Zoned Tri
        </Link>
        <button type="button" className={styles.closeButton} aria-label="Fermer le menu" onClick={onClose}>
          <span className={styles.closeGlyph} aria-hidden="true">
            <span className={styles.closeBar} />
            <span className={styles.closeBar} />
          </span>
        </button>
      </div>

      <nav className={styles.sections} aria-label="Sections">
        <ul className={styles.sectionList}>
          {ROOT_SECTIONS.map((section) => (
            <li key={section.to}>
              <Link
                to={section.to}
                className={`${styles.sectionLink} ${
                  activeSection?.to === section.to ? styles.sectionLinkActive : ''
                }`}
                aria-current={activeSection?.to === section.to ? 'page' : undefined}
                onClick={onClose}
              >
                <span className={styles.sectionLabel}>{section.label}</span>
                <span className={styles.sectionCount}>{counts[section.to]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* La même liste que le rail desktop, dans le même ordre — la génération en avant, comme
          le canevas S1 la met en aplat lime. Réglages ferme la marche : le rail le met en pied. */}
      <div className={styles.actions}>
        {[...MENU_ACTIONS, SETTINGS_ACTION].map((action, index) => (
          <Link
            key={action.to}
            to={action.to}
            className={`${styles.action} ${index === 0 ? styles.actionFeatured : ''}`}
            onClick={onClose}
          >
            {action.label}
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>

      {/* Le pied portait une paire FR / EN dont l'anglais était désactivé, alors que l'écran S3
          (« Réglages / Langue ») fait déjà ce choix — et le fait mieux, avec la couverture réelle
          de la traduction. Deux surfaces pour un même réglage, dont une inerte : celle-ci part. */}
      <div className={styles.footer}>
        {/* La build de démonstration le dit : on ne présente jamais un plan amorcé comme un vrai. */}
        <span className={styles.version}>
          v {APP_VERSION} · hors ligne{IS_DEMO_BUILD && ' · démonstration'}
        </span>
      </div>
    </div>
  )
}
