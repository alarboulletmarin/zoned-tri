// Colonne de droite des écrans de détail séance — canevas S4 (l. 1616-1655), 400 px sur desktop.
// Elle porte trois choses et rien d'autre : l'histogramme des sept jours de la semaine, la liste
// « reste cette semaine », et le pied « prochaine référence ». Pure dérivation du plan actif, du
// catalogue et du profil : aucune donnée inventée côté composant.

import { buildWeekDays, dominantDiscipline, type WeekDay } from './planWeek'
import type { AthleteProfile, Discipline, PlanWeek, TrainingPlan, Workout } from './types'

export const DAY_LABELS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const

/** Initiales de l'axe des jours, littérales dans le canevas S4 (l. 1630). */
export const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

/** Abréviations de la colonne de droite : « MER », « JEU », « SAM » (canevas S4, `{{ d1 }}`…). */
export const DAY_SHORT_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const

const DISCIPLINE_COLOR_VAR: Record<Discipline, string> = {
  N: 'var(--color-discipline-n)',
  V: 'var(--color-discipline-v)',
  C: 'var(--color-discipline-c)',
  R: 'var(--color-discipline-r)',
}

/**
 * Cadence de retest des références (CSS, FTP, seuil course), en jours.
 * HYPOTHÈSE : le domaine ne stocke pas de « date du prochain test » (`CssReference` = allure + `measuredAt`
 * seulement). La date est donc dérivée de `measuredAt` + cette cadence, documentée ici plutôt que codée en dur
 * dans la vue.
 */
export const REFERENCE_RETEST_INTERVAL_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface WeekContextEntry {
  label: string
  value: string
  note: string
}

/** Une colonne de l'histogramme. `colorVar === null` → colonne vide, tracée en pointillé (S4 l. 1625). */
export interface WeekBar {
  key: string
  dayInitial: string
  loadMin: number
  heightPercent: number
  colorVar: string | null
}

export interface WeekRestEntry {
  key: string
  discipline: Discipline
  title: string
  dayLabel: string
}

export interface WeekContext {
  weekLabel: string
  bars: WeekBar[]
  freeDayNote: string | null
  rest: WeekRestEntry[]
  nextReference: WeekContextEntry | null
}

/** Index 0 = lundi (les dates du plan sont des jours ISO `YYYY-MM-DD`). */
function weekdayIndex(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay()
  return (day + 6) % 7
}

function isoDay(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const today = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((from - today) / MS_PER_DAY)
}

function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

/** Semaine du plan qui contient aujourd'hui ; à défaut, la première. */
function currentWeek(plan: TrainingPlan, todayIso: string): PlanWeek | null {
  const containing = plan.weeks.find((week) => week.days.some((day) => day.date === todayIso))
  return containing ?? plan.weeks[0] ?? null
}

function resolveWorkouts(ids: string[], catalogue: Workout[]): Workout[] {
  return ids.map((id) => catalogue.find((workout) => workout.id === id)).filter((w): w is Workout => Boolean(w))
}

/**
 * Les sept colonnes de l'histogramme, dérivées des jours DÉJÀ résolus.
 *
 * Une seule implémentation pour les deux emplois du canevas : l'histogramme de 84 px de
 * l'artboard 03 (écran Semaine, mobile) et celui de 78 px de la colonne de contexte de S4. La
 * hauteur est relative au jour le plus chargé, la couleur est celle de la discipline dominante
 * (`dominantDiscipline`, seule autorité du domaine sur ce choix).
 */
export function computeWeekBars(days: WeekDay[]): WeekBar[] {
  const week = days.slice(0, 7)
  const peak = Math.max(...week.map((day) => day.totalMin), 0)

  return week.map((day, index) => {
    const discipline = dominantDiscipline(day)
    return {
      key: day.date,
      dayInitial: DAY_INITIALS[weekdayIndex(day.date)] ?? DAY_INITIALS[index],
      loadMin: day.totalMin,
      // Une colonne vide monte à 100 % en pointillé : le canevas dessine le jour libre en creux,
      // pas en barre écrasée (S4 l. 1625).
      heightPercent: discipline === null || peak <= 0 ? 100 : Math.max(12, Math.round((day.totalMin / peak) * 100)),
      colorVar: discipline === null ? null : DISCIPLINE_COLOR_VAR[discipline],
    }
  })
}

