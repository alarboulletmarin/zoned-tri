// Écriture du PNG 1080 × 1080 de l'artboard 23 — un canevas 2D fait à la main.
//
// POURQUOI UN CANEVAS 2D, ET PAS « une capture d'écran du gabarit HTML » :
//  · une capture n'est pas un export. Elle dépend de l'appareil, de son facteur de zoom et de la
//    bonne volonté de l'utilisateur ; elle ne produit pas un carré de 1080, elle produit ce que
//    l'écran voulait bien montrer. La carte de séance est un FICHIER, elle doit sortir identique
//    partout ;
//  · une bibliothèque HTML → image (`html-to-image`, `html2canvas`) aurait signifié une dépendance
//    de plus et un second moteur de rendu à tenir contre le canevas de design ;
//  · le dessin, lui, est simple : deux jetons, un titre, trois quantités, un profil en barres, une
//    légende, un filet et deux mentions. Que des rectangles et du texte.
//
// L'ÉCHELLE. L'artboard est dessiné à 420 px et déclare un fichier de 1080 : le facteur est donc
// 1080/420. Toutes les valeurs ci-dessous sont CELLES DE L'ARTBOARD, et `ctx.scale` fait le reste
// — le même dessin sert le gabarit HTML mesurable et le fichier écrit.
//
// LES POLICES. `document.fonts.ready` est attendu avant de peindre : sans lui, le canevas
// dessinerait dans la police de secours pendant que la vraie finit de charger. Hors ligne, la
// pile de secours prend le relais, comme partout ailleurs dans le produit.

import type { SessionCard } from '../../domain/exports/sessionCard'
import { TODAY_FRAME_COLOR_VAR } from '../../domain/workoutBlocks'

/** Côté du fichier, tel que l'artboard 20 l'annonce : « carte de séance 1080 × 1080 ». */
export const SESSION_CARD_PNG_SIZE = 1080

/** Côté du dessin, tel que l'artboard 23 le pose : « affiché ici à 420 px ». */
export const SESSION_CARD_ARTBOARD_SIZE = 420

/** Les mesures de l'artboard 23, dans son unité à lui. */
const L = {
  border: 2,
  padding: 24,
  badgeFontSize: 11,
  badgePaddingX: 8,
  badgeHeight: 21,
  badgeGap: 6,
  contextFontSize: 10,
  contextTracking: 0.12,
  titleFontSize: 56,
  titleLineHeight: 0.84,
  titleTracking: -0.055,
  titleMarginTop: 20,
  statsMarginTop: 20,
  statsGap: 26,
  statLabelFontSize: 9,
  statLabelTracking: 0.14,
  statValueFontSize: 22,
  statValueMarginTop: 4,
  barsMarginTop: 22,
  barsHeight: 44,
  barsGap: 2,
  legendMarginTop: 8,
  legendGap: 11,
  legendFontSize: 9,
  legendSwatch: 9,
  legendRestWidth: 11,
  legendRestHeight: 2,
  legendSwatchGap: 5,
  footerRule: 2,
  footerPaddingTop: 12,
  footerFontSize: 10,
  footerTracking: 0.1,
} as const

const DISPLAY_FONT = "'General Sans', sans-serif"
const MONO_FONT = "'Space Mono', monospace"

/** `var(--color-zone-4)` → `#ff6a1f`. Le canevas 2D ne connaît pas les variables CSS. */
function resolveColor(value: string, computed: CSSStyleDeclaration): string {
  const match = /^var\((--[a-z0-9-]+)\)$/i.exec(value.trim())
  if (!match) return value
  return computed.getPropertyValue(match[1]).trim() || '#000000'
}

/**
 * L'interlettrage du canevas de design. `ctx.letterSpacing` existe dans les moteurs récents ;
 * là où il manque, le texte sort simplement plus serré — jamais mal placé.
 */
function setTracking(ctx: CanvasRenderingContext2D, em: number, fontSize: number): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(em * fontSize).toFixed(2)}px`
}

function clearTracking(ctx: CanvasRenderingContext2D): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
}

/** Découpe un titre à la largeur disponible — le canevas coupe le sien à la main, pas nous. */
function wrapTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number): string[] {
  const words = title.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`
    if (ctx.measureText(candidate).width <= maxWidth) current = candidate
    else {
      lines.push(current)
      current = word
    }
  }
  lines.push(current)
  return lines
}

