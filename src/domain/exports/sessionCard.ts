// Contenu de la carte de séance — artboard 23, « carré, **aucune donnée personnelle** ·
// affiché ici à 420 px », écrite en PNG 1080 × 1080.
//
// « Aucune donnée personnelle » n'est pas une formule : c'est ce qui décide du contenu. La carte
// ne porte ni nom, ni fréquence cardiaque, ni position — et pas davantage les ALLURES, qui
// diraient le CSS ou la FTP de celui qui l'a produite. C'est pourquoi le pied de l'artboard
// écrit « Allure au CSS » et non « Allure 1:34/100 » : il nomme la référence, il ne la publie
// pas. Ce module tient cette règle.
//
// AUCUN SECOND CALCUL : le profil vient de `buildTodayProfileBars`, la durée du repos de
// `repeatRestLabel`, les distances de `workoutFormat`.

import { buildTodayProfileBars, repeatRestLabel, type TimelineBar } from '../workoutBlocks'
import {
  LOCATION_LABELS,
  ZONE_LABELS,
  formatDurationCompact,
  formatDurationMin,
  formatWorkoutDistance,
} from '../workoutFormat'
import type { Discipline, Workout, WorkoutBlock } from '../types'

export interface SessionCardStat {
  /** `Distance`, `Durée`, `Corps` — les trois de l'artboard, dans cet ordre. */
  label: string
  value: string
}

export interface SessionCard {
  /** `N` — la lettre du jeton de discipline. */
  discipline: Discipline
  /** `Z4`, ou `null` quand la séance ne porte pas de zone dominante. */
  zone: string | null
  /** « Seuil · bassin 25 m », en haut à droite. `null` si la séance ne dit ni l'un ni l'autre. */
  contextLabel: string | null
  title: string
  stats: SessionCardStat[]
  bars: TimelineBar[]
  /** « 30″ au mur » de la légende — `null` quand la séance n'a pas de série. */
  restLabel: string | null
  /** « Allure au CSS · repos 20 s ». */
  footerLeft: string
  footerRight: string
}

/** Le mot-symbole du pied de carte. */
export const SESSION_CARD_SIGNATURE = 'Zoned Tri'

/**
 * Ce que la carte NOMME au lieu de le publier. L'artboard n'en écrit qu'un — « Allure au CSS »,
 * pour la natation — et les trois autres suivent la référence de leur discipline, telle que
 * `toolsReferences` la nomme déjà. Le renforcement n'a aucune référence chiffrée : il n'a donc
 * rien à nommer.
 */
const REFERENCE_PHRASE: Record<Discipline, string | null> = {
  N: 'Allure au CSS',
  V: 'Puissance à la FTP',
  C: 'Allure au seuil',
  R: null,
}

/** Première série de la séance — c'est elle que l'artboard résume en « 8 × 150 ». */
function firstRepeat(blocks: WorkoutBlock[]): Extract<WorkoutBlock, { kind: 'repeat' }> | null {
  for (const block of blocks) if (block.kind === 'repeat') return block
  return null
}

/**
 * « Corps · 8 × 150 ». L'artboard écrit la répétition SANS unité — la ligne de distance juste à
 * gauche l'a déjà donnée. Une séance sans série n'a pas de corps à résumer : la colonne saute,
 * plutôt que d'inventer un chiffre.
 */
function bodyStat(workout: Workout): SessionCardStat | null {
  const repeat = firstRepeat(workout.blocks)
  if (!repeat) return null
  const [effort] = repeat.steps
  if (!effort) return null
  const descriptor = effort.distanceM
    ? String(effort.distanceM)
    : formatDurationCompact(effort.durationMin)
  return { label: 'Corps', value: `${repeat.count} × ${descriptor}` }
}

/** « Seuil · bassin 25 m » — le nom de la zone, puis le lieu, en casse de phrase. */
function contextLabel(workout: Workout): string | null {
  const parts: string[] = []
  if (workout.zone) parts.push(ZONE_LABELS[workout.zone])
  if (workout.location) parts.push(LOCATION_LABELS[workout.location].toLowerCase())
  return parts.length > 0 ? parts.join(' · ') : null
}

export function buildSessionCard(workout: Workout): SessionCard {
  const restLabel = repeatRestLabel(workout.blocks)

  const stats: SessionCardStat[] = []
  if (workout.distanceM) {
    stats.push({
      label: 'Distance',
      value: formatWorkoutDistance(workout.discipline, workout.distanceM),
    })
  }
  stats.push({ label: 'Durée', value: formatDurationMin(workout.durationMin) })
  const body = bodyStat(workout)
  if (body) stats.push(body)

  const reference = REFERENCE_PHRASE[workout.discipline]
  const footerLeft = [reference, restLabel ? `repos ${restLabel}` : null]
    .filter((part): part is string => part !== null)
    .join(' · ')

  return {
    discipline: workout.discipline,
    zone: workout.zone,
    contextLabel: contextLabel(workout),
    title: workout.title,
    stats,
    bars: buildTodayProfileBars(workout.blocks, workout.discipline),
    restLabel,
    // Une séance de renforcement sans série n'a rien à écrire à gauche : le pied porte alors la
    // seule signature, plutôt qu'un point médian orphelin.
    footerLeft,
    footerRight: SESSION_CARD_SIGNATURE,
  }
}

/** `zonedtri-8-150-m-au-css.png`. */
export function sessionCardFileName(workout: Workout): string {
  const slug = workout.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `zonedtri-${slug || 'seance'}.png`
}
