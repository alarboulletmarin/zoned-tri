// Dérivations de la section Courses (artboards 08, 09, 10, 11, 27, 30, S7).
//
// Aucun calcul physiologique ici : les recommandations viennent des calculateurs déjà écrits et
// testés (`calculators/carbs.ts`, `calculators/hydration.ts`, `calculators/racePacing.ts`). Ce
// module ne fait que de la mise en forme et de la répartition — il traduit un `Race` en ce que les
// artboards donnent à lire, et rien de plus. Un champ absent se rend « — », jamais estimé.

import { carbsForDuration } from './calculators/carbs'
import { daysBetween } from './planGenerator/dates'
import type {
  ChecklistItem,
  ChecklistSection,
  Discipline,
  ProofLevel,
  Race,
  RaceNutritionItem,
  RacePacing,
  RacePacingSegment,
  RaceSegment,
  RaceTimelineEvent,
  RaceTimelinePhase,
} from './types'

/** Le tiret d'un champ absent. Jamais « 0 », jamais une estimation muette. */
export const MISSING = '—'

/** Le mot que le canevas écrit à la fin d'une note de preuve : « — preuve modérée ». */
export const PROOF_WORD: Record<ProofLevel, string> = {
  solid: 'solide',
  moderate: 'modérée',
  weak: 'faible',
}

// --- Nombres et durées ---------------------------------------------------------------------

/** « 21,1 » — virgule décimale française, zéro décimale inutile. */
export function formatNumberFr(value: number, maxDecimals = 1): string {
  const rounded = Number(value.toFixed(maxDecimals))
  return String(rounded).replace('.', ',')
}

/** « 1,9 km » depuis des mètres. */
export function formatSwimDistance(swimM: number): string {
  return swimM >= 1000 ? `${formatNumberFr(swimM / 1000, 1)} km` : `${swimM} m`
}

export function formatKm(km: number): string {
  return `${formatNumberFr(km, 1)} km`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** « 2:55:00 » au-delà de l'heure, « 34:12 » en deçà — la colonne « segment » de l'artboard 09. */
export function formatSegmentTime(totalSec: number): string {
  const sec = Math.round(totalSec)
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${minutes}:${pad2(seconds)}`
}

/** « 5:24:30 » — le temps cible, toujours en heures. */
export function formatFullTime(totalSec: number): string {
  const sec = Math.round(totalSec)
  return `${Math.floor(sec / 3600)}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(sec % 60)}`
}

/** « 3:33 » — la colonne « cumul » de l'artboard 09, en heures et minutes tronquées. */
export function formatCumulative(totalSec: number): string {
  const sec = Math.round(totalSec)
  return `${Math.floor(sec / 3600)}:${pad2(Math.floor((sec % 3600) / 60))}`
}

/** « 4 h 45 » — l'en-tête « Sur 4 h 45 d'effort » de l'artboard 10. */
export function formatEffortDuration(totalSec: number): string {
  const minutes = Math.round(totalSec / 60)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${pad2(rest)}`
}

// --- Compte à rebours ------------------------------------------------------------------------

export interface RaceCountdown {
  days: number
  /** « J-77 », « JOUR J », « J+12 ». */
  label: string
  past: boolean
}

export function raceCountdown(race: Race, todayIso: string): RaceCountdown {
  const days = daysBetween(todayIso, race.date)
  if (days === 0) return { days, label: 'JOUR J', past: false }
  if (days > 0) return { days, label: `J-${days}`, past: false }
  return { days, label: `J+${-days}`, past: true }
}

// --- Distances -------------------------------------------------------------------------------

/** « 1,9 km · 90 km · 21,1 km » — les parties nulles sortent (l'aquathlon n'a pas de vélo). */
export function formatRaceDistances(race: Race): string {
  const parts: string[] = []
  if (race.distances.swimM > 0) parts.push(formatSwimDistance(race.distances.swimM))
  if (race.distances.bikeKm > 0) parts.push(formatKm(race.distances.bikeKm))
  if (race.distances.runKm > 0) parts.push(formatKm(race.distances.runKm))
  return parts.join(' · ')
}

// --- Pacing ------------------------------------------------------------------------------------

const SEGMENT_DISCIPLINE: Record<RaceSegment, Discipline | null> = {
  N: 'N',
  T1: null,
  V: 'V',
  T2: null,
  C: 'C',
}

