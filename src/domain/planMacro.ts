// Vue macro du plan — artboard 04 (l. 491-548). Le plan dans son entier : l'objectif, trois
// compteurs, le volume hebdomadaire semaine par semaine, les quatre phases et leur état.
//
// Pur : ni horloge, ni persistance — `today` est injecté, comme dans `planWeek.ts` et
// `openingState.ts`. L'écran ne calcule ni pourcentage, ni décompte, ni couleur : il peint.

import type { Discipline, EvidenceNoteData, PlanPhaseName, PlanWeek, TrainingPlan } from './types'
import { DISCIPLINE_LABELS } from './workoutFormat'
import { TRIATHLON_DISCIPLINES } from './planWeek'
import { formatDayMonth } from './openingState'

/**
 * Les quatre phases telles que l'artboard 04 les nomme (l. 522-540) : le modèle les stocke en
 * anglais (`PlanPhaseName`), le canevas les écrit en français. Seule table de correspondance du
 * produit — aucun écran ne retraduit dans son coin.
 */
export const PLAN_PHASE_LABELS: Record<PlanPhaseName, string> = {
  Base: 'Base',
  Build: 'Construction',
  Specific: 'Spécifique',
  Taper: 'Affûtage',
}

/**
 * Couleur de chaque phase, relevée sur l'histogramme et les pastilles de l'artboard 04 :
 * `#8F8F86` · `#2FA84A` · `#FF6A1F` · `#E0B400`. Ces quatre valeurs existent déjà dans les jetons
 * sous un autre nom (zones 1, 2, 4 et 3) : le canevas réemploie la palette des zones pour dire une
 * phase. On pointe donc les jetons existants plutôt que d'écrire les hexadécimaux en dur.
 *
 * Alias nommés disponibles dans tokens.css (`--color-phase-*`) — la
 * couleur d'une phase n'est pas une intensité, et le Design System veut qu'un jeton dise son sens.
 */
const PHASE_COLOR_VAR: Record<PlanPhaseName, string> = {
  Base: 'var(--color-zone-1)',
  Build: 'var(--color-zone-2)',
  Specific: 'var(--color-zone-4)',
  Taper: 'var(--color-zone-3)',
}

/**
 * Note 2 de l'artboard 04 (l. 545), posée en appel sur la phase d'affûtage.
 *
 * Ce n'est pas une donnée du plan : c'est une affirmation du moteur, vraie pour tous les plans
 * qu'il produit — `planGenerator/phases.ts` cale ses deux semaines d'affûtage sur cette même
 * méta-analyse, et `pages/tools/engineSources.ts` la cite déjà comme source retenue. Elle vit donc
 * ici, à côté de la vue qui l'affiche, et non dans `TrainingPlan`.
 */
export const TAPER_EVIDENCE: EvidenceNoteData = {
  level: 'solid',
  text: 'Volume −40 à −60 %, fréquence et intensité maintenues.',
  sourceRef: 'Bosquet et al. 2007, méta-analyse',
}

/**
 * Seconde note de l'artboard 04 (l. 547), au motif hachuré des preuves écartées. Même statut que
 * la précédente : `planGenerator/generatePlan.ts` l. 4 dit mot pour mot que le moteur n'applique
 * pas cette règle, et `engineSources.ts` la liste « non démontrée · écartée ».
 */
export const LOAD_PROGRESSION_CAVEAT = 'La progression de charge ne suit pas la « règle des 10 % » — non démontrée.'

/** Une part de la frise de répartition (artboard 04 l. 502 : trois segments, N / V / C). */
export interface PlanMacroShare {
  discipline: Discipline
  label: string
  totalMin: number
  percent: number
}

/** Une colonne de l'histogramme « Volume hebdo · 18 semaines » (artboard 04 l. 517-521). */
export interface PlanMacroWeekBar {
  key: string
  weekNumber: number
  phase: PlanPhaseName
  volumeMin: number
  /** Hauteur relative à la semaine la plus chargée, 0-100. */
  heightPercent: number
  colorVar: string
}

