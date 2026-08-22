import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Retour arrière qui ne fait jamais quitter l'application.
 *
 * `navigate(-1)` est le bon geste quand on est *arrivé* sur l'écran depuis un autre : il rend
 * exactement le chemin parcouru. Mais un écran du produit s'ouvre aussi par un lien partagé, un
 * favori, ou un rafraîchissement — et là il n'y a rien derrière : le carré de retour renvoie sur
 * l'onglet précédent du navigateur, c'est-à-dire hors de Zoned Tri. Un lien de séance envoyé à un
 * partenaire d'entraînement devenait ainsi un cul-de-sac, ce que la méthode interdit.
 *
 * `location.key === 'default'` est le marqueur de react-router pour « cette entrée est la première
 * de l'historique de l'application ». Dans ce cas seulement, on remonte au parent que le fil
 * d'Ariane annonce déjà — le retour et le fil disent alors la même chose, ce qui est le minimum
 * qu'on puisse attendre de deux commandes posées côte à côte.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  const { key } = useLocation()

  return useCallback(() => {
    if (key === 'default') navigate(fallback)
    else navigate(-1)
  }, [fallback, key, navigate])
}
