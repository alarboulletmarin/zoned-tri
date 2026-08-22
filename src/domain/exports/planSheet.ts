// Contenu du gabarit A4 « Plan » — artboard 22, « 18 semaines sur une page · une ligne par
// semaine, une colonne par jour ».
//
// AUCUN SECOND CALCUL : les journées passent par `buildWeekDays`, les totaux par
// `computeWeekTotals`, les durées par `formatDurationCompact`. Ce module choisit une TRAME par
// cellule et écrit les intitulés de l'artboard — rien d'autre.
//
// ÉCART ASSUMÉ, signalé dans le rapport : l'artboard replie les semaines 10 à 15 sur une seule
// ligne (« construction et spécifique — détail sur la page 3 »), alors que sa propre ligne grise
// annonce « une ligne par semaine ». Reproduire ce repli demanderait d'inventer la règle qui
// décide quelles semaines se replient ; on suit donc l'intention écrite — une ligne par semaine,
// toutes les semaines — et c'est la mise en page qui continue sur la feuille suivante quand
// dix-huit lignes ne tiennent plus (voir `pages/exports/printPagination.ts`).

import { buildWeekDays, computeWeekTotals, weekdayIndex, type WeekDay } from '../planWeek'
import { formatDurationCompact } from '../workoutFormat'
import type { PlanPhaseName, Race, TrainingPlan, Workout } from '../types'

/**
 * Les quatre trames de la légende de l'artboard 22, plus l'aplat d'encre qu'il réserve à deux
 * cases : le jour courant et le jour de la course.
 *
 * - `session` : rien, la lettre seule ;
 * - `easy` : aplat gris `#8F8F86` ;
 * - `key` : hachure d'encre à 45° — c'est un MOTIF, pas un dégradé ;
 * - `rest` : la case vide, un tiret ;
 * - `ink` : aplat d'encre, texte en papier.
 */
export type PlanSheetCellTone = 'session' | 'easy' | 'key' | 'rest' | 'ink'

export interface PlanSheetCell {
  key: string
  /** `N`, `V+C`, `70.3`, ou le tiret du jour sans séance. */
  text: string
  tone: PlanSheetCellTone
}

export interface PlanSheetRow {
  key: string
  /** `01 base`, `04 bloqué`, `18 course`. */
  label: string
  /** Toujours sept, lundi → dimanche. */
  cells: PlanSheetCell[]
  volumeLabel: string
  /** Semaine bloquée : la ligne entière passe sur l'aplat `#E4E1D6`. */
  reduced: boolean
  /** Semaine courante ou semaine de course : la ligne passe en gras. */
  emphasis: boolean
}

export interface PlanSheet {
  /** « 70.3 Vichy · plan ». */
  title: string
  /** « 18 semaines · 77 séances · 133 h · 7 h 30 / sem ». */
  subtitle: string
  rows: PlanSheetRow[]
  /** Pied de page gauche, une phrase par fait. Vide quand le plan n'a rien à signaler. */
  footnotes: string[]
}

/** Intitulés de phase de l'artboard 22, en minuscules et abrégés à la colonne de 64 px. */
const PHASE_LABEL: Record<PlanPhaseName, string> = {
  Base: 'base',
  Build: 'constr.',
  Specific: 'spéc.',
  Taper: 'affût.',
}

/** Le tiret de l'artboard 22 : un vrai tiret cadratin, pas un trait d'union. */
const EMPTY_CELL = '—'

/**
 * Une journée « séance clé » porte un ENCHAÎNEMENT — c'est le `V+C` que l'artboard 22 hachure,
 * et lui seul. Un jour qui porte simplement deux séances n'est pas une séance clé : la plupart
 * des semaines d'un plan en comptent plusieurs, et les hachurer toutes noircirait la page.
 */
function isKeyDay(day: WeekDay): boolean {
  return day.workouts.some((workout) => workout.isBrick === true)
}

/**
 * LA journée « facile » de la semaine — la sortie longue et souple, celle que l'artboard 22
 * grise une fois par ligne (le samedi de ses semaines 01, 02, 03 et 09). C'est la journée la
 * plus longue de la semaine, à condition qu'elle ne porte que du Z1 / Z2 : longue ET souple.
 *
 * Griser toutes les journées faciles aurait été le contresens : un plan polarisé en compte 78 %,
 * et la page entière serait devenue grise — ce que l'artboard ne montre à aucune ligne.
 */
function easyDayDate(days: WeekDay[]): string | null {
  let best: WeekDay | null = null
  for (const day of days) {
    if (day.workouts.length === 0 || isKeyDay(day)) continue
    if (!day.workouts.every((workout) => workout.zone === 'Z1' || workout.zone === 'Z2')) continue
    if (!best || day.totalMin > best.totalMin) best = day
  }
  return best?.date ?? null
}

interface CellContext {
  today: string
  raceDate: string | null
  raceFormat: string
  easyDate: string | null
}

