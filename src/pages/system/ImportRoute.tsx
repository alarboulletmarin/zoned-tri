import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { IMPORT_EXPORT_PATH } from '../tools/toolsRoutes'
import { ImportRefusedScreen } from './ImportRefusedScreen'
import { isImportRefusal, type ImportRefusal } from './importRefusal'
import type { ImportRedirectState } from './importRedirect'
import { useBackupImport } from './useBackupImport'

/**
 * Route `/import-export/import` — le porteur d'état de l'artboard 19.
 *
 * Le canevas ne dessine QUE le refus : il n'existe nulle part d'écran « choisir un fichier ». La
 * route n'affiche donc quelque chose que si un refus l'accompagne, et renvoie sinon à
 * `/import-export`, où la commande d'import vit désormais.
 *
 * La reprise depuis le refus passe par le MÊME parcours que le premier import — `useBackupImport` :
 * elle validait et écrivait d'un seul geste, sans jamais montrer ce que l'appareil allait perdre.
 * Un second fichier refusé remplace le refus affiché : l'état de navigation est donc relu à chaque
 * changement, et pas seulement au montage.
 */
export function ImportRoute() {
  const location = useLocation()
  const [refusal, setRefusal] = useState<ImportRefusal | null>(
    isImportRefusal(location.state) ? location.state : null,
  )

  useEffect(() => {
    if (isImportRefusal(location.state)) setRefusal(location.state)
  }, [location.state])

  const { input, sheet, open } = useBackupImport()

  // Sans refus à montrer — l'adresse rechargée, collée, ou reprise depuis l'historique — cette
  // route n'a rien : le canevas ne dessine pas d'écran « choisir un fichier ». On revient donc à
  // l'import-export, mais en le DISANT : le renvoi muet donnait l'impression que le clic sur
  // « Importer » avait échoué, alors qu'il n'y avait simplement plus de refus en mémoire.
  if (!refusal)
    return <Navigate to={IMPORT_EXPORT_PATH} replace state={{ importRefusalExpired: true } satisfies ImportRedirectState} />

  return (
    <>
      {input}
      {sheet}
      <ImportRefusedScreen refusal={refusal} onPickAnotherFile={open} />
    </>
  )
}
