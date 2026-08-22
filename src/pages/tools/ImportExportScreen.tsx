import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePlans } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import { exportBackup } from '../../storage/backup'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { useBackupImport } from '../system/useBackupImport'
import { ENGINE_SOURCES, EXPORT_ROWS, type SourceMark } from './engineSources'
import { TOOLS_PATH } from './toolsRoutes'
import styles from './ImportExportScreen.module.css'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { InertNote } from '../../components/ui/InertNote/InertNote'
import { exportSheetPath } from '../exports/exportsRoutes'
import { isImportRedirectState } from '../system/importRedirect'

const MARK_CLASS: Record<SourceMark, string> = {
  solid: styles.markSolid,
  outline: styles.markOutline,
  hatch: styles.markHatch,
}

/** Séances datées portées par le plan actif — le « 77 séances datées » de l'artboard 14. */
function datedSessionCount(weeks: { days: { workoutIds: string[] }[] }[]): number {
  return weeks.reduce(
    (total, week) => total + week.days.reduce((sum, day) => sum + day.workoutIds.length, 0),
    0,
  )
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Écran 14 · Import / export · sources — ce qui remplace la synchro, et d'où vient le moteur.
 *
 * LIMITATIONS assumées :
 * — trois des quatre sorties (`.FIT`, `.ZWO`, `.ICS`) sont rendues inertes avec leur raison : rien
 *   ne les écrit encore. Seule la sauvegarde `.JSON` est branchée sur `storage/backup.ts` ;
 * — l'artboard ne dessine AUCUNE commande d'import. `importBackup` existe et reste non câblé
 *   plutôt que d'inventer un bloc que le canevas n'écrit pas (voir le rapport de reprise).
 */
export function ImportExportScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { plans } = usePlans()
  const [error, setError] = useState<string | null>(null)
  const { input, sheet, open } = useBackupImport()

  const activePlan = plans.find((plan) => plan.status === 'active')
  const dated = activePlan ? datedSessionCount(activePlan.weeks) : 0

  async function exportJson() {
    try {
      const backup = await exportBackup()
      download(`zoned-tri-${todayIso()}.json`, JSON.stringify(backup, null, 2))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export impossible.')
    }
  }

  return (
    <div className={styles.screen}>
      <AppHeader variant="detail" trail={['Outils', 'Import-export']} onBack={() => navigate(TOOLS_PATH)} />

      <div className={styles.column}>
        <div className={styles.head}>
          <div className={styles.label}>Ce qui remplace la synchro</div>
          <StackedTitle className={styles.title} lines={['Import /', 'export']} />
        </div>
        <div className={styles.frieze} aria-hidden="true" />

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Sortie</span>
            <span>Format</span>
          </div>
          {/* La sauvegarde s'écrit ici ; les trois formats de fichier passent par la feuille
              d'export, qui dit ce que chacun contient avant de l'écrire. Le motif du `.FIT`, seul
              format encore inerte, est rendu à l'écran plutôt que dans un `title` invisible au
              doigt. */}
          {EXPORT_ROWS.map((row) => (
            <div key={row.format} className={styles.row}>
              <div>
                <div className={styles.rowTitle}>{row.title}</div>
                <div className={styles.rowMeta}>
                  {row.meta ?? `${dated} séance${dated > 1 ? 's' : ''} datée${dated > 1 ? 's' : ''}`}
                </div>
                {row.unavailableReason && (
                  <InertNote id={`inert-${row.format.slice(1).toLowerCase()}`}>
                    {row.unavailableReason}
                  </InertNote>
                )}
              </div>
              {row.format === '.JSON' ? (
                <SecondaryAction
                  shape="link"
                  className={styles.rowAction}
                  onClick={() => void exportJson()}
                  aria-label={`Exporter ${row.title} en ${row.format}`}
                >
                  {row.format}
                </SecondaryAction>
              ) : row.available ? (
                <Link
                  className={`${styles.rowAction} ${styles.rowActionLink}`}
                  to={exportSheetPath()}
                  aria-label={`Exporter ${row.title} en ${row.format}`}
                >
                  {row.format}
                </Link>
              ) : (
                <SecondaryAction
                  shape="link"
                  className={styles.rowAction}
                  disabled
                  aria-describedby={`inert-${row.format.slice(1).toLowerCase()}`}
                  aria-label={`Exporter ${row.title} en ${row.format}`}
                >
                  {row.format}
                </SecondaryAction>
              )}
            </div>
          ))}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Arrivée depuis `/import-export/import` sans refus à montrer : on dit pourquoi la page a
            changé sous les pieds, plutôt que de laisser croire à un clic perdu. */}
        {isImportRedirectState(location.state) && (
          <div className={styles.notice} role="status">
            L’écran du fichier refusé n’existe que le temps du refus : recharger la page l’efface.
            Choisis à nouveau ton fichier ci-dessous.
          </div>
        )}

        {/* L'écran s'appelle « Import / export » et n'exportait que : la moitié de son nom n'avait
            aucune commande. Le fichier est d'abord validé, puis la feuille montre ce que
            l'appareil perd et ce qu'il gagne — un import remplace tout, il ne se confirme pas à
            l'aveugle (règle nº 2). */}
        <section className={styles.import}>
          <div className={styles.label}>Importer une sauvegarde</div>
          <p className={styles.importNote}>
            Un fichier .JSON exporté depuis Zoned Tri. Il remplace tout ce qui est écrit sur cet
            appareil — l’application te montre quoi avant d’écrire.
          </p>
          {input}
          <SecondaryAction shape="block" className={styles.importAction} onClick={open}>
            Choisir un fichier .JSON
          </SecondaryAction>
        </section>

        <div className={styles.sources}>
          <div className={styles.label}>Sources du moteur</div>
          <div className={styles.sourceList}>
            {ENGINE_SOURCES.map((source) => (
              <div key={source.title} className={styles.source}>
                <span className={`${styles.mark} ${MARK_CLASS[source.mark]}`} aria-hidden="true" />
                <div>
                  <div className={styles.sourceTitle}>{source.title}</div>
                  <div className={styles.sourceMeta}>{source.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.pledge}>
          Quand la preuve est faible, l’app le dit et te laisse le dernier mot. C’est le seul
          engagement qui la sépare d’un coach en boîte noire.
        </div>
      </div>

      {sheet}
    </div>
  )
}
