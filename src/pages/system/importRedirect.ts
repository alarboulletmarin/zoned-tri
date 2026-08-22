/**
 * Ce que `/import-export/import` dépose en revenant, quand il n'a plus de refus à montrer.
 *
 * L'écran du refus ne vit que par l'état de navigation : recharger la page, revenir dessus par
 * l'historique ou coller l'adresse le vide. Le renvoi vers `/import-export` était alors muet — et
 * du point de vue de l'utilisateur, indistinguable d'un clic qui n'a pas marché. Il porte donc un
 * drapeau, et l'écran d'arrivée dit ce qui s'est passé.
 */
export interface ImportRedirectState {
  importRefusalExpired: true
}

export function isImportRedirectState(value: unknown): value is ImportRedirectState {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { importRefusalExpired?: unknown }).importRefusalExpired === true
  )
}
