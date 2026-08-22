import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { importBackup } from '../../storage/backup'
import { IMPORT_EXPORT_PATH } from '../tools/toolsRoutes'
import { ImportRefusedScreen } from './ImportRefusedScreen'
import { isImportRefusal, parseFailure, type ImportRefusal } from './importRefusal'
import { useFilePicker } from './useFilePicker'

/**
 * Route `/import-export/import` — le porteur d'état de l'artboard 19.
 *
 * Le canevas ne dessine QUE le refus : il n'existe nulle part d'écran « choisir un fichier »
 * (voir le rapport de reprise). La route n'affiche donc quelque chose que si un refus l'accompagne,
 * et renvoie sinon à `/import-export` plutôt que d'inventer un état que personne n'a dessiné.
 *
 * La commande d'import, elle, est bien branchée : « Choisir un autre fichier » ouvre le sélecteur
 * natif et rejoue `importBackup`, qui reste tout-ou-rien. Succès = la base a entièrement changé
 * sous les pieds du contexte de données : on repart de l'ouverture, seule façon honnête de
 * recharger tout ce qui était en mémoire.
 */
export function ImportRoute() {
  const location = useLocation()
  const [refusal, setRefusal] = useState<ImportRefusal | null>(
    isImportRefusal(location.state) ? location.state : null,
  )

  async function readFile(file: File) {
    const text = await file.text()

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (cause) {
      setRefusal({ fileName: file.name, fileSizeBytes: file.size, errors: [parseFailure(cause)] })
      return
    }

    const result = await importBackup(parsed)
    if (result.ok) {
      window.location.replace('/')
      return
    }
    setRefusal({ fileName: file.name, fileSizeBytes: file.size, errors: result.errors })
  }

  const { input, open } = useFilePicker((file) => void readFile(file))

  if (!refusal) return <Navigate to={IMPORT_EXPORT_PATH} replace />

  return (
    <>
      {input}
      <ImportRefusedScreen refusal={refusal} onPickAnotherFile={open} />
    </>
  )
}
