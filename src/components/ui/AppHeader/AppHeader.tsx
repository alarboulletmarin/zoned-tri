import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useShellChrome } from '../../../context/shellChrome'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import {
  APP_NAME,
  OPENING_PATH,
  documentTitleFromTrail,
  trailDestination,
  trailLabel,
  type TrailSegment,
} from '../../../navigation'
import { BackSquare } from '../BackSquare/BackSquare'
import styles from './AppHeader.module.css'

/** Loupe de 18 px — rendue aussi dans l'en-tête du rail desktop (`AppShell`). */
export function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16" y2="16" />
    </svg>
  )
}

/** Trois filets de 20 px — dessiné aussi (décoratif) dans l'en-tête du rail desktop. */
export function BurgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

interface CommonProps {
  /**
   * Titre du bandeau desktop d'un écran RACINE (canevas S4/S5/S6 : 17 px, gras, capitales).
   * Les écrans non racines n'en prennent pas : leur titre desktop **est** leur fil d'Ariane, et
   * deux titres écrits à deux endroits finissent toujours par diverger.
   */
  desktopTitle?: string
  /** Commandes propres à l'écran, bandeau desktop uniquement (S5 : Filtres/Tri/.PDF ; S6 : .ICS). */
  desktopActions?: ReactNode
}

export interface AppHeaderRootProps extends CommonProps {
  variant: 'root'
  /** Libellé de section, Space Mono 12 px gras (canevas 02 « Plan », 07 « Séances »). */
  label: string
  /**
   * Mention d'état à gauche des commandes — le `todayLabel` de S4, « 3 séances restantes cette
   * semaine ». L'artboard ne la montre qu'à partir de la tablette : à 390 px elle prendrait la
   * place du mot-symbole, et le CSS la masque donc en dessous de 768 px.
   */
  rootActions?: ReactNode
}

export interface AppHeaderOpeningProps extends CommonProps {
  variant: 'opening'
}

export interface AppHeaderDetailProps extends CommonProps {
  variant: 'detail'
  /**
   * Segments du fil d'Ariane, du parent au courant (canevas 03 : `['Plan', 'Semaine']`). Chaque
   * segment autre que le dernier devient un lien dès qu'une destination lui est connue — par son
   * intitulé (`trailDestination`) ou explicitement, sous la forme `{ label, to }` quand la cible
   * dépend des données, comme la fiche d'une course.
   *
   * **Le dernier segment est le nom de la page.** Il n'y en a pas d'autre : il titre l'onglet du
   * navigateur, il titre le bandeau desktop, et c'est lui que l'utilisateur lit pour savoir où il
   * est. Écrire « Séance » là où la page montre « Transition course après vélo » revient à ne pas
   * nommer la page.
   */
  trail: TrailSegment[]
  onBack: () => void
  /** Intitulé accessible du bouton de retour (« Étape précédente » dans le générateur). */
  backLabel?: string
  /** Compteur mono aligné à droite du fil (canevas G1 : « 01 / 06 »). */
  counter?: string
}

export type AppHeaderProps = AppHeaderRootProps | AppHeaderOpeningProps | AppHeaderDetailProps

/**
 * Fil d'Ariane effectif d'un écran.
 *
 * Un écran racine a un fil d'un seul segment — sa section. Ce n'est pas une commodité de code :
 * c'est ce qui permet à *tout* écran du produit d'avoir un nom de page, et au titre d'onglet
 * d'exister partout. L'ouverture n'en a pas : elle n'est dans aucune section, elle est la porte.
 */
function resolveTrail(props: AppHeaderProps): TrailSegment[] {
  if (props.variant === 'root') return [props.label]
  if (props.variant === 'detail') return props.trail
  return []
}

/**
 * **Le** bandeau d'un écran — il n'y en a jamais deux.
 *
 * Il porte trois choses, et les porte à TOUTES les largeurs :
 *
 * 1. **Le mot-symbole**, qui est le logo du produit et son bouton d'accueil. Il manquait sur
 *    quinze écrans sur seize en mobile et en tablette : seule l'ouverture le montrait, si bien
 *    qu'une fois entré dans l'application, plus rien ne disait de quel produit il s'agissait ni
 *    comment revenir au point de départ. En desktop c'est le rail qui le porte (`AppShell`), et
 *    le bandeau ne le redouble donc pas.
 * 2. **Le nom de la page** — le dernier segment du fil, jamais un libellé écrit deux fois.
 * 3. **Le fil d'Ariane**, dès que la page a un parent, et **cliquable** : chaque segment mène à
 *    l'écran qu'il nomme. Il était jusqu'ici absent de toutes les largeurs desktop, où le bandeau
 *    aplatissait la hiérarchie en un titre inerte (« Plan · semaine ») : la profondeur était
 *    visible en mobile et perdue en grand écran, exactement à l'inverse de ce que la place permet.
 *
 * Les deux commandes globales (recherche, menu) restent à la coquille (`ShellChromeContext`) mais
 * s'affichent désormais sur tous les écrans mobiles, y compris les écrans profonds : une loupe qui
 * disparaît dès qu'on descend d'un niveau n'est pas une recherche globale.
 */