function cellFor(day: WeekDay | undefined, date: string, context: CellContext): PlanSheetCell {
  if (date === context.raceDate) return { key: date, text: context.raceFormat, tone: 'ink' }

  const workouts = day?.workouts ?? []
  if (workouts.length === 0) {
    return { key: date, text: EMPTY_CELL, tone: date === context.today ? 'ink' : 'rest' }
  }

  const text = workouts.map((workout) => workout.discipline).join('+')
  if (date === context.today) return { key: date, text, tone: 'ink' }
  if (isKeyDay(day!)) return { key: date, text, tone: 'key' }
  if (date === context.easyDate) return { key: date, text, tone: 'easy' }
  return { key: date, text, tone: 'session' }
}

/** Sept colonnes, lundi → dimanche, même si le plan ne date pas les sept jours. */
function weekCells(days: WeekDay[], mondayDate: string, context: CellContext): PlanSheetCell[] {
  const byIndex = new Map(days.map((day) => [weekdayIndex(day.date), day]))
  const monday = new Date(`${mondayDate}T00:00:00Z`)

  return Array.from({ length: 7 }, (_, index) => {
    const known = byIndex.get(index)
    if (known) return cellFor(known, known.date, context)
    const date = new Date(monday)
    date.setUTCDate(date.getUTCDate() + index)
    return cellFor(undefined, date.toISOString().slice(0, 10), context)
  })
}

/** `Sem. 04–05` : les numéros consécutifs se disent en fourchette, comme l'artboard le fait. */
function joinWeekNumbers(numbers: number[]): string {
  const sorted = [...numbers].sort((a, b) => a - b)
  const groups: number[][] = []
  for (const value of sorted) {
    const last = groups.at(-1)
    if (last && value === last.at(-1)! + 1) last.push(value)
    else groups.push([value])
  }
  return groups
    .map((group) =>
      group.length === 1
        ? String(group[0]).padStart(2, '0')
        : `${String(group[0]).padStart(2, '0')}–${String(group.at(-1)!).padStart(2, '0')}`,
    )
    .join(', ')
}

function blockedFootnotes(plan: TrainingPlan): string[] {
  const reasons = new Map<string, number[]>()
  for (const week of plan.weeks) {
    const reason =
      week.blockedReason ??
      plan.constraints.blockedWeeks.find((blocked) => blocked.weekNumber === week.weekNumber)?.reason
    if (!reason) continue
    const known = reasons.get(reason) ?? []
    known.push(week.weekNumber)
    reasons.set(reason, known)
  }

  return [...reasons].map(([reason, numbers]) => {
    const plural = numbers.length > 1 ? 'réduites' : 'réduite'
    return `Sem. ${joinWeekNumbers(numbers)} ${plural} : ${reason}`
  })
}

export interface PlanSheetInput {
  plan: TrainingPlan
  /** Catalogue de résolution des identifiants du plan. */
  catalogue: Workout[]
  today: string
  /** Course visée, pour le titre et la case d'encre du jour J. */
  race?: Race
}

export function buildPlanSheet({ plan, catalogue, today, race }: PlanSheetInput): PlanSheet {
  const raceDate = race?.date ?? null
  const raceFormat = race?.format ?? plan.format

  const blockedByNumber = new Map(
    plan.constraints.blockedWeeks.map((blocked) => [blocked.weekNumber, blocked.reason]),
  )

  let totalMin = 0
  let sessionCount = 0

  const rows: PlanSheetRow[] = plan.weeks.map((week) => {
    const days = buildWeekDays(week, catalogue, today)
    const totals = computeWeekTotals(days)
    totalMin += totals.totalMin
    sessionCount += totals.sessionCount

    const mondayDate = days[0]?.date ?? today
    const cells = weekCells(days, mondayDate, {
      today,
      raceDate,
      raceFormat,
      easyDate: easyDayDate(days),
    })
    const reduced = week.blockedReason !== undefined || blockedByNumber.has(week.weekNumber)
    const holdsRace = raceDate !== null && days.some((day) => day.date === raceDate)
    const holdsToday = days.some((day) => day.date === today)

    const suffix = reduced ? 'bloqué' : holdsRace ? 'course' : PHASE_LABEL[week.phase]

    return {
      key: `week-${week.weekNumber}`,
      label: `${String(week.weekNumber).padStart(2, '0')} ${suffix}`,
      cells,
      volumeLabel: totals.totalMin > 0 ? formatDurationCompact(totals.totalMin) : EMPTY_CELL,
      reduced,
      emphasis: holdsRace || holdsToday,
    }
  })

  const weeksCount = plan.weeks.length || plan.weeksCount
  const subtitle = [
    `${plan.weeksCount} semaines`,
    `${sessionCount} séances`,
    formatDurationCompact(totalMin),
    `${formatDurationCompact(weeksCount > 0 ? totalMin / weeksCount : 0)} / sem`,
  ].join(' · ')

  const taper = plan.phases.find((phase) => phase.name === 'Taper')
  const footnotes = [
    ...blockedFootnotes(plan),
    ...(taper?.description ? [`Affûtage : ${taper.description}`] : []),
  ]

  return {
    title: `${race?.name ?? plan.format} · plan`,
    subtitle,
    rows,
    footnotes,
  }
}
