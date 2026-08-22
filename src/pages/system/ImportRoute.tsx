import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { IMPORT_EXPORT_PATH } from '../tools/toolsRoutes'
import { ImportRefusedScreen } from './ImportRefusedScreen'
import { isImportRefusal, type ImportRefusal } from './importRefusal'
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

  if (!refusal) return <Navigate to={IMPORT_EXPORT_PATH} replace />

  return (
    <>
      {input}
      {sheet}
      <ImportRefusedScreen refusal={refusal} onPickAnotherFile={open} />
    </>
  )
}
