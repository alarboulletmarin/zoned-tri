// Contenu du fichier `.ZWO` — carte « .ZWO · 1 séance vélo · Séance → home-trainer ·
// Zwift, Rouvy, MyWhoosh · **% de FTP, pas de watts figés** » de l'artboard 20.
//
// Du XML simple, écrit pour de bon. La contrainte de l'artboard commande tout : un `.ZWO` ne
// porte JAMAIS de watts, seulement des fractions de FTP — c'est le home-trainer qui les
// convertit avec la FTP réglée dans l'application, et c'est ce qui rend le fichier valable
// après un nouveau test.
//
// AUCUN SECOND CALCUL : quand un bloc ne porte pas de `powerPercentFtp`, la fraction vient des
// bornes de `ftpPowerZones`, le calculateur 03/12 déjà en place — appelé sur une FTP de 100,
// ses bornes SONT les pourcentages. Une zone ouverte d'un côté (Z1 sans plancher, Z6 sans
// plafond) est représentée par sa seule borne fermée : on ne s'invente pas de coefficient.
//
// LIMITE ASSUMÉE : Zwift exige une puissance sur chaque élément. Un bloc sans zone NI cible de
// puissance n'en a aucune à déclarer — il sort en `<FreeRide>`, qui est précisément l'élément
// Zwift du « roule comme tu veux », plutôt qu'une valeur inventée.

import { ftpPowerZones } from '../calculators/powerZones'
import type { Workout, WorkoutBlock, WorkoutSegment, Zone } from '../types'

/** Bornes de zone en POURCENTS de FTP : `ftpPowerZones(100)` les donne telles quelles. */
const ZONE_PERCENT_BOUNDS = new Map(
  ftpPowerZones(100).value.map((bound) => [bound.zone, bound]),
)

/**
 * Fraction de FTP d'une zone. Milieu de la fourchette quand elle est fermée des deux côtés ;
 * l'unique borne connue quand la zone est ouverte (Z1 n'a pas de plancher, Z6 pas de plafond).
 */
export function zonePowerFraction(zone: Zone): number {
  const bound = ZONE_PERCENT_BOUNDS.get(zone)
  if (!bound) return 1
  const { minWatts, maxWatts } = bound
  if (minWatts === null) return (maxWatts ?? 100) / 100
  if (maxWatts === null) return minWatts / 100
  return (minWatts + maxWatts) / 200
}

/** `null` = le bloc ne déclare aucune puissance, ni cible ni zone. */
function segmentPower(segment: WorkoutSegment): number | null {
  if (segment.target?.powerPercentFtp !== undefined) return segment.target.powerPercentFtp / 100
  if (segment.zone) return zonePowerFraction(segment.zone)
  return null
}

/** Zwift compte en secondes entières. */
function seconds(durationMin: number): number {
  return Math.max(1, Math.round(durationMin * 60))
}

/** Trois décimales : `0.96`, `1.125`. Zwift lit un flottant, pas un pourcentage. */
function power(fraction: number): string {
  return String(Number(fraction.toFixed(3)))
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function attributes(pairs: [string, string | null][]): string {
  return pairs
    .filter((pair): pair is [string, string] => pair[1] !== null)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ')
}

/**
 * Un segment = un palier. Pas de `<Warmup>` ni de `<Cooldown>` : ces deux éléments Zwift sont
 * des RAMPES, et il faudrait leur inventer un début et une fin que le modèle ne porte pas. Le
 * plan dit « 15 min en Z2 », le fichier dit « 15 min en Z2 ».
 */
function segmentElement(segment: WorkoutSegment): string {
  const fraction = segmentPower(segment)
  const duration = seconds(segment.durationMin)
  const cadence = segment.target?.cadenceRpm === undefined ? null : String(segment.target.cadenceRpm)

  if (fraction === null) {
    return `    <FreeRide ${attributes([['Duration', String(duration)]])}/>`
  }
  return `    <SteadyState ${attributes([
    ['Duration', String(duration)],
    ['Power', power(fraction)],
    ['Cadence', cadence],
  ])}/>`
}

/**
 * Une série effort / récupération devient `<IntervalsT>`, l'élément que Zwift affiche comme un
 * bloc d'intervalles et non comme une suite de paliers indiscernables. Toute autre forme de
 * série (trois marches, une seule marche) est dépliée : mieux vaut des paliers exacts qu'un
 * `IntervalsT` qui déformerait la séance.
 */
function repeatElements(repeat: Extract<WorkoutBlock, { kind: 'repeat' }>): string[] {
  const [on, off] = repeat.steps
  const onPower = on ? segmentPower(on) : null
  const offPower = off ? segmentPower(off) : null

  if (repeat.steps.length === 2 && onPower !== null && offPower !== null) {
    return [
      `    <IntervalsT ${attributes([
        ['Repeat', String(repeat.count)],
        ['OnDuration', String(seconds(on.durationMin))],
        ['OffDuration', String(seconds(off.durationMin))],
        ['OnPower', power(onPower)],
        ['OffPower', power(offPower)],
        ['Cadence', on.target?.cadenceRpm === undefined ? null : String(on.target.cadenceRpm)],
      ])}/>`,
    ]
  }

  const expanded: string[] = []
  for (let repetition = 0; repetition < repeat.count; repetition += 1) {
    expanded.push(...repeat.steps.map(segmentElement))
  }
  return expanded
}

/**
 * Le fichier d'une séance de VÉLO. `null` pour toute autre discipline : un `.ZWO` de natation
 * n'existe pas, et l'écran doit rendre sa puce inerte plutôt que d'écrire un fichier absurde.
 */
export function buildZwo(workout: Workout): string | null {
  if (workout.discipline !== 'V') return null

  const elements = workout.blocks.flatMap((block) =>
    block.kind === 'segment' ? [segmentElement(block)] : repeatElements(block),
  )

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<workout_file>',
    '  <author>Zoned Tri</author>',
    `  <name>${escapeXml(workout.title)}</name>`,
    `  <description>${escapeXml(workout.why?.text ?? '')}</description>`,
    '  <sportType>bike</sportType>',
    '  <tags/>',
    '  <workout>',
    ...elements,
    '  </workout>',
    '</workout_file>',
  ]

  return `${lines.join('\n')}\n`
}

/** `zonedtri-3-x-12-au-seuil.zwo` — le titre de la séance, réduit à ce qu'un système de fichiers accepte. */
export function zwoFileName(workout: Workout): string {
  const slug = workout.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `zonedtri-${slug || 'seance'}.zwo`
}
