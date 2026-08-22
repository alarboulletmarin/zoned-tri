import type { PlanSheetRow } from '../../domain/exports/planSheet'

/**
 * Nombre de semaines qu'une feuille A4 porte — MESURÉ sur l'artboard 22, qui en aligne treize
 * (neuf semaines détaillées, la ligne repliée, puis les trois dernières) pour un tableau de
 * 418 px sur une page de 735. Ce n'est pas un réglage : c'est ce que la page peut donner à ce
 * corps de texte.
 */
export const PLAN_ROWS_PER_PAGE = 13

/**
 * Découpe les semaines en feuilles. Un plan de dix-huit semaines en occupe deux — la seconde
 * est exactement la « page 3 » que l'artboard 22 appelle lui-même (« détail sur la page 3 »),
 * et le document fait alors les trois pages qu'annonce l'artboard 20.
 */
export function paginatePlanRows(rows: PlanSheetRow[]): PlanSheetRow[][] {
  if (rows.length === 0) return [[]]
  const pages: PlanSheetRow[][] = []
  for (let index = 0; index < rows.length; index += PLAN_ROWS_PER_PAGE) {
    pages.push(rows.slice(index, index + PLAN_ROWS_PER_PAGE))
  }
  return pages
}
