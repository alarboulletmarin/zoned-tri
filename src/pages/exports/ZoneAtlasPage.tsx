import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import type { ZoneAtlasSheet } from '../../domain/exports/zoneAtlasSheet'
import styles from './printSheets.module.css'

/** Hauteur de la barre de répartition, en unités d'artboard : `height:14px` (21 l. 2767). */
const DISTRIBUTION_BAR_HEIGHT = 'calc(14 * var(--u))'

/**
 * Les trois parts de la cible de répartition. Aucune couleur : un aplat d'encre, un aplat gris,
 * une hachure — c'est ce que le canevas dessine, et c'est ce qui survit à une photocopie.
 */
const DISTRIBUTION_FILLS = ['var(--color-ink)', 'var(--color-on-ink-muted)', 'var(--hatch-ink)']

export interface ZoneAtlasPageProps {
  sheet: ZoneAtlasSheet
  pageNumber: number
  pageCount: number
  /** `20/08/26` — le jour de l'impression, tel que le pied de l'artboard l'écrit. */
  printedOn: string
}

/**
 * Artboard 21 · Atlas des zones · gabarit A4 — « 210 × 297 mm · noir sur blanc, une seule encre ».
 *
 * La feuille qu'on plie et qu'on emporte : les six zones, les quatre colonnes qui les traduisent
 * (natation, vélo, course, FC), les trois références dont elles dérivent, la cible de répartition
 * du plan, et le rappel qu'il faut les recaler après chaque test.
 *
 * CE QUI MANQUE FAUTE DE DONNÉES : sans les quatre références mesurées, le tableau ne se rend
 * pas — il porte alors un vide qui NOMME celles qui manquent. Un tableau à moitié rempli
 * mentirait sur les colonnes qu'il ne peut pas calculer.
 */
export function ZoneAtlasPage({ sheet, pageNumber, pageCount, printedOn }: ZoneAtlasPageProps) {
  return (
    <section className={styles.page} aria-label="Atlas des zones, feuille A4">
      <header className={styles.sheetHead}>
        <div>
          <StackedTitle as="h1" className={styles.sheetTitle} lines={['Atlas des zones']} />
          <div className={styles.sheetSubtitle}>{sheet.subtitle}</div>
        </div>
        <div className={styles.sheetStamp}>
          <div>A4 · 210 × 297 mm</div>
          <div>
            page {pageNumber} / {pageCount}
          </div>
        </div>
      </header>

      <div className={styles.references}>
        {sheet.references.map((reference) => (
          <div key={reference.key} className={styles.reference}>
            {reference.text}
          </div>
        ))}
      </div>

      {sheet.rows.length > 0 ? (
        <div className={styles.zoneTable}>
          <table>
            <colgroup>
              <col />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Zone</th>
                <th scope="col">Natation /100</th>
                <th scope="col">Vélo · watts</th>
                <th scope="col">Course /km</th>
                <th scope="col">FC</th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row) => (
                <tr key={row.zone} className={row.emphasis ? styles.zoneRowEmphasis : undefined}>
                  <td>{row.zone}</td>
                  <td>{row.swim}</td>
                  <td>{row.bike}</td>
                  <td>{row.run}</td>
                  <td>{row.heartRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          className={styles.atlasEmpty}
          headline="Aucune zone à imprimer"
          sentence={`L’atlas dérive de quatre mesures. Il en manque ${
            sheet.missing.length > 1 ? 'quatre' : 'une'
          } : ${sheet.missing.join(', ')}. Rien n’est estimé à leur place.`}
        />
      )}

      <div className={styles.atlasBoxes}>
        <div className={styles.atlasBox}>
          <div className={styles.boxLabel}>
            {sheet.distribution
              ? `Cible de répartition · ${sheet.distribution.weeksCount} semaines`
              : 'Cible de répartition'}
          </div>
          {sheet.distribution ? (
            <>
              <ProgressBar
                className={styles.distributionBar}
                height={DISTRIBUTION_BAR_HEIGHT}
                outlined
                label="Cible de répartition de l’intensité"
                segments={[
                  {
                    key: 'z1z2',
                    percent: sheet.distribution.z1z2Percent,
                    color: DISTRIBUTION_FILLS[0],
                    label: 'Z1–Z2',
                  },
                  {
                    key: 'z3',
                    percent: sheet.distribution.z3Percent,
                    color: DISTRIBUTION_FILLS[1],
                    label: 'Z3',
                  },
                  {
                    key: 'z4plus',
                    percent: sheet.distribution.z4PlusPercent,
                    color: DISTRIBUTION_FILLS[2],
                    label: 'Z4+',
                  },
                ]}
              />
              <div className={styles.distributionLegend}>
                <span>Z1–Z2 {sheet.distribution.z1z2Percent} %</span>
                <span>Z3 {sheet.distribution.z3Percent} %</span>
                <span>Z4+ {sheet.distribution.z4PlusPercent} %</span>
              </div>
            </>
          ) : (
            <p className={styles.atlasProse}>Aucun plan actif : il n’y a pas de cible à imprimer.</p>
          )}
        </div>

        <div className={styles.atlasBox}>
          <div className={styles.boxLabel}>Sans capteur de puissance</div>
          <p className={styles.atlasProse}>
            Les colonnes vélo se lisent en FC ou en ressenti : les watts ne sont pas indispensables,
            l’intention de la séance suffit.
          </p>
        </div>
      </div>

      <footer className={styles.sheetFoot}>
        <span>Allures dérivées du CSS et du seuil mesurés — à recaler après chaque test.</span>
        <span>zonedtri · imprimé le {printedOn}</span>
      </footer>
    </section>
  )
}
