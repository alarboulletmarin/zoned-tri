import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { RailBlockProvider, useRailBlock } from '../context/RailBlockContext'
import { useDeviceHasContent } from '../context/AppDataContext'
import { ShellChromeProvider } from '../context/ShellChromeContext'
import {
  MENU_ACTIONS,
  OPENING_PATH,
  ROOT_SECTIONS,
  SETTINGS_ACTION,
  sectionForPath,
  showsPermanentNav,
} from '../navigation'
import { IS_DEMO_BUILD } from '../demoBuild'
import { BurgerIcon, SearchIcon } from './ui/AppHeader/AppHeader'
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

  // L'ouverture d'un appareil VIDE est une porte d'entrée, pas une section : le canevas est
  // explicite — « aucun rail, rien n'est encore ouvert » (S9) — et sa colonne sombre porte
  // elle-même le mot-symbole. Dès que l'appareil porte quelque chose (S9b), c'est un écran
  // d'accueil comme un autre, et il retrouve le rail. Voir `showsPermanentNav`.
  const deviceHasContent = useDeviceHasContent()
  const showRail = breakpoint === 'desktop' && showsPermanentNav(location.pathname, deviceHasContent)
  const activeSection = sectionForPath(location.pathname)
  const openMenu = useCallback(() => setMenuOpen(true), [])
  const openSearch = useCallback(() => setSearching(true), [])

  // Élargir la fenêtre pendant que le panneau est ouvert le faisait disparaître SANS le refermer :
  // le rétrécissement suivant le faisait donc réapparaître tout seul, sur un écran qu'on n'avait
  // pas demandé. Le rail prend le relais, l'état du panneau doit suivre.
  useEffect(() => {
    if (showRail) setMenuOpen(false)
  }, [showRail])

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
            {/* Le mot-symbole ramène à l'ouverture — l'écran qui dit ce que porte l'appareil. */}
            <Link to={OPENING_PATH} className={styles.railWordmark}>
              Zoned Tri
            </Link>
            {/* La recherche n'existait à AUCUNE largeur desktop : le bandeau S4/S5/S6 ne porte pas
                de loupe et le rail n'en avait pas. Un produit qui embarque 32 séances et douze
                calculateurs sans moyen de les chercher au-delà de 1024 px n'est pas explorable —
                elle prend donc place ici, à côté du mot-symbole, comme en mobile. */}
            <button
              type="button"
              className={styles.railSearch}
              aria-label="Rechercher"
              onClick={openSearch}
            >
              <SearchIcon />
            </button>
          </div>
          <div className={styles.railSectionLabel}>Sections</div>
          <div className={styles.railNav}>
            {ROOT_SECTIONS.map((section, index) => (
              /* `NavLink` n'allume que par préfixe d'URL : le rail s'éteignait donc entièrement
                 sur `/generate-plan`, `/plans`, `/import-export` et `/exports`, alors que trois
                 de ces quatre écrans appartiennent bien à une section. `sectionForPath` connaît
                 déjà ces rattachements — c'est lui qui décide, pas le préfixe. */
              /* `Link` et non `NavLink` : c'est `sectionForPath` qui décide de l'état actif, et
                 `NavLink` poserait son propre `aria-current` d'après son seul préfixe d'URL —
                 c'est-à-dire jamais sur `/generate-plan`. */
              <Link
                key={section.to}
                to={section.to}
                aria-current={activeSection?.to === section.to ? 'page' : undefined}
                className={`${styles.railLink} ${activeSection?.to === section.to ? styles.railLinkActive : ''}`}
              >
                <span className={styles.railIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.railLabel}>{section.label}</span>
              </Link>
            ))}
          </div>
          {/* Les trois destinations que seul le burger portait. Sans elles, générer un plan,
              retrouver ses plans archivés et importer une sauvegarde n'existaient qu'en dessous
              de 1024 px — c'est-à-dire nulle part, pour qui travaille sur un écran. */}
          <div className={styles.railSectionLabel}>Actions</div>
          <div className={styles.railNav}>
            {MENU_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                aria-current={location.pathname === action.to ? 'page' : undefined}
                className={`${styles.railLink} ${
                  location.pathname === action.to ? styles.railLinkActive : ''
                }`}
              >
                <span className={styles.railIndex} aria-hidden="true">
                  →
                </span>
                <span className={styles.railLabel}>{action.label}</span>
              </Link>
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

          {/* Le rail remplace le panneau burger en desktop : c'est donc lui qui doit porter la
              mention de démonstration, sans quoi elle ne serait visible qu'en mobile. */}
          {IS_DEMO_BUILD && <div className={styles.railDemoMark}>jeu de démonstration</div>}

          {/* Le canevas pose Réglages en pied de rail (S4) et en dernière action du panneau (S1) :
              même destination, deux placements — il ne peut donc pas vivre dans `MENU_ACTIONS`. */}
          <Link
            to={SETTINGS_ACTION.to}
            aria-current={location.pathname.startsWith(SETTINGS_ACTION.to) ? 'page' : undefined}
            className={`${styles.railFooter} ${
              location.pathname.startsWith(SETTINGS_ACTION.to) ? styles.railLinkActive : ''
            }`}
          >
            <span className={styles.railIndex}>≡</span>
            <span className={styles.railLabel}>{SETTINGS_ACTION.label}</span>
          </Link>
        </nav>
      )}

      {/* Repère principal : la coquille ne rendait qu'un `div`, si bien qu'aucun des dix-huit
          écrans n'avait de `main` — un lecteur d'écran n'avait aucun moyen de sauter la
          navigation pour atteindre le contenu. */}
      <main className={styles.main}>
        <ShellChromeProvider openMenu={openMenu} openSearch={openSearch}>
          {isSearching ? <SearchOverlay onClose={() => setSearching(false)} /> : <Outlet />}
        </ShellChromeProvider>
      </main>

      {/* `!showRail` : un menu ouvert en mobile puis élargi jusqu'au desktop se referme, le rail
          prenant le relais — le panneau d'encre ne doit jamais recouvrir la mise en page desktop. */}
      <BurgerMenu isOpen={isMenuOpen && !showRail} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