const TRANSITION_LABEL: Record<'T1' | 'T2', string> = {
  T1: 'Transition 1',
  T2: 'Transition 2',
}

export interface PacingRow {
  key: string
  segment: RaceSegment
  /** Discipline du segment, `null` pour une transition (badge gris, pas une discipline). */
  discipline: Discipline | null
  /** « 1,9 km », « Transition 1 ». */
  title: string
  pace: string
  note?: string
  noteRef?: number
  durationSec: number
  cumulativeTimeSec: number
}

/** Durée propre d'un segment = son cumul moins celui du précédent. */
export function pacingRows(race: Race): PacingRow[] {
  const segments = race.pacing?.segments ?? []
  let previous = 0
  return segments.map((segment) => {
    const durationSec = segment.cumulativeTimeSec - previous
    previous = segment.cumulativeTimeSec
    return {
      key: segment.segment,
      segment: segment.segment,
      discipline: SEGMENT_DISCIPLINE[segment.segment],
      title: segmentTitle(race, segment),
      pace: segment.pace,
      note: segment.note,
      noteRef: segment.noteRef,
      durationSec,
      cumulativeTimeSec: segment.cumulativeTimeSec,
    }
  })
}

function segmentTitle(race: Race, segment: RacePacingSegment): string {
  switch (segment.segment) {
    case 'N':
      return formatSwimDistance(race.distances.swimM)
    case 'V':
      return formatKm(race.distances.bikeKm)
    case 'C':
      return formatKm(race.distances.runKm)
    default:
      return TRANSITION_LABEL[segment.segment]
  }
}

export interface ShareSegment {
  key: string
  percent: number
  /** Variable CSS de couleur — la couleur ne dit que la discipline (Design System). */
  color: string
  label: string
}

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  N: 'natation',
  V: 'vélo',
  C: 'course',
  R: 'repos',
}

/**
 * Frise des artboards 08, 11 et 27 : trois parts de discipline, à l'échelle du temps cible.
 * Les transitions n'y figurent pas — l'artboard n'y pose que trois aplats — leur temps est donc
 * hors du dénominateur plutôt que redistribué en douce.
 */
export function disciplineShares(race: Race): ShareSegment[] {
  const rows = pacingRows(race).filter((row) => row.discipline !== null)
  const total = rows.reduce((sum, row) => sum + row.durationSec, 0)
  if (total <= 0) return []
  return rows.map((row) => {
    const discipline = row.discipline as Discipline
    return {
      key: row.key,
      percent: (row.durationSec / total) * 100,
      color: `var(--color-discipline-${discipline.toLowerCase()})`,
      label: DISCIPLINE_LABEL[discipline],
    }
  })
}

/** Frise de l'artboard 09 : les cinq segments, transitions comprises, en gris de repos. */
export function pacingShares(race: Race): ShareSegment[] {
  const rows = pacingRows(race)
  const total = rows.reduce((sum, row) => sum + row.durationSec, 0)
  if (total <= 0) return []
  return rows.map((row) => ({
    key: row.key,
    percent: (row.durationSec / total) * 100,
    color: row.discipline
      ? `var(--color-discipline-${row.discipline.toLowerCase()})`
      : 'var(--color-discipline-r)',
    label: row.discipline ? DISCIPLINE_LABEL[row.discipline] : TRANSITION_LABEL[row.segment as 'T1' | 'T2'],
  }))
}

/** Titre de l'encadré de preuve de l'artboard 09 : « Pourquoi 0,78 au vélo ». */
export function bikeIfHeading(pacing: RacePacing): string | null {
  if (pacing.bikeTargetIf === undefined) return null
  return `Pourquoi ${formatNumberFr(pacing.bikeTargetIf, 2)} au vélo`
}

// --- Nutrition -----------------------------------------------------------------------------------

export interface NutritionShare {
  key: string
  discipline: Discipline
  grams: number
  percent: number
  /** « vélo 236 g » — la légende sous la frise de l'artboard 10. */
  label: string
}

export interface NutritionPlan {
  /** Vélo + course : la natation ne se ravitaille pas (artboard 10 : « sur 4 h 45 d'effort »). */
  effortSec: number
  effortLabel: string
  totalGrams: number
  shares: NutritionShare[]
  items: RaceNutritionItem[]
  /** Volume de boisson total, « 2,8 L », ou `null` si le débit n'est pas renseigné. */
  fluidLabel: string | null
  /** Niveau de preuve rendu par `carbsForDuration` — pas une valeur écrite à la main. */
  carbsProofLevel: ProofLevel
  carbsSource: string
}