/** Une ligne de la liste des phases (artboard 04 l. 522-541). */
export interface PlanMacroPhaseRow {
  key: PlanPhaseName
  /** `Construction · 8 semaines`. */
  label: string
  description?: string
  colorVar: string
  /** `FAIT` pour une phase terminée, `3/8` pour la phase en cours, absent pour une phase à venir. */
  statusLabel?: string
  /** La phase en cours est la seule que le canevas écrit en gras. */
  isActive: boolean
  /** La phase d'affûtage porte l'appel de note 2. */
  hasEvidence: boolean
}

export interface PlanMacroView {
  /** `70.3 Vichy` — nom de la course visée, à défaut le format du plan. */
  goalTitle: string
  /** `30 août · 18 semaines · J-77`. Les parts absentes ne laissent pas de séparateur orphelin. */
  goalMeta: string
  shares: PlanMacroShare[]
  /** Nombre total de séances prévues par le plan, identifiants introuvables compris. */
  sessionCount: number
  /** `133 h` — somme des volumes hebdomadaires du plan. */
  hoursLabel: string
  /** `7/18` — semaines écoulées sur semaines du plan, même convention que `progressPercent`. */
  weeksDoneLabel: string
  bars: PlanMacroWeekBar[]
  phases: PlanMacroPhaseRow[]
  /** `18 semaines` — écrit deux fois par l'artboard, calculé une seule ici. */
  weeksLabel: string
}

