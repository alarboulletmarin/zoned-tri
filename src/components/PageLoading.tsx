import { AppHeader } from './ui/AppHeader/AppHeader'
import { EmptyState } from './ui/EmptyState/EmptyState'
import { useDeferredVisibility } from '../hooks/useDeferredVisibility'
import type { TrailSegment } from '../navigation'
import styles from './PageLoading.module.css'

/**
 * Ce que l'application montre pendant qu'elle lit la base.
 *
 * Vingt endroits rendaient `null` : à trois cents millisecondes d'une navigation, la page ne
 * rendait littéralement RIEN — pas même le bandeau. La règle nº 1 du produit interdit le blanc
 * muet, et c'est justement au moment où l'utilisateur attend qu'il a le plus besoin de savoir où
 * il est.
 *
 * Le bandeau, lui, est là dès la première image : il ne dépend d'aucune donnée, il porte le
 * mot-symbole, le nom de la page et son fil, et il titre l'onglet. Seul le cadre pointillé attend
 * — au-delà de 300 ms, donc jamais sur une lecture rapide, qui est le cas courant.
 */
export type PageLoadingProps =
  | { variant: 'opening' }
  | { variant: 'root'; label: string }
  | { variant: 'detail'; trail: TrailSegment[]; counter?: string }

export function PageLoading(props: PageLoadingProps) {
  const visible = useDeferredVisibility()

  return (
    <div className={styles.screen}>
      {props.variant === 'opening' && <AppHeader variant="opening" />}
      {props.variant === 'root' && <AppHeader variant="root" label={props.label} />}
      {props.variant === 'detail' && (
        <AppHeader
          variant="detail"
          trail={props.trail}
          {...(props.counter ? { counter: props.counter } : {})}
          // Rien n'est encore chargé : le retour n'a pas de parent à rejoindre, et le bandeau
          // rendrait un carré qui ne fait rien. Il ne fait donc rien, explicitement.
          onBack={() => undefined}
        />
      )}

      {visible && (
        <div className={styles.body} role="status" aria-live="polite">
          <EmptyState
            className={styles.frame}
            sentence="lecture de ce qui est enregistré sur cet appareil…"
          />
        </div>
      )}
    </div>
  )
}
