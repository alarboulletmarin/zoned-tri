import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useShellChrome } from '../../../context/shellChrome'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { trailDestination, trailLabel, type TrailSegment } from '../../../navigation'
import { BackSquare } from '../BackSquare/BackSquare'
import styles from './AppHeader.module.css'

function SearchIcon() {
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
   * Titre du bandeau desktop (canevas S4/S5/S6 : 17 px, gras, capitales, `letter-spacing:-.03em`).
   * Par défaut le libellé mobile, ou le dernier segment du fil d'Ariane.
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
 * **Le** bandeau d'un écran — il n'y en a jamais deux. Le canevas ouvre chaque artboard mobile par
 * une barre unique de 46 px filetée de 2 px d'encre (01, 02, 03, 05, 07, G1), et chaque artboard
 * desktop par une barre unique de 52 px à droite du rail (S4, S5, S6). C'est donc l'écran qui rend
 * son bandeau, pas la coquille : le contenu varie d'un artboard à l'autre, la coquille ne peut pas
 * le deviner. Elle ne fournit que les deux commandes globales via `ShellChromeContext`.
 *
 * Écart assumé : le canevas ne donne pas d'artboard desktop aux écrans non racines (Semaine mobile
 * 03, Séance 05, Générateur G1→G6). Le carré de retour y est conservé sur desktop — le retirer
 * priverait le générateur de son seul retour d'étape, ce que la méthode interdit (pas de cul-de-sac).
 */
export function AppHeader(props: AppHeaderProps) {
  const breakpoint = useBreakpoint()
  const { openMenu, openSearch } = useShellChrome()
  const isDesktop = breakpoint === 'desktop'

  const title =
    props.desktopTitle ??
    (props.variant === 'root'
      ? props.label
      : props.variant === 'detail'
        ? (props.trail.length > 0 ? trailLabel(props.trail[props.trail.length - 1]) : '')
        : 'Zoned Tri')

  if (isDesktop) {
    return (
      <header className={styles.desktopBar}>
        <span className={styles.desktopLeft}>
          {props.variant === 'detail' && (
            <BackSquare onClick={props.onBack} label={props.backLabel ?? 'Retour'} />
          )}
          <span className={styles.desktopTitle}>{title}</span>
        </span>
        {props.desktopActions && <span className={styles.desktopActions}>{props.desktopActions}</span>}
      </header>
    )
  }

  if (props.variant === 'detail') {
    return (
      <header className={styles.detailBar}>
        <span className={styles.detailLeft}>
          <BackSquare onClick={props.onBack} label={props.backLabel ?? 'Retour'} />
          <span className={styles.trail}>
            {props.trail.map((segment, index) => {
              const label = trailLabel(segment)
              if (index === props.trail.length - 1) {
                return (
                  <span key={label} className={styles.trailCurrent}>
                    {label}
                  </span>
                )
              }
              const to = trailDestination(segment)
              return (
                <span key={label} className={styles.trailMuted}>
                  {to ? (
                    <Link className={styles.trailLink} to={to}>
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                  {' / '}
                </span>
              )
            })}
          </span>
        </span>
        {props.counter && <span className={styles.counter}>{props.counter}</span>}
        <button type="button" className={styles.iconButton} aria-label="Menu" onClick={openMenu}>
          <BurgerIcon />
        </button>
      </header>
    )
  }

  return (
    <header className={styles.rootBar}>
      {props.variant === 'opening' ? (
        <span className={styles.wordmark}>Zoned Tri</span>
      ) : (
        <span className={styles.sectionLabel}>{props.label}</span>
      )}
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
    </header>
  )
}
