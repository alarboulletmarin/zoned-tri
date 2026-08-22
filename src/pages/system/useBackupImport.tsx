import { useCallback, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet/ConfirmSheet'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { useJournal, usePlans, useRaces, useWorkouts } from '../../context/AppDataContext'
import type { BackupFile } from '../../domain/types'
import { exportBackup, importBackup } from '../../storage/backup'
import { validateBackupFile } from '../../storage/validation'
import { downloadText } from '../exports/download'
import { IMPORT_PATH } from './systemRoutes'
import { parseFailure } from './importRefusal'
import { useFilePicker } from './useFilePicker'

/**
 * Le parcours d'import complet — de la commande jusqu'à l'écriture, en passant par ce qu'elle coûte.
 *
 * Il n'existait pas. `ImportRoute` savait rejouer un import depuis un refus, mais aucun écran ne
 * pouvait en déclencher un premier : importer une sauvegarde était donc impossible depuis
 * l'interface, alors que `importBackup` est écrit, testé et tout-ou-rien depuis toujours.
 *
 * Le hook porte aussi ce que `importBackup` seul ne pouvait pas porter : la règle nº 2. Un import
 * remplace la base ENTIÈRE — plans, séances, courses, journal, profil. `importBackup` validait et
 * écrivait d'un seul geste, ce qui ne laissait aucun moment pour montrer l'effet. La validation
 * passe donc devant (`validateBackupFile`, le même contrôle, appelé une fois de plus sans risque
 * puisque `importBackup` le refait), et la feuille compare l'avant et l'après avant d'écrire.
 *
 * Une chose qu'on ne fera PAS : poser un bandeau d'annulation de 6 s. Après l'écriture, la base
 * d'avant n'existe plus — un « Annuler » mentirait. La feuille le dit, et propose à la place la
 * seule contrepartie honnête : exporter d'abord.
 */
export interface BackupImport {
  /** Le sélecteur de fichier natif, caché. À rendre quelque part dans l'écran appelant. */
  input: ReactElement
  /** La feuille avant/après, ou `null` tant qu'aucun fichier valide n'attend d'être écrit. */
  sheet: ReactElement | null
  /** Ouvre le sélecteur. */
  open: () => void
}

export interface BackupImportOptions {
  /**
   * Ce qu'on fait une fois la base remplacée. Par défaut on recharge l'application depuis la
   * racine : tout ce qui était en mémoire vient de disparaître, et c'est la seule façon honnête de
   * repartir. Les tests injectent leur propre suite — jsdom ne recharge rien.
   */
  onImported?: () => void
}

interface PendingImport {
  fileName: string
  data: BackupFile
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`
}

export function useBackupImport({ onImported }: BackupImportOptions = {}): BackupImport {
  const navigate = useNavigate()
  const { plans } = usePlans()
  const { workouts } = useWorkouts()
  const { races } = useRaces()
  const { journal } = useJournal()

  const [pending, setPending] = useState<PendingImport | null>(null)
  const [exported, setExported] = useState(false)

  const readFile = useCallback(
    async (file: File) => {
      const text = await file.text()

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (cause) {
        // Un fichier illisible n'a rien à confirmer : c'est un refus, et l'artboard 19 sait le dire.
        navigate(IMPORT_PATH, {
          state: { fileName: file.name, fileSizeBytes: file.size, errors: [parseFailure(cause)] },
        })
        return
      }

      const result = validateBackupFile(parsed)
      if (!result.ok) {
        navigate(IMPORT_PATH, {
          state: { fileName: file.name, fileSizeBytes: file.size, errors: result.errors },
        })
        return
      }

      setExported(false)
      setPending({ fileName: file.name, data: result.data })
    },
    [navigate],
  )

  const { input, open } = useFilePicker((file) => void readFile(file))

  const confirm = useCallback(async () => {
    if (!pending) return
    const result = await importBackup(pending.data)
    setPending(null)
    // `importBackup` revalide : un échec ici veut dire que le fichier a changé entre-temps, ce qui
    // n'arrive pas dans un même geste. On ne l'ignore pas pour autant — l'écran de refus le dira.
    if (!result.ok) {
      navigate(IMPORT_PATH, {
        state: { fileName: pending.fileName, fileSizeBytes: 0, errors: result.errors },
      })
      return
    }
    if (onImported) onImported()
    else window.location.replace('/')
  }, [navigate, onImported, pending])

  const exportFirst = useCallback(async () => {
    const backup = await exportBackup()
    downloadText('zoned-tri-sauvegarde.json', JSON.stringify(backup, null, 2), 'application/json')
    setExported(true)
  }, [])

  const sheet = pending ? (
    <ConfirmSheet
      isOpen
      title="Remplacer les données de cet appareil ?"
      effect={
        <>
          <p>
            « {pending.fileName} » remplace <strong>tout</strong> ce qui est écrit ici. Il n’y a pas
            de compte : rien n’est copié ailleurs, et il n’y aura pas de retour en arrière.
          </p>
          <ul>
            <li>
              Plans : {countLabel(plans.length, 'plan', 'plans')} →{' '}
              {countLabel(pending.data.plans.length, 'plan', 'plans')}
            </li>
            <li>
              Séances enregistrées : {workouts.length} → {pending.data.workoutsDone.length}
            </li>
            <li>
              Courses : {races.length} → {pending.data.races.length}
            </li>
            <li>
              Journal : {countLabel(journal.length, 'entrée', 'entrées')} →{' '}
              {countLabel(pending.data.journal.length, 'entrée', 'entrées')}
            </li>
          </ul>
          {exported && <p>Sauvegarde écrite sur l’appareil. Tu peux remplacer sans rien perdre.</p>}
        </>
      }
      confirmLabel="Remplacer"
      onConfirm={() => void confirm()}
      onCancel={() => setPending(null)}
      cancelLabel="Garder mes données"
      alternatives={
        <SecondaryAction onClick={() => void exportFirst()}>Exporter d’abord</SecondaryAction>
      }
    />
  ) : null

  return { input, sheet, open }
}
