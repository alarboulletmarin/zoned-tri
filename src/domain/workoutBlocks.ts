// Mise en forme du déroulé d'une séance (tableau de blocs + graphique en barres) pour les écrans
// de détail (05 · natation, 28 · vélo, 29 · course, S4/S5 · desktop).
//
// COULEUR DES BARRES — remesuré artboard par artboard. Une barre de FICHE porte la couleur de la
// ZONE de son segment, jamais celle de la discipline :
//   · Design System, composant « Déroulé de séance » (l. 270-277) : #2FA84A / #FF6A1F / #8F8F86,
//     soit Z2 / Z4 / Z1, et la légende du système écrit « la hauteur est la zone » ;
//   · 15 (vélo Z2) blocs #FF6A1F = Z4, récup. #2FA84A = Z2, RAC #8F8F86 = Z1 ;
//   · 28 (vélo) échauffement progressif #2FA84A puis #E0B400 = Z2 puis Z3, blocs #FF6A1F = Z4 ;
//   · 29 (course) échauffement #2FA84A = Z2, 1 000 m #FF6A1F = Z4, trot #8F8F86 = Z1 ;
//   · S5 (fiche natation Z4, l. 1748-1752) effort #FF6A1F = Z4, légende #FF6A1F « effort ».
//
// L'artboard 05 est la SEULE fiche qui peigne son effort en bleu de discipline (#3AA0C8) — et S5
// dessine la même séance de natation Z4 en orange de zone, dix lignes plus bas dans le même fichier.
// Deux artboards, une séance, deux couleurs : on suit les cinq autres et le Design System, et
// l'écart est signalé dans le rapport de reprise.
//
// Les artboards 02 et S4 (écran Aujourd'hui, pas la fiche) peignent bien par discipline : c'est
// `buildTodayProfileBars`, plus bas, avec sa propre légende. Les deux lectures coexistent dans le
// canevas ; la légende reprend EXACTEMENT les couleurs des barres qu'elle nomme, et on ne mélange
// jamais les deux jeux d'intitulés.

import type { Discipline, Workout, WorkoutBlock, WorkoutSegment, WorkoutBlockPhase, WorkoutBlockEffort } from './types'
import {
  formatDistanceM,
  formatDurationCompact,
  formatDurationMin,
  formatShortDuration,
  formatWorkoutDistance,
  type ZoneNumber,
} from './workoutFormat'

const PHASE_EFFORT_LABEL: Record<WorkoutBlockPhase, Partial<Record<WorkoutBlockEffort, string>>> = {
  warmup: { effort: 'Échauffement' },
  cooldown: { recovery: 'Retour au calme' },
  main: { effort: 'Corps de séance', recovery: 'Récupération', rest: 'Repos' },
}

function phaseLabel(phase: WorkoutBlockPhase, effort: WorkoutBlockEffort): string {
  return PHASE_EFFORT_LABEL[phase][effort] ?? PHASE_EFFORT_LABEL.main.effort!
}

function segmentDistance(segment: WorkoutSegment, discipline?: Discipline): string {
  if (!segment.distanceM) return formatDurationMin(segment.durationMin)
  return discipline ? formatWorkoutDistance(discipline, segment.distanceM) : formatDistanceM(segment.distanceM)
}

function segmentMetaParts(segment: WorkoutSegment, discipline?: Discipline): string[] {
  const parts: string[] = [segmentDistance(segment, discipline)]
  if (segment.target?.pace) parts.push(`@ ${segment.target.pace}`)
  if (segment.target?.powerPercentFtp !== undefined) parts.push(`${segment.target.powerPercentFtp} % FTP`)
  if (segment.target?.cadenceRpm !== undefined) parts.push(`${segment.target.cadenceRpm} rpm`)
  return parts
}

export interface BlockDisplayRow {
  key: string
  title: string
  meta: string
  durationLabel: string
  emphasis: boolean
}

/** Le canevas écrit la durée d'une ligne de bloc en minutes primes : « 12′ », « 32′ », « 6′ » (05 l. 592-600). */
function segmentRow(segment: WorkoutSegment, key: string, discipline?: Discipline): BlockDisplayRow {
  return {
    key,
    title: phaseLabel(segment.phase, segment.effort),
    meta: segmentMetaParts(segment, discipline).join(' · '),
    durationLabel: formatDurationCompact(segment.durationMin),
    emphasis: segment.phase === 'main' && segment.effort === 'effort',
  }
}

/**
 * Une série reste UNE ligne de tableau — « 8 × 150 @ 1:34/100 — r 20 s » (05 l. 595) — même si le
 * graphique, lui, dessine chaque répétition. Son intitulé est « Corps de séance », pas « Répétitions ».
 */