export interface DrawSessionCardOptions {
  card: SessionCard
  /** Côté du fichier. 1080 par défaut, comme l'artboard 20 l'annonce. */
  size?: number
}

/**
 * Peint la carte dans un `<canvas>` déjà dimensionné par l'appelant. Rien n'est écrit sur le
 * disque ici : l'écriture du fichier appartient à `download.ts`.
 */
export async function drawSessionCard(
  canvas: HTMLCanvasElement,
  { card, size = SESSION_CARD_PNG_SIZE }: DrawSessionCardOptions,
): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (document.fonts?.ready) await document.fonts.ready

  const computed = getComputedStyle(document.documentElement)
  const ink = resolveColor('var(--color-ink)', computed)
  const label = resolveColor('var(--color-label)', computed)
  const hairline = resolveColor('var(--color-hairline)', computed)
  const paper = resolveColor('var(--color-offscreen-bg)', computed)
  const disciplineColor = resolveColor(
    `var(--color-discipline-${card.discipline.toLowerCase()})`,
    computed,
  )
  const frameColor = resolveColor(TODAY_FRAME_COLOR_VAR, computed)

  canvas.width = size
  canvas.height = size

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size, size)
  const scale = size / SESSION_CARD_ARTBOARD_SIZE
  ctx.scale(scale, scale)

  const side = SESSION_CARD_ARTBOARD_SIZE
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, side, side)

  // Le cadre de 2 px fait partie du FICHIER : la carte n'a pas d'écran autour d'elle pour lui
  // donner un bord, contrairement aux artboards d'écran dont le cadre est celui de l'appareil.
  ctx.strokeStyle = ink
  ctx.lineWidth = L.border
  ctx.strokeRect(L.border / 2, L.border / 2, side - L.border, side - L.border)

  const left = L.border + L.padding
  const right = side - L.border - L.padding
  const width = right - left

  // --- Rangée du haut : les deux jetons, et le contexte poussé à droite ---------------------
  let y = L.border + L.padding

  ctx.textBaseline = 'middle'
  let badgeX = left
  const badgeMiddle = y + L.badgeHeight / 2

  for (const badge of [
    { text: card.discipline as string, color: disciplineColor },
    ...(card.zone
      ? [{ text: card.zone, color: resolveColor(`var(--color-zone-${card.zone.slice(1)})`, computed) }]
      : []),
  ]) {
    ctx.font = `700 ${L.badgeFontSize}px ${MONO_FONT}`
    const textWidth = ctx.measureText(badge.text).width
    const boxWidth = textWidth + 2 * L.badgePaddingX
    ctx.fillStyle = badge.color
    ctx.fillRect(badgeX, y, boxWidth, L.badgeHeight)
    ctx.fillStyle = ink
    ctx.textAlign = 'left'
    ctx.fillText(badge.text, badgeX + L.badgePaddingX, badgeMiddle)
    badgeX += boxWidth + L.badgeGap
  }

  if (card.contextLabel) {
    ctx.font = `${L.contextFontSize}px ${MONO_FONT}`
    setTracking(ctx, L.contextTracking, L.contextFontSize)
    ctx.fillStyle = label
    ctx.textAlign = 'right'
    ctx.fillText(card.contextLabel.toUpperCase(), right, badgeMiddle)
    clearTracking(ctx)
  }

  y += L.badgeHeight

  // --- Titre d'affiche -----------------------------------------------------------------------
  y += L.titleMarginTop
  ctx.font = `700 ${L.titleFontSize}px ${DISPLAY_FONT}`
  setTracking(ctx, L.titleTracking, L.titleFontSize)
  ctx.fillStyle = ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const lineHeight = L.titleFontSize * L.titleLineHeight
  for (const line of wrapTitle(ctx, card.title.toUpperCase(), width)) {
    ctx.fillText(line, left, y)
    y += lineHeight
  }
  clearTracking(ctx)

  // --- Trois quantités ------------------------------------------------------------------------
  y += L.statsMarginTop
  let statX = left
  for (const stat of card.stats) {
    ctx.font = `${L.statLabelFontSize}px ${MONO_FONT}`
    setTracking(ctx, L.statLabelTracking, L.statLabelFontSize)
    ctx.fillStyle = label
    ctx.fillText(stat.label.toUpperCase(), statX, y)
    const labelWidth = ctx.measureText(stat.label.toUpperCase()).width
    clearTracking(ctx)

    ctx.font = `700 ${L.statValueFontSize}px ${MONO_FONT}`
    ctx.fillStyle = ink
    ctx.fillText(stat.value, statX, y + L.statLabelFontSize + L.statValueMarginTop)
    const valueWidth = ctx.measureText(stat.value).width

    statX += Math.max(labelWidth, valueWidth) + L.statsGap
  }
  y += L.statLabelFontSize + L.statValueMarginTop + L.statValueFontSize

  // --- Profil de la séance ---------------------------------------------------------------------
  y += L.barsMarginTop
  const barsBottom = y + L.barsHeight
  const gapTotal = L.barsGap * Math.max(0, card.bars.length - 1)
  const barsWidth = width - gapTotal
  let barX = left

  for (const bar of card.bars) {
    const barWidth = (bar.widthPercent / 100) * barsWidth
    const barHeight = Math.max(L.legendRestHeight, (bar.heightPercent / 100) * L.barsHeight)
    ctx.fillStyle = resolveColor(bar.colorVar, computed)
    ctx.fillRect(barX, barsBottom - barHeight, barWidth, barHeight)
    barX += barWidth + L.barsGap
  }
  y = barsBottom

  // --- Légende ------------------------------------------------------------------------------------
  y += L.legendMarginTop
  ctx.font = `${L.legendFontSize}px ${MONO_FONT}`
  ctx.fillStyle = label
  ctx.textBaseline = 'middle'
  const legendMiddle = y + L.legendSwatch / 2
  let legendX = left

  const legendItems: { draw: () => number; text: string }[] = [
    {
      draw: () => {
        ctx.fillStyle = disciplineColor
        ctx.fillRect(legendX, legendMiddle - L.legendSwatch / 2, L.legendSwatch, L.legendSwatch)
        return L.legendSwatch
      },
      text: 'effort',
    },
    {
      draw: () => {
        ctx.fillStyle = frameColor
        ctx.fillRect(legendX, legendMiddle - L.legendSwatch / 2, L.legendSwatch, L.legendSwatch)
        return L.legendSwatch
      },
      text: 'éch. / RAC',
    },
    {
      draw: () => {
        ctx.fillStyle = hairline
        ctx.fillRect(
          legendX,
          legendMiddle - L.legendRestHeight / 2,
          L.legendRestWidth,
          L.legendRestHeight,
        )
        return L.legendRestWidth
      },
      text: card.restLabel ? `repos · ${card.restLabel} au mur` : 'repos',
    },
  ]

  for (const item of legendItems) {
    const swatchWidth = item.draw()
    legendX += swatchWidth + L.legendSwatchGap
    ctx.fillStyle = label
    ctx.textAlign = 'left'
    ctx.fillText(item.text, legendX, legendMiddle)
    legendX += ctx.measureText(item.text).width + L.legendGap
  }

  // --- Pied de carte, collé en bas ------------------------------------------------------------------
  const footerBaseline = side - L.border - L.padding - L.footerFontSize / 2
  const ruleY = footerBaseline - L.footerFontSize / 2 - L.footerPaddingTop
  ctx.fillStyle = ink
  ctx.fillRect(left, ruleY, width, L.footerRule)

  ctx.font = `${L.footerFontSize}px ${MONO_FONT}`
  setTracking(ctx, L.footerTracking, L.footerFontSize)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = label
  ctx.fillText(card.footerLeft.toUpperCase(), left, footerBaseline)

  ctx.font = `700 ${L.footerFontSize}px ${MONO_FONT}`
  ctx.fillStyle = ink
  ctx.textAlign = 'right'
  ctx.fillText(card.footerRight.toUpperCase(), right, footerBaseline)
  clearTracking(ctx)
}
