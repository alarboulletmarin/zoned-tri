import { useEffect, useMemo } from 'react'
import { buildPlanSheet } from '../../domain/exports/planSheet'
import { buildZoneAtlasSheet } from '../../domain/exports/zoneAtlasSheet'
import { todayIso } from '../../domain/planWeek'
import type { AthleteProfile, Race, TrainingPlan, Workout } from '../../domain/types'
import { PlanPage } from './PlanPage'
import { paginatePlanRows } from './printPagination'
import { ZoneAtlasPage } from './ZoneAtlasPage'
import styles from './printSheets.module.css'

/**
 * Marque posée sur `body` le temps que le document est monté. Le reste de l'application n'a rien
 * à faire sur le papier, et la règle `@media print` qui l'efface ne doit valoir QUE pendant ce
 * temps-là — sinon elle fausserait l'impression de n'importe quel autre écran.
 */
const PRINTING_BODY_CLASS = 'zt-printing'

/**
 * `@page` est une règle globale : aucun sélecteur ne la porte, on ne peut donc pas la ranger
 * dans un module CSS sans qu'elle s'applique à toute l'application. Elle est posée et retirée
 * avec le document, comme la classe ci-dessus.
 */
const PAGE_RULE = '@page { size: A4 portrait; margin: 0; }'

/** `20/08/26` — le pied de l'artboard 21 date la feuille du jour où elle sort. */
function formatPrintedOn(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export interface PrintDocumentProps {
  plan: TrainingPlan
  catalogue: Workout[]
  profile?: AthleteProfile
  race?: Race
  today?: string
}

/**
 * Le document `.PDF` de l'artboard 20 — « Plan imprimable · atlas des zones ·
 * **noir et blanc lisible, pensé pour la poche du maillot** ».
 *
 * Les pages dans l'ordre où les artboards les numérotent : l'atlas des zones (21) puis le plan
 * (22). Il n'y a AUCUNE bibliothèque PDF derrière : la voie décidée pour ce projet est
 * `@media print`, et c'est le navigateur qui écrit le fichier par son « Enregistrer au format
 * PDF ». Une bibliothèque aurait signifié un second moteur de rendu, une seconde typographie et
 * un second jeu de mesures à tenir contre le canevas.
 *
 * TROIS PAGES POUR UN PLAN DE 18 SEMAINES, exactement ce qu'annonce l'artboard 20 : l'atlas,
 * puis le plan sur deux feuilles. Treize semaines tiennent sur une A4 — c'est ce que l'artboard
 * 22 aligne — et les suivantes continuent sur la « page 3 » que ce même artboard appelle. Un
 * plan plus court sort en deux pages, et le document se numérote sur ce qu'il contient
 * réellement : un fichier ne s'annonce jamais plus long qu'il n'est.
 */
export function PrintDocument({ plan, catalogue, profile, race, today }: PrintDocumentProps) {
  const reference = today ?? todayIso()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = PAGE_RULE
    document.head.append(style)
    document.body.classList.add(PRINTING_BODY_CLASS)
    return () => {
      style.remove()
      document.body.classList.remove(PRINTING_BODY_CLASS)
    }
  }, [])

  const atlas = useMemo(
    () => buildZoneAtlasSheet(profile, plan, reference),
    [profile, plan, reference],
  )
  const planSheet = useMemo(
    () => buildPlanSheet({ plan, catalogue, today: reference, race }),
    [plan, catalogue, reference, race],
  )

  const planPages = paginatePlanRows(planSheet.rows)
  const pageCount = 1 + planPages.length

  return (
    <div className={styles.document}>
      <ZoneAtlasPage
        sheet={atlas}
        pageNumber={1}
        pageCount={pageCount}
        printedOn={formatPrintedOn(reference)}
      />
      {planPages.map((rows, index) => (
        <PlanPage
          key={rows[0]?.key ?? `plan-${index}`}
          sheet={planSheet}
          rows={rows}
          pageNumber={index + 2}
          pageCount={pageCount}
          withFootnotes={index === planPages.length - 1}
        />
      ))}
    </div>
  )
}
