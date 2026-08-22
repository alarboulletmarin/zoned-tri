import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from './ui/AppHeader/AppHeader'
import { EmptyState } from './ui/EmptyState/EmptyState'
import { StackedTitle } from './ui/StackedTitle/StackedTitle'
import { trailLabel, type TrailSegment } from '../navigation'
import styles from './MissingScreen.module.css'

/**
 * L'écran demandé quand il n'a rien à montrer.
 *
 * Huit routes renvoyaient l'utilisateur ailleurs par un `<Navigate replace />` silencieux : cliquer
 * « Plan » dans le rail sans plan actif le ramenait à l'accueil, sans un mot. Il ne pouvait qu'en
 * conclure que son clic n'avait pas marché — et l'application perdait, à cet instant précis, la
 * seule occasion de dire ce qui manque et comment y remédier.
 *
 * L'écran demandé s'ouvre donc, vide, avec son bandeau, son fil, son nom — et les commandes qui
 * résolvent le problème. C'est la règle nº 1 appliquée à une route entière : un vide se nomme.
 * Et la règle nº 5 : jamais un cul-de-sac, donc au moins une sortie, toujours.
 */
export interface MissingScreenExit {
  label: string
  to: string
  /** La sortie qui résout le manque. Une seule par écran ; les autres sont secondaires. */
  primary?: boolean
}

export interface MissingScreenProps {
  /** Fil de l'écran qu'on a demandé : on ne renomme pas la page parce qu'elle est vide. */
  trail: TrailSegment[]
  /** Titre d'affiche, coupé à la main comme tous les titres du produit. */
  headline: string[]
  sentence: ReactNode
  /** Au moins une, sinon l'écran serait le cul-de-sac qu'il remplace. */
  exits: MissingScreenExit[]
  /** Où mène la flèche de retour du bandeau, quand le fil a plus d'un segment. */
  backTo?: string
}

export function MissingScreen({ trail, headline, sentence, exits, backTo }: MissingScreenProps) {
  const navigate = useNavigate()
  const fallback = backTo ?? exits[0]?.to ?? '/'

  return (
    <div className={styles.screen}>
      {trail.length === 1 ? (
        <AppHeader variant="root" label={trailLabel(trail[0])} />
      ) : (
        <AppHeader variant="detail" trail={trail} onBack={() => navigate(fallback)} />
      )}

      <div className={styles.column}>
        <StackedTitle className={styles.title} lines={headline} />

        <EmptyState className={styles.frame} sentence={sentence} />

        <div className={styles.actions}>
          {exits.map((exit) => (
            <Link
              key={`${exit.label}-${exit.to}`}
              to={exit.to}
              className={exit.primary ? styles.primary : styles.secondary}
            >
              {exit.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
