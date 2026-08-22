import { useParams } from 'react-router-dom'
import { demoPlan, demoRace } from '../../domain/demoData'
import { addDays } from '../../domain/planGenerator/dates'
import type { Discipline, PlanPhaseName, PlanWeek, TrainingPlan } from '../../domain/types'
import { PlanMacroScreen } from './PlanMacroScreen'

/**
 * Atelier d'aperçu de la vue macro — **développement uniquement**, monté par `App` derrière
 * `import.meta.env.DEV`, sur le patron de `TodayPreview`. Il n'existe pas dans l'application
 * livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : l'artboard 04 montre DIX-HUIT semaines, alors que `demoPlan` n'en porte qu'une —
 * la semaine 07, celle des artboards 03 et 16. Sans les dix-sept autres, l'histogramme se réduit à
 * une barre et l'écran n'est pas mesurable contre le canevas. L'aperçu les reconstruit, et rien
 * d'autre : ni séance, ni phase, ni discipline inventée.
 */
const PREVIEW_STATES = ['04'] as const
type PreviewState = (typeof PREVIEW_STATES)[number]

/**
 * Les dix-huit hauteurs de l'histogramme de l'artboard 04 (l. 514-519), dans l'ordre, en
 * pourcentage de la semaine la plus chargée. Quatre grises (Base), huit vertes (Build), trois
 * orange (Specific), trois jaunes (Taper) — la découpe exacte des phases de `demoPlan`.
 */
const BAR_PERCENTS = [46, 54, 62, 40, 66, 74, 82, 52, 86, 94, 100, 58, 92, 96, 64, 44, 28, 16] as const

/** Lundi de la semaine 07 de `demoPlan` : la semaine que le canevas montre en cours. */
const PREVIEW_TODAY = '2026-06-15'

const DISCIPLINES: Discipline[] = ['N', 'V', 'C', 'R']

function isPreviewState(value: string | undefined): value is PreviewState {
  return PREVIEW_STATES.includes(value as PreviewState)
}

/**
 * Phase de chaque semaine, dépliée depuis `plan.phases` — et NON depuis
 * `planGenerator/phases.phaseNameByWeek`, qui rendrait la répartition théorique du moteur
 * (7/6/3/2 pour dix-huit semaines) au lieu de celle du plan de démonstration (4/8/3/3, la découpe
 * que l'artboard 04 colorie).
 */
function phaseByWeek(plan: TrainingPlan): PlanPhaseName[] {
  return plan.phases.flatMap((phase) => Array.from({ length: phase.weeksCount }, () => phase.name))
}

/**
 * Les dix-huit semaines du plan de démonstration.
 *
 * L'échelle n'est pas choisie : elle est ancrée sur la seule semaine réelle du jeu de données. La
 * semaine 07 pèse 490 min et occupe 82 % de l'histogramme du canevas ; la semaine la plus chargée
 * vaut donc 490 ÷ 0,82 ≈ 598 min, et chaque autre semaine en prend sa part. Le volume par
 * discipline suit la même proportion que celui de la semaine 07, et les journées reprennent son
 * gabarit hebdomadaire — aucune séance nouvelle n'est écrite.
 */
function macroPreviewPlan(): TrainingPlan {
  const reference = demoPlan.weeks[0]
  const referencePercent = BAR_PERCENTS[reference.weekNumber - 1] / 100
  const peakMin = Math.round(reference.totalVolumeMin / referencePercent)
  const phases = phaseByWeek(demoPlan)

  const weeks: PlanWeek[] = BAR_PERCENTS.map((percent, index) => {
    if (index === reference.weekNumber - 1) return reference

    const weekNumber = index + 1
    const totalVolumeMin = Math.round((percent / 100) * peakMin)
    const ratio = reference.totalVolumeMin > 0 ? totalVolumeMin / reference.totalVolumeMin : 0
    const monday = addDays(demoPlan.startDate, index * 7)

    const volumeByDiscipline: PlanWeek['volumeByDiscipline'] = {}
    for (const discipline of DISCIPLINES) {
      const minutes = reference.volumeByDiscipline[discipline]
      if (minutes !== undefined) volumeByDiscipline[discipline] = Math.round(minutes * ratio)
    }

    return {
      weekNumber,
      phase: phases[index] ?? reference.phase,
      totalVolumeMin,
      volumeByDiscipline,
      days: reference.days.map((day, dayIndex) => ({ ...day, date: addDays(monday, dayIndex) })),
      easyPercent: reference.easyPercent,
      hardPercent: reference.hardPercent,
    }
  })

  return { ...demoPlan, weeks }
}

export function PlanMacroPreview() {
  const { state } = useParams<{ state: string }>()

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  return (
    <PlanMacroScreen
      plan={macroPreviewPlan()}
      race={demoRace}
      today={PREVIEW_TODAY}
      onBack={() => undefined}
      onOpenSettings={() => undefined}
    />
  )
}