function repeatRow(repeat: Extract<WorkoutBlock, { kind: 'repeat' }>, key: string, discipline?: Discipline): BlockDisplayRow {
  const [effortStep, recoveryStep] = repeat.steps
  const mainDescriptor = segmentDistance(effortStep, discipline)
  const targetParts = segmentMetaParts(effortStep, discipline).slice(1)
  const recoveryLabel = recoveryStep ? ` — r ${formatShortDuration(recoveryStep.durationMin)}` : ''
  const totalMin = repeat.steps.reduce((sum, step) => sum + step.durationMin, 0) * repeat.count
  return {
    key,
    title: phaseLabel(effortStep.phase, effortStep.effort),
    meta: [`${repeat.count} × ${mainDescriptor}`, ...targetParts].join(' ') + recoveryLabel,
    durationLabel: formatDurationCompact(totalMin),
    emphasis: true,
  }
}

export function describeBlocks(blocks: WorkoutBlock[], discipline?: Discipline): BlockDisplayRow[] {
  return blocks.map((block, index) =>
    block.kind === 'segment'
      ? segmentRow(block, `block-${index}`, discipline)
      : repeatRow(block, `block-${index}`, discipline),
  )
}

export function totalBlocksDurationMin(blocks: WorkoutBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.kind === 'segment') return sum + block.durationMin
    return sum + block.steps.reduce((stepSum, step) => stepSum + step.durationMin, 0) * block.count
  }, 0)
}

/**
 * Hauteur d'une barre par zone, relevée sur les six profils que dessine le canevas — le Design
 * System (« Déroulé de séance »), 15, 28, 29, 05 et le panneau de S5 :
 *
 * | | DS | 15 | 28 | 29 | 05 | S5 | retenu |
 * |---|---|---|---|---|---|---|---|
 * | Z1 | 30 | 38 | 34 | 32 | 38 | 40 | **34** |
 * | Z2 | 42 / 34 | 45 | 42 / 38 | 36 / 30 | — | — | **42** |
 * | Z3 | — | — | 58 | — | — | — | **58** |
 * | Z4 | 100 | 100 | 96 | 100 | 100 | 100 | **100** |
 *
 * Le bloc de travail touche (ou frôle) le haut du cadre dans SIX artboards sur six : c'est la
 * lecture même du graphe — « la hauteur est la zone », Design System. L'échelle précédente
 * plafonnait Z4 à 78 %, valeur qu'aucun artboard n'écrit : 11 px d'écart sur les 48 px du graphe
 * de 29. Z4 est fixée à la valeur de 28, la seule que le canevas chiffre deux fois ; l'écart avec
 * les cinq artboards à 100 % vaut 1,9 px sur le plus haut des graphes, sous le seuil de la recette.
 *
 * Z5 et Z6 n'apparaissent dans AUCUN profil du canevas : elles occupent le haut de l'échelle, sans
 * se départager, parce qu'aucun artboard ne dit comment les départager. Le tableau sous le graphe
 * donne les chiffres exacts — jamais l'inverse (Design System).
 */
const ZONE_HEIGHT_PERCENT: Record<ZoneNumber, number> = {
  1: 34,
  2: 42,
  3: 58,
  4: 96,
  5: 100,
  6: 100,
}

/** Zone de repli quand un segment n'en porte pas : le canevas peint ces blocs en #8F8F86, soit Z1. */
const NO_ZONE_COLOR_VAR = 'var(--color-zone-1)'

export interface TimelineBar {
  key: string
  widthPercent: number
  heightPercent: number
  colorVar: string
  thin: boolean
}

export function segmentColorVar(segment: WorkoutSegment): string {
  if (!segment.zone) return NO_ZONE_COLOR_VAR
  return `var(--color-zone-${segment.zone.slice(1)})`
}

function segmentHeightPercent(segment: WorkoutSegment): number {
  if (!segment.zone) return 34
  return ZONE_HEIGHT_PERCENT[Number(segment.zone.slice(1)) as ZoneNumber]
}

/**
 * Un temps mort ne se trace en filet de 2 px que si c'est un ARRÊT. Le canevas distingue les deux :
 * en natation on s'arrête au mur (« repos · 30″ au mur », filet — 02, 05, S4, S5) ; à vélo et à pied
 * on récupère en mouvement (« récup. active » barre verte 28, « trot 2′ » barre grise 29).
 * Sans discipline connue (appel historique de l'écran Aujourd'hui), on garde la lecture natation.
 */
function isFullStop(segment: WorkoutSegment, discipline?: Discipline): boolean {
  if (segment.effort === 'rest') return true
  if (segment.effort !== 'recovery' || segment.phase !== 'main') return false
  return discipline === undefined || discipline === 'N'
}

function timelineBar(segment: WorkoutSegment, key: string, total: number, discipline?: Discipline): TimelineBar {
  const stop = isFullStop(segment, discipline)
  return {
    key,
    widthPercent: (segment.durationMin / total) * 100,
    heightPercent: stop ? 2 : segmentHeightPercent(segment),
    colorVar: stop ? 'var(--color-hairline)' : segmentColorVar(segment),
    thin: stop,
  }
}