/** Premier jour de la semaine sans séance prévue, en priorité un jour marqué indisponible dans les réglages. */
function findFreeDayNote(week: PlanWeek, plan: TrainingPlan): string | null {
  const emptyDays = week.days.filter((day) => day.workoutIds.length === 0)
  if (emptyDays.length === 0) return null

  const unavailable = emptyDays.find(
    (day) => day.unavailable === true || plan.settings.availableDays[weekdayIndex(day.date)] === false,
  )
  const day = unavailable ?? emptyDays[0]
  return `colonne en pointillé · ${DAY_LABELS[weekdayIndex(day.date)]} libre, aucune séance prévue`
}

/**
 * Séances de la semaine encore à venir (strictement après aujourd'hui). Quand aujourd'hui tombe
 * hors de la semaine affichée, rien n'est passé : la semaine entière reste devant.
 */
function buildRest(week: PlanWeek, catalogue: Workout[], todayIso: string): WeekRestEntry[] {
  const cutoff = week.days.some((day) => day.date === todayIso) ? todayIso : ''
  return week.days
    .filter((day) => day.date > cutoff)
    .flatMap((day) =>
      resolveWorkouts(day.workoutIds, catalogue).map((workout, index) => ({
        key: `${day.date}-${workout.id}-${index}`,
        discipline: workout.discipline,
        title: workout.title,
        dayLabel: DAY_SHORT_LABELS[weekdayIndex(day.date)],
      })),
    )
}

/** Prochain retest de la référence la plus ancienne du profil, dérivé de `measuredAt` + la cadence de retest. */
function findNextReference(profile: AthleteProfile, today: Date): WeekContextEntry | null {
  const references = [
    { name: 'test CSS', measuredAt: profile.css?.measuredAt },
    { name: 'test FTP', measuredAt: profile.ftp?.measuredAt },
    { name: 'test seuil course', measuredAt: profile.runThreshold?.measuredAt },
  ].filter((reference): reference is { name: string; measuredAt: string } => Boolean(reference.measuredAt))

  if (references.length === 0) return null

  const dated = references.map((reference) => ({
    name: reference.name,
    inDays: daysBetween(addDays(reference.measuredAt, REFERENCE_RETEST_INTERVAL_DAYS), today),
  }))

  // Le prochain test à venir ; à défaut (tout est en retard) le plus récemment échu.
  const upcoming = dated.filter((reference) => reference.inDays >= 0).sort((a, b) => a.inDays - b.inDays)
  const due = upcoming[0] ?? dated.sort((a, b) => b.inDays - a.inDays)[0]

  const value =
    due.inDays > 0 ? `${due.name} dans ${due.inDays} j` : due.inDays === 0 ? `${due.name} aujourd’hui` : `${due.name} à refaire`

  return {
    label: 'Prochaine référence',
    value,
    note: 'les allures ne changent pas d’ici là',
  }
}

/**
 * Contexte de la semaine en cours du plan actif.
 * `today` est injecté pour garder la fonction pure et testable.
 *
 * LIMITATION : `Workout` n'a pas de date propre, la séance ouverte ne peut donc pas être pointée
 * dans l'histogramme. Le panneau présente la semaine, pas la position exacte de la séance.
 */
export function buildWeekContext(
  plan: TrainingPlan,
  catalogue: Workout[],
  profile: AthleteProfile,
  today: Date,
): WeekContext | null {
  const todayIso = isoDay(today)
  const week = currentWeek(plan, todayIso)
  if (!week) return null

  return {
    weekLabel: `Semaine ${String(week.weekNumber).padStart(2, '0')} / ${plan.weeksCount}`,
    bars: computeWeekBars(buildWeekDays(week, catalogue, todayIso)),
    freeDayNote: findFreeDayNote(week, plan),
    rest: buildRest(week, catalogue, todayIso),
    nextReference: findNextReference(profile, today),
  }
}