/** Segments qui se ravitaillent — l'artboard 10 ne compte que le vélo et la course. */
const FUELLED_SEGMENTS: RaceSegment[] = ['V', 'C']

/**
 * Le total de glucides vient de `carbsForDuration` (Jeukendrup, preuve solide) appliqué à la durée
 * de l'effort ravitaillable ; la répartition vélo / course est proportionnelle au temps passé dans
 * chaque segment. Le volume de boisson est le débit du plan multiplié par cette même durée.
 */
export function nutritionPlan(race: Race): NutritionPlan | null {
  const nutrition = race.nutrition
  if (!nutrition) return null

  const rows = pacingRows(race).filter((row) => FUELLED_SEGMENTS.includes(row.segment))
  const effortSec = rows.reduce((sum, row) => sum + row.durationSec, 0)
  const effortHours = effortSec / 3600
  const carbs = carbsForDuration(nutrition.carbsGPerH, effortHours)
  const totalGrams = Math.round(carbs.value)

  const shares: NutritionShare[] = rows.map((row) => {
    const discipline = row.discipline as Discipline
    const grams = effortSec > 0 ? Math.round((totalGrams * row.durationSec) / effortSec) : 0
    return {
      key: row.key,
      discipline,
      grams,
      percent: effortSec > 0 ? (row.durationSec / effortSec) * 100 : 0,
      label: `${DISCIPLINE_LABEL[discipline]} ${grams} g`,
    }
  })

  const fluidLabel =
    nutrition.fluidMlPerH === undefined
      ? null
      : `${formatNumberFr((nutrition.fluidMlPerH * effortHours) / 1000, 1)} L`

  return {
    effortSec,
    effortLabel: formatEffortDuration(effortSec),
    totalGrams,
    shares,
    items: nutrition.items,
    fluidLabel,
    // `carbsForDuration` est un calculateur à affirmation : son niveau est toujours l'un des trois.
    carbsProofLevel: carbs.proofLevel as ProofLevel,
    carbsSource: carbs.source,
  }
}

/** « 600 ml/h · ravitos km 30, 60 » — la sous-ligne de la ligne « Eau » de l'artboard 10. */
export function fluidDetail(race: Race): string | null {
  const mlPerH = race.nutrition?.fluidMlPerH
  if (mlPerH === undefined) return null
  const stations = race.aidStationsKm
  if (!stations || stations.length === 0) return `${mlPerH} ml/h`
  return `${mlPerH} ml/h · ravitos km ${stations.join(', ')}`
}

/** « km 30, km 60 » — la ligne « Ravitos vélo » de l'artboard 08. */
export function aidStationsLabel(race: Race): string {
  const stations = race.aidStationsKm
  if (!stations || stations.length === 0) return MISSING
  return stations.map((km) => `km ${km}`).join(', ')
}

// --- Timeline du jour J ----------------------------------------------------------------------------

export interface TimelineGroup {
  phase: RaceTimelinePhase
  label: string
  events: RaceTimelineEvent[]
}

const PHASE_LABEL: Record<RaceTimelinePhase, string> = {
  eve: 'La veille',
  race_day: 'À rebours du départ',
}

/** Les deux blocs de l'artboard 11, dans l'ordre, vidés de leur groupe s'ils n'ont rien. */
export function timelineGroups(race: Race): TimelineGroup[] {
  const events = race.timeline ?? []
  return (['eve', 'race_day'] as RaceTimelinePhase[])
    .map((phase) => ({
      phase,
      label: PHASE_LABEL[phase],
      events: events.filter((event) => event.phase === phase),
    }))
    .filter((group) => group.events.length > 0)
}

// --- Checklist du parc à vélo -------------------------------------------------------------------------

export interface ChecklistGroup {
  section: ChecklistSection
  label: string
  items: ChecklistItem[]
}

const CHECKLIST_LABEL: Record<ChecklistSection, string> = {
  T1: 'Emplacement T1 · natation → vélo',
  bike: 'Sur le vélo',
  T2: 'Emplacement T2 · vélo → course',
}

const CHECKLIST_ORDER: ChecklistSection[] = ['T1', 'bike', 'T2']