/**
 * Le canevas dessine CHAQUE répétition : quatre barres pour la série de 05 (l. 584), trois blocs
 * pour 28, cinq pour 29 — jamais un bloc agrégé. La série n'est donc plus écrasée en une paire.
 */
export function buildTimelineBars(blocks: WorkoutBlock[], discipline?: Discipline): TimelineBar[] {
  const total = totalBlocksDurationMin(blocks)
  if (total <= 0) return []
  const bars: TimelineBar[] = []
  blocks.forEach((block, index) => {
    if (block.kind === 'segment') {
      bars.push(timelineBar(block, `bar-${index}`, total, discipline))
      return
    }
    for (let repetition = 0; repetition < block.count; repetition += 1) {
      block.steps.forEach((step, stepIndex) => {
        bars.push(timelineBar(step, `bar-${index}-${repetition}-${stepIndex}`, total, discipline))
      })
    }
  })
  return bars
}

/** Premier segment de travail du corps de séance — porte la couleur que la légende doit reprendre. */
function mainEffortSegment(blocks: WorkoutBlock[]): WorkoutSegment | null {
  for (const block of blocks) {
    if (block.kind === 'segment') {
      if (block.phase === 'main' && block.effort === 'effort') return block
      continue
    }
    const step = block.steps.find((candidate) => candidate.effort === 'effort')
    if (step) return step
  }
  return null
}

/** Couleur de la pastille « effort » / « bloc » de la légende : celle des barres qu'elle nomme. */
export function mainEffortColorVar(blocks: WorkoutBlock[]): string {
  const segment = mainEffortSegment(blocks)
  return segment ? segmentColorVar(segment) : NO_ZONE_COLOR_VAR
}

/** Couleur de la pastille « récup. active » / « trot » de la légende — même source que les barres. */
export function mainRecoveryColorVar(blocks: WorkoutBlock[]): string {
  for (const block of blocks) {
    const steps = block.kind === 'segment' ? [block] : block.steps
    const recovery = steps.find((step) => step.phase === 'main' && step.effort === 'recovery')
    if (recovery) return segmentColorVar(recovery)
  }
  return NO_ZONE_COLOR_VAR
}

/**
 * Profil de l'écran Aujourd'hui — artboards 02 et S4, et EUX SEULS.
 *
 * Ces deux artboards ne colorent pas les barres par zone : l'effort y prend la couleur de la
 * DISCIPLINE (`#3AA0C8` pour la natation de 02, `{{ cN }}` dans les tweaks de S4), l'échauffement
 * et le retour au calme prennent le gris `#8F8F86`, et un arrêt reste un filet. C'est ce que dit
 * leur légende, mot pour mot : « effort · éch. / RAC · repos ». La fiche de séance, elle, colore
 * par zone (`buildTimelineBars`) — les deux lectures coexistent dans le canevas, chacune avec sa
 * légende ; on ne les mélange pas.
 */
export function buildTodayProfileBars(blocks: WorkoutBlock[], discipline: Discipline): TimelineBar[] {
  const effortColor = `var(--color-discipline-${discipline.toLowerCase()})`
  return buildTimelineBars(blocks, discipline).map((bar, index) => {
    if (bar.thin) return bar
    const segment = flattenSegments(blocks)[index]
    if (!segment) return bar
    const isBody = segment.phase === 'main' && segment.effort === 'effort'
    return {
      ...bar,
      colorVar: isBody ? effortColor : TODAY_FRAME_COLOR_VAR,
      heightPercent: isBody ? 100 : 40,
    }
  })
}

/** Gris `#8F8F86` de l'échauffement et du retour au calme, commun aux deux artboards. */
export const TODAY_FRAME_COLOR_VAR = 'var(--color-discipline-r)'

/** Les segments dans l'ordre où `buildTimelineBars` produit ses barres — même parcours, même index. */
function flattenSegments(blocks: WorkoutBlock[]): WorkoutSegment[] {
  const flat: WorkoutSegment[] = []
  for (const block of blocks) {
    if (block.kind === 'segment') {
      flat.push(block)
      continue
    }
    for (let repetition = 0; repetition < block.count; repetition += 1) {
      flat.push(...block.steps)
    }
  }
  return flat
}

/** Durée du repos d'une série, pour l'intitulé de légende « repos · 30 s au mur » (canevas 05 l. 587). */
export function repeatRestLabel(blocks: WorkoutBlock[]): string | null {
  for (const block of blocks) {
    if (block.kind !== 'repeat') continue
    const recovery = block.steps.find((step) => step.effort === 'recovery' || step.effort === 'rest')
    if (recovery) return formatShortDuration(recovery.durationMin)
  }
  return null
}

export function workoutStatBlocks(workout: Workout): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = []
  if (workout.distanceM) {
    stats.push({ label: 'DISTANCE', value: formatWorkoutDistance(workout.discipline, workout.distanceM) })
  }
  stats.push({ label: 'DURÉE', value: formatDurationMin(workout.durationMin) })
  return stats
}
