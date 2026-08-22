import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { DAY_INITIALS } from '../../domain/weekContext'
import type { PlanSheet, PlanSheetCellTone, PlanSheetRow } from '../../domain/exports/planSheet'
import styles from './printSheets.module.css'

/** Les quatre trames de la légende, plus l'aplat d'encre réservé au jour J et au jour courant. */
const CELL_CLASS: Record<PlanSheetCellTone, string | undefined> = {
  session: undefined,
  easy: styles.cellEasy,
  key: styles.cellKey,
  rest: undefined,
  ink: styles.cellInk,
}

export interface PlanPageProps {
  sheet: PlanSheet
  /** Les semaines de CETTE page. Par défaut toutes — un plan court tient sur une seule feuille. */
  rows?: PlanSheetRow[]
  pageNumber: number
  pageCount: number
  /** Le pied ne porte les notes que sur la dernière feuille du plan : elles le concluent. */
  withFootnotes?: boolean
}

/**
 * Artboard 22 · Plan en PDF · gabarit A4 — « 18 semaines sur une page · une ligne par semaine,
 * une colonne par jour ».
 *
 * ÉCART ASSUMÉ : l'artboard replie les semaines 10 à 15 sur une seule ligne (« construction et
 * spécifique — détail sur la page 3 ») alors que sa propre ligne grise annonce une ligne par
 * semaine. Reproduire ce repli demanderait d'inventer la règle qui décide quelles semaines se
 * replient ; on suit l'intention écrite, et toutes les semaines ont leur ligne.
 *
 * CE QU'EST LA « PAGE 3 » DE L'ARTBOARD. Dix-huit lignes ne tiennent pas sur une A4 à ce corps
 * de texte : la page en porte treize, mesurées sur l'artboard lui-même. Le canevas résout le
 * débordement en repliant les semaines 10 à 15 et en renvoyant « le détail sur la page 3 » ; on
 * le résout en CONTINUANT le tableau sur cette page 3, ce qui donne le même document de trois
 * feuilles, sans repli à inventer et sans qu'une seule semaine perde sa ligne.
 *
 * La numérotation suit donc le document réellement produit.
 */
export function PlanPage({
  sheet,
  rows = sheet.rows,
  pageNumber,
  pageCount,
  withFootnotes = true,
}: PlanPageProps) {
  return (
    <section className={styles.page} aria-label="Plan, feuille A4">
      <header className={styles.sheetHead}>
        <div>
          <StackedTitle as="h1" className={styles.sheetTitle} lines={[sheet.title]} />
          <div className={styles.sheetSubtitle}>{sheet.subtitle}</div>
        </div>
        <div className={styles.sheetStamp}>
          <div>A4 · 210 × 297 mm</div>
          <div>
            page {pageNumber} / {pageCount}
          </div>
        </div>
      </header>

      <div className={styles.planLegend}>
        <span className={styles.planLegendItem}>
          <span className={`${styles.swatch} ${styles.swatchSession}`} aria-hidden="true" />
          séance
        </span>
        <span className={styles.planLegendItem}>
          <span className={`${styles.swatch} ${styles.swatchEasy}`} aria-hidden="true" />
          facile
        </span>
        <span className={styles.planLegendItem}>
          <span className={`${styles.swatch} ${styles.swatchKey}`} aria-hidden="true" />
          séance clé
        </span>
        <span className={styles.planLegendItem}>
          <span className={`${styles.swatch} ${styles.swatchRest}`} aria-hidden="true" />
          repos
        </span>
        <span className={styles.planLegendCodes}>N · V · C · R</span>
      </div>

      <div className={styles.planTable}>
        <table>
          <colgroup>
            <col />
            {DAY_INITIALS.map((initial, index) => (
              <col key={`${initial}-${index}`} />
            ))}
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Sem.</th>
              {DAY_INITIALS.map((initial, index) => (
                <th key={`${initial}-${index}`} scope="col">
                  {initial}
                </th>
              ))}
              <th scope="col">Vol.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={[
                  row.reduced ? styles.planRowReduced : '',
                  row.emphasis ? styles.planRowEmphasis : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <th scope="row">{row.label}</th>
                {row.cells.map((cell) => (
                  <td key={cell.key} className={CELL_CLASS[cell.tone]}>
                    {cell.text}
                  </td>
                ))}
                <td className={styles.planVolume}>{row.volumeLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className={styles.sheetFoot}>
        <span>{withFootnotes ? sheet.footnotes.join(' ') : ''}</span>
        <span>
          page {pageNumber} / {pageCount}
        </span>
      </footer>
    </section>
  )
}
