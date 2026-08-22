import { useCallback, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { RailBlockProvider, useRailBlock } from '../context/RailBlockContext'
import { ShellChromeProvider } from '../context/ShellChromeContext'
import { OPENING_PATH, ROOT_SECTIONS } from '../navigation'
import { BurgerIcon } from './ui/AppHeader/AppHeader'
import { ProgressBar } from './ui/ProgressBar/ProgressBar'
import { BurgerMenu } from './BurgerMenu'
import { SearchOverlay } from '../pages/workouts/SearchOverlay'
import styles from './AppShell.module.css'
import { NoteBox } from './ui/NoteBox/NoteBox'

/**
 * Coquille responsive (écrans S4/S5/S6 du canevas) : mobile ET tablette = colonne unique, burger
 * seule navigation ; desktop = rail 236 px numéroté, burger remplacé par le rail.
 *
 * La coquille ne rend AUCUN bandeau : le canevas ouvre chaque artboard par le sien, dont le contenu
 * dépend de l'écran (libellé de section, fil d'Ariane, commandes propres). Chaque écran rend donc
 * exactement un `<AppHeader>`, et la coquille ne lui fournit que les deux commandes globales
 * (`ShellChromeContext`) et l'accueil de son bloc de rail (`RailBlockContext`).
 */
export function AppShell() {
  return (
    <RailBlockProvider>
      <AppShellLayout />
    </RailBlockProvider>
  )
}

function AppShellLayout() {
  const breakpoint = useBreakpoint()
  const railBlock = useRailBlock()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [isSearching, setSearching] = useState(false)
  const location = useLocation()

  // L'ouverture est une porte d'entrée, pas une section : sur desktop le canevas est explicite
  // — « aucun rail, rien n'est encore ouvert » (S9) — et sa colonne sombre porte elle-même le
  // mot-symbole. La coquille s'y efface entièrement. Voir `OPENING_PATH` dans src/navigation.ts.
  const showRail = breakpoint === 'desktop' && location.pathname !== OPENING_PATH
  const openMenu = useCallback(() => setMenuOpen(true), [])
  const openSearch = useCallback(() => setSearching(true), [])

  return (
    <div className={styles.shell}>
      {showRail && (
        <nav className={styles.rail} aria-label="Navigation principale">
          <div className={styles.railHeader}>
            {/* Le canevas dessine bien le burger dans l'en-tête du rail (S4 l. 1543, S5 l. 1667) :
                purement graphique, le rail EST déjà la navigation qu'il ouvrirait. */}
            <span className={styles.railBurger} aria-hidden="true">
              <BurgerIcon />
            </span>
            {/* Le mot-symbole est la seule sortie de secours du rail : il ramène à l'ouverture,
                d'où l'on rejoint « Mes plans », la génération et le bilan de course. */}
            <NavLink to={OPENING_PATH} className={styles.railWordmark}>
              Zoned Tri
            </NavLink>
          </div>
          <div className={styles.railSectionLabel}>Sections</div>
          <div className={styles.railNav}>
            {ROOT_SECTIONS.map((section, index) => (
              <NavLink
                key={section.to}
                to={section.to}
                className={({ isActive }) => `${styles.railLink} ${isActive ? styles.railLinkActive : ''}`}
              >
                <span className={styles.railIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.railLabel}>{section.label}</span>
              </NavLink>
            ))}
          </div>
          {railBlock && (
            <div className={styles.railBlock}>
              <div className={styles.railBlockTitle}>{railBlock.title}</div>
              {/* Canevas S4 l. 1558 : barre de 8 px sous l'intitulé du bloc, 39 % d'encre. */}
              {railBlock.percent !== undefined && (
                <ProgressBar
                  className={styles.railProgress}
                  percent={railBlock.percent}
                  height={8}
                  label="Avancement du plan"
                />
              )}
              <div className={styles.railBlockLines}>
                {railBlock.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          )}
          {railBlock?.note && <NoteBox className={styles.railNote}>{railBlock.note}</NoteBox>}

          <NavLink
            to="/settings"
            className={({ isActive }) => `${styles.railFooter} ${isActive ? styles.railLinkActive : ''}`}
          >
            <span className={styles.railIndex}>≡</span>
            <span className={styles.railLabel}>Réglages</span>
          </NavLink>
        </nav>
      )}

      <div className={styles.main}>
        <ShellChromeProvider openMenu={openMenu} openSearch={openSearch}>
          {isSearching ? <SearchOverlay onClose={() => setSearching(false)} /> : <Outlet />}
        </ShellChromeProvider>
      </div>

      {/* `!showRail` : un menu ouvert en mobile puis élargi jusqu'au desktop se referme, le rail
          prenant le relais — le panneau d'encre ne doit jamais recouvrir la mise en page desktop. */}
      <BurgerMenu isOpen={isMenuOpen && !showRail} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
