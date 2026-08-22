import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { usePlans, useRaces } from '../context/AppDataContext'
import { buildMenuCounts } from '../domain/menuCounts'
import { todayIso } from '../domain/planWeek'
import { ROOT_SECTIONS } from '../navigation'
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

  return (
    <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label="Menu">
      <div className={styles.header}>
        <span className={styles.wordmark}>Zoned Tri</span>
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
              <Link to={section.to} className={styles.sectionLink} onClick={onClose}>
                <span className={styles.sectionLabel}>{section.label}</span>
                <span className={styles.sectionCount}>{counts[section.to]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.actions}>
        <Link to="/generate-plan" className={`${styles.action} ${styles.actionFeatured}`} onClick={onClose}>
          Générer un plan
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/import-export" className={styles.action} onClick={onClose}>
          Import / export
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/settings" className={styles.action} onClick={onClose}>
          Réglages
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={styles.future}>
        <div className={styles.futureLabel}>Ce qui n'existe pas encore</div>
        <div className={styles.futureRow} aria-disabled="true">
          <span className={styles.futureItem}>Méthodologie</span>
          <span className={styles.futureNote}>bientôt</span>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.langLabel}>Langue</span>
        {/* Une seule langue existe : « EN » est désactivé plutôt que faussement cliquable. */}
        <button type="button" className={`${styles.lang} ${styles.langActive}`} aria-pressed="true">
          FR
        </button>
        <button type="button" className={styles.lang} aria-pressed="false" disabled>
          EN
        </button>
        <span className={styles.version}>v {APP_VERSION} · hors ligne</span>
      </div>
    </div>
  )
}