export interface PlanMacroInput {
  plan: TrainingPlan
  /** Course visée du plan, quand elle est connue : elle donne le titre et la date de l'objectif. */
  race?: { name: string; date: string }
  /** Jour courant ISO `YYYY-MM-DD` (voir `todayIso()`). */
  today: string
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`
}

/**
 * `133 h` — le compteur d'heures de l'artboard 04 (l. 510) ne descend pas sous l'heure, là où
 * `formatDurationMin` rendrait « 115 h 01 » pour un total de dix-huit semaines. À l'échelle du
 * plan, la minute n'est pas une information : c'est du bruit dans un chiffre de 28 px.
 */
function formatPlanHours(totalMin: number): string {
  return `${Math.round(totalMin / 60)} h`
}

function weeksCountOf(plan: TrainingPlan): number {
  return plan.weeksCount || plan.weeks.length
}

/**
 * Semaines écoulées, semaine courante comprise — la convention que `selectOpeningState` emploie
 * déjà pour son avancement (`Semaine 07 / 18` vaut 39 %). Hors des dates du plan, le décompte ne
 * retombe pas sur la première semaine : avant le départ il vaut 0, après la course il vaut tout.
 */
export function weeksElapsed(plan: TrainingPlan, today: string): number {
  const total = weeksCountOf(plan)
  if (today < plan.startDate) return 0
  if (today > plan.endDate) return total
  const containing = plan.weeks.find((week) => week.days.some((day) => day.date === today))
  return containing ? containing.weekNumber : Math.min(total, plan.weeks[0]?.weekNumber ?? 0)
}

/**
 * Volume par discipline sur TOUT le plan, lu dans `PlanWeek.volumeByDiscipline` et non dans les
 * séances : la vue macro parle des 18 semaines, dont une seule est résolue contre le catalogue.
 * Trois segments seulement — la frise du canevas dit la répartition du triathlon, comme celle de
 * la semaine (cf. `TRIATHLON_DISCIPLINES`).
 */
export function computePlanShares(plan: TrainingPlan): PlanMacroShare[] {
  const minutes = new Map<Discipline, number>()
  for (const week of plan.weeks) {
    for (const discipline of TRIATHLON_DISCIPLINES) {
      minutes.set(discipline, (minutes.get(discipline) ?? 0) + (week.volumeByDiscipline[discipline] ?? 0))
    }
  }

  const total = TRIATHLON_DISCIPLINES.reduce((sum, discipline) => sum + (minutes.get(discipline) ?? 0), 0)
  if (total === 0) return []

  return TRIATHLON_DISCIPLINES.map((discipline) => {
    const totalMin = minutes.get(discipline) ?? 0
    return { discipline, label: DISCIPLINE_LABELS[discipline], totalMin, percent: (totalMin / total) * 100 }
  }).filter((share) => share.totalMin > 0)
}

/**
 * Une colonne par semaine, hauteur relative à la semaine la plus chargée et couleur donnée par la
 * phase. Une semaine à zéro minute reste une colonne — le canevas dessine 18 barres pour 18
 * semaines, jamais 17 : c'est l'artboard qui compte les semaines, pas la donnée qui les efface.
 */
export function computeWeekVolumeBars(weeks: PlanWeek[]): PlanMacroWeekBar[] {
  const peak = Math.max(...weeks.map((week) => week.totalVolumeMin), 0)

  return weeks.map((week) => ({
    key: `w${week.weekNumber}`,
    weekNumber: week.weekNumber,
    phase: week.phase,
    volumeMin: week.totalVolumeMin,
    heightPercent: peak <= 0 ? 0 : Math.round((week.totalVolumeMin / peak) * 100),
    colorVar: PHASE_COLOR_VAR[week.phase],
  }))
}

/**
 * Les quatre lignes de phases. L'état vient de `PlanPhase.status`, que le générateur tient déjà à
 * jour (`planGenerator/phases.ts`), et le décompte de la phase en cours (`3/8`) se dérive de son
 * rang dans la suite des phases : c'est la seule lecture qui reste vraie quel que soit le plan.
 */
export function computePhaseRows(plan: TrainingPlan, today: string): PlanMacroPhaseRow[] {
  const elapsed = weeksElapsed(plan, today)
  let startWeek = 1

  return plan.phases.map((phase) => {
    const doneInPhase = Math.max(0, Math.min(phase.weeksCount, elapsed - startWeek + 1))
    startWeek += phase.weeksCount

    return {
      key: phase.name,
      label: `${PLAN_PHASE_LABELS[phase.name]} · ${plural(phase.weeksCount, 'semaine')}`,
      description: phase.description,
      colorVar: PHASE_COLOR_VAR[phase.name],
      statusLabel:
        phase.status === 'done' ? 'FAIT' : phase.status === 'active' ? `${doneInPhase}/${phase.weeksCount}` : undefined,
      isActive: phase.status === 'active',
      hasEvidence: phase.name === 'Taper',
    }
  })
}

/** Ligne sous le titre : date de la course, durée du plan, décompte — sans séparateur orphelin. */
function goalMeta(plan: TrainingPlan, race: PlanMacroInput['race'], today: string): string {
  const parts: string[] = []
  if (race) parts.push(formatDayMonth(race.date))
  parts.push(plural(weeksCountOf(plan), 'semaine'))
  if (race) {
    const days = daysBetween(today, race.date)
    if (days >= 0) parts.push(`J-${days}`)
  }
  return parts.join(' · ')
}

export function buildPlanMacroView({ plan, race, today }: PlanMacroInput): PlanMacroView {
  const weeksCount = weeksCountOf(plan)
  const totalMin = plan.weeks.reduce((sum, week) => sum + week.totalVolumeMin, 0)
  const sessionCount = plan.weeks.reduce(
    (sum, week) => sum + week.days.reduce((daySum, day) => daySum + day.workoutIds.length, 0),
    0,
  )

  return {
    goalTitle: race?.name ?? plan.format,
    goalMeta: goalMeta(plan, race, today),
    shares: computePlanShares(plan),
    sessionCount,
    hoursLabel: formatPlanHours(totalMin),
    weeksDoneLabel: `${weeksElapsed(plan, today)}/${weeksCount}`,
    bars: computeWeekVolumeBars(plan.weeks),
    phases: computePhaseRows(plan, today),
    weeksLabel: plural(weeksCount, 'semaine'),
  }
}