export function AppHeader(props: AppHeaderProps) {
  const breakpoint = useBreakpoint()
  const { openMenu, openSearch } = useShellChrome()
  const isDesktop = breakpoint === 'desktop'

  const trail = resolveTrail(props)
  const isDetail = props.variant === 'detail'
  const pageName = trail.length > 0 ? trailLabel(trail[trail.length - 1]) : APP_NAME

  useDocumentTitle(trail)

  if (isDesktop) {
    // Le rail porte déjà le mot-symbole et les commandes globales : le bandeau desktop n'a que la
    // hiérarchie à dire, et la largeur pour la dire en entier.
    return (
      <header className={styles.desktopBar}>
        <span className={styles.desktopLeft}>
          {isDetail && <BackSquare onClick={props.onBack} label={props.backLabel ?? 'Retour'} />}
          {isDetail ? (
            <Trail segments={trail} className={styles.desktopTrail} />
          ) : (
            <span className={styles.desktopTitle}>{props.desktopTitle ?? pageName}</span>
          )}
        </span>
        <span className={styles.desktopRight}>
          {props.variant === 'detail' && props.counter && (
            <span className={styles.counter}>{props.counter}</span>
          )}
          {props.desktopActions && <span className={styles.desktopActions}>{props.desktopActions}</span>}
        </span>
      </header>
    )
  }

  // Le fil ne prend sa propre ligne que sur un écran de détail : sur un écran racine, la section
  // est déjà écrite à côté du mot-symbole, et une deuxième ligne qui la répéterait volerait 30 px
  // à l'affiche pour ne rien apprendre.
  const showTrailBar = isDetail

  return (
    <header className={styles.chrome}>
      <div className={styles.brandBar}>
        <span className={styles.brandLeft}>
          {isDetail && <BackSquare onClick={props.onBack} label={props.backLabel ?? 'Retour'} />}
          <Link to={OPENING_PATH} className={styles.wordmark}>
            {APP_NAME}
          </Link>
          {props.variant === 'root' && (
            <>
              <span className={styles.brandSeparator} aria-hidden="true">
                ·
              </span>
              <span className={styles.sectionLabel}>{props.label}</span>
            </>
          )}
        </span>
        <span className={styles.actions}>
          {props.variant === 'root' && props.rootActions && (
            <span className={styles.rootActions}>{props.rootActions}</span>
          )}
          <button type="button" className={styles.iconButton} aria-label="Rechercher" onClick={openSearch}>
            <SearchIcon />
          </button>
          <button type="button" className={styles.iconButton} aria-label="Menu" onClick={openMenu}>
            <BurgerIcon />
          </button>
        </span>
      </div>

      {showTrailBar && (
        <div className={styles.trailBar}>
          <Trail segments={trail} className={styles.trail} />
          {props.variant === 'detail' && props.counter && (
            <span className={styles.counter}>{props.counter}</span>
          )}
        </div>
      )}
    </header>
  )
}

/**
 * Le fil lui-même, identique aux trois largeurs : les parents sont des liens, le courant est en
 * gras et n'en est pas un — on ne met pas un lien vers la page qu'on regarde.
 *
 * `aria-current="page"` sur le dernier segment : c'est ce qui fait de ce fil une navigation
 * lisible au lecteur d'écran, et non une suite de mots séparés par des barres obliques.
 */
function Trail({ segments, className }: { segments: TrailSegment[]; className: string }) {
  return (
    <nav className={className} aria-label="Fil d'Ariane">
      <ol className={styles.trailList}>
        {segments.map((segment, index) => {
          const label = trailLabel(segment)
          const isLast = index === segments.length - 1
          const to = isLast ? undefined : trailDestination(segment)

          return (
            <li key={`${label}-${index}`} className={isLast ? styles.trailCurrent : styles.trailMuted}>
              {to ? (
                <Link className={styles.trailLink} to={to}>
                  {label}
                </Link>
              ) : (
                <span {...(isLast ? { 'aria-current': 'page' as const } : {})}>{label}</span>
              )}
              {!isLast && (
                <span className={styles.trailSeparator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Titre de l'onglet. Il vient du fil et de lui seul : un écran qui nomme sa page nomme son onglet,
 * sans avoir à l'écrire une deuxième fois.
 */
function useDocumentTitle(trail: TrailSegment[]) {
  const title = documentTitleFromTrail(trail)
  useEffect(() => {
    document.title = title
  }, [title])
}