export function checklistGroups(items: ChecklistItem[]): ChecklistGroup[] {
  return CHECKLIST_ORDER.map((section) => ({
    section,
    label: CHECKLIST_LABEL[section],
    items: items.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0)
}

export interface ChecklistProgress {
  done: number
  total: number
  percent: number
  /** « 3 / 10 » — le compteur en aplat d'encre de l'artboard 30. */
  label: string
}

export function checklistProgress(items: ChecklistItem[]): ChecklistProgress {
  const total = items.length
  const done = items.filter((item) => item.done).length
  return {
    done,
    total,
    percent: total === 0 ? 0 : (done / total) * 100,
    label: `${done} / ${total}`,
  }
}

// --- Vue d'ensemble des courses (artboards 27 et S7) -------------------------------------------------

export interface RacesOverview {
  /** L'objectif principal — une seule course peut l'être, c'est elle qui façonne le plan. */
  goal: Race | undefined
  /** Courses de préparation encore à venir, de la plus proche à la plus lointaine. */
  preparations: Race[]
  /** Courses déjà courues, de la plus récente à la plus ancienne. */
  past: Race[]
  total: number
  /** « 4 · dont 1 passée » (artboard 27). */
  countLabel: string
  /** « 1 objectif · 2 prépa · 1 passée » (artboard S7). */
  breakdownLabel: string
}

function byDateAscending(a: Race, b: Race): number {
  return a.date.localeCompare(b.date)
}

/**
 * Une course est « passée » quand sa date est derrière nous, quel que soit son rôle : l'artboard 27
 * range le Sprint de Senlis dans « Passées » et non dans les prépas, alors qu'il en était une.
 */
export function racesOverview(races: Race[], todayIso: string): RacesOverview {
  const past = races.filter((race) => race.date < todayIso).sort((a, b) => b.date.localeCompare(a.date))
  const upcoming = races.filter((race) => race.date >= todayIso)
  const goal = upcoming.filter((race) => race.role === 'primary_goal').sort(byDateAscending)[0]
  const preparations = upcoming.filter((race) => race.id !== goal?.id).sort(byDateAscending)

  const countLabel =
    past.length === 0
      ? String(races.length)
      : `${races.length} · dont ${past.length} passée${past.length > 1 ? 's' : ''}`

  const breakdown: string[] = []
  if (goal) breakdown.push('1 objectif')
  if (preparations.length > 0) breakdown.push(`${preparations.length} prépa`)
  if (past.length > 0) breakdown.push(`${past.length} passée${past.length > 1 ? 's' : ''}`)

  return {
    goal,
    preparations,
    past,
    total: races.length,
    countLabel,
    breakdownLabel: breakdown.join(' · '),
  }
}

/** « 1:18:42 · 12 s de mieux que la cible » — la ligne d'une course passée (artboard 27). */
export function raceResultLabel(race: Race): string | null {
  if (!race.result) return null
  const time = formatFullTime(race.result.timeSec)
  const delta = race.result.deltaToTargetSec
  if (delta === 0) return `${time} · pile sur la cible`
  const seconds = Math.abs(delta)
  const gap = seconds >= 60 ? formatSegmentTime(seconds) : `${seconds} s`
  return `${time} · ${gap} ${delta < 0 ? 'de mieux que' : 'de plus que'} la cible`
}

/**
 * « pacing, nutrition et jour J prêts » — l'artboard 27 ne l'écrit qu'au cas où les trois existent.
 * On énumère ce qui est réellement enregistré : annoncer prêt ce qui ne l'est pas serait mentir.
 */
export function preparednessLabel(race: Race): string | null {
  const ready: string[] = []
  if (race.pacing) ready.push('pacing')
  if (race.nutrition) ready.push('nutrition')
  if (race.timeline && race.timeline.length > 0) ready.push('jour J')
  if (ready.length === 0) return null
  const list =
    ready.length === 1 ? ready[0] : `${ready.slice(0, -1).join(', ')} et ${ready[ready.length - 1]}`
  return `${list} ${ready.length === 1 ? 'prêt' : 'prêts'}`
}

/** « test d'allure · 3 jours faciles avant » — la sous-ligne d'une prépa (artboard 27). */
export function preparationNote(race: Race): string | null {
  const parts: string[] = []
  if (race.purpose) parts.push(race.purpose)
  if (race.easyDaysBefore !== undefined) {
    parts.push(`${race.easyDaysBefore} jour${race.easyDaysBefore > 1 ? 's' : ''} facile${race.easyDaysBefore > 1 ? 's' : ''} avant`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
