import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  demoAthleteProfile,
  demoPlan,
  demoRace,
  demoSwimWorkout,
  demoWorkouts,
} from '../../domain/demoData'
import { buildIcs, icsWeekFileName, type IcsDay } from '../../domain/exports/icsFile'
import { createInitialForm } from '../../domain/planGenerator/form'
import { generatePlan } from '../../domain/planGenerator/generatePlan'
import { addDays, mondayOf } from '../../domain/planGenerator/dates'
import { buildWeekDays, todayIso } from '../../domain/planWeek'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import type { TrainingPlan, Workout } from '../../domain/types'
import { ExportSheet } from './ExportSheet'
import { IcsPreview } from './IcsPreview'
import { PlanPage } from './PlanPage'
import { PrintDocument } from './PrintDocument'
import { SessionCardScreen } from './SessionCardScreen'
import { ZoneAtlasPage } from './ZoneAtlasPage'
import { buildPlanSheet } from '../../domain/exports/planSheet'
import { buildZoneAtlasSheet } from '../../domain/exports/zoneAtlasSheet'

/**
 * Atelier d'aperçu — **développement uniquement**, monté par `App` derrière `import.meta.env.DEV`.
 * Il n'existe pas dans l'application livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : les cinq artboards de ce dossier ne s'atteignent, dans le produit, qu'avec un
 * plan actif, un profil complet et le bon jour. L'atelier les rend inspectables et MESURABLES —
 * c'est la seule façon de passer `cmp.mjs` dessus.
 *
 * `24` n'a pas d'autre porte : aucun artboard ne montre le contenu du `.ICS` à l'intérieur de
 * l'application, on ne lui en invente donc pas une. Il vit ici, comme preuve que le fichier
 * écrit est bien celui que le canevas décrit.
 */
const PREVIEW_STATES = ['20', '21', '22', '23', '24'] as const
type ExportsPreviewState = (typeof PREVIEW_STATES)[number]

function isPreviewState(value: string | undefined): value is ExportsPreviewState {
  return PREVIEW_STATES.includes(value as ExportsPreviewState)
}

/**
 * Le plan de démonstration ne porte qu'UNE semaine ; l'artboard 22 en montre dix-huit. On passe
 * donc par le générateur du produit — pas par un faux plan écrit à la main — en visant une
 * course à dix-huit semaines, ce qui est exactement la durée du plan « 70.3 Vichy » du canevas.
 */
function eighteenWeekPlan(today: string): { plan: TrainingPlan; workouts: Workout[]; raceDate: string } {
  const raceDate = addDays(mondayOf(today), 18 * 7 - 1)
  const form = {
    ...createInitialForm(demoAthleteProfile, today),
    format: '70.3' as const,
    raceName: demoRace.name,
    noRace: false,
    raceDate,
  }
  const generated = generatePlan(form, today, SEED_WORKOUTS, { idPrefix: 'apercu-exports' })
  return { plan: generated.plan, workouts: generated.workouts, raceDate }
}

export function ExportsPreview() {
  const { state } = useParams<{ state: string }>()
  const today = todayIso()

  const generated = useMemo(() => eighteenWeekPlan(today), [today])

  const demoDays: IcsDay[] = useMemo(
    () =>
      buildWeekDays(demoPlan.weeks[0], demoWorkouts, today).map((day) => ({
        date: day.date,
        workouts: day.workouts,
      })),
    [today],
  )

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  if (state === '20') {
    return (
      <ExportSheet
        isOpen
        onClose={() => undefined}
        weekNumber={demoPlan.weeks[0].weekNumber}
        days={demoDays}
        workout={demoDays.find((day) => day.workouts.length > 0)?.workouts[0]}
        onPrint={() => undefined}
      />
    )
  }

  if (state === '21') {
    return (
      <div className="preview-print">
        <ZoneAtlasPage
          sheet={buildZoneAtlasSheet(demoAthleteProfile, demoPlan, today)}
          pageNumber={1}
          pageCount={2}
          printedOn="20/08/26"
        />
      </div>
    )
  }

  if (state === '22') {
    return (
      <div className="preview-print">
        <PlanPage
          sheet={buildPlanSheet({
            plan: generated.plan,
            catalogue: generated.workouts,
            today,
            race: { ...demoRace, date: generated.raceDate },
          })}
          pageNumber={2}
          pageCount={2}
        />
      </div>
    )
  }

  if (state === '23') {
    return <SessionCardScreen workout={demoSwimWorkout} />
  }

  const ics = buildIcs(demoDays)
  const eventCount = demoDays.reduce((total, day) => total + day.workouts.length, 0)
  return (
    <IcsPreview ics={ics} fileName={icsWeekFileName(demoPlan.weeks[0].weekNumber)} eventCount={eventCount} />
  )
}

/**
 * Le document A4 complet, sur son adresse d'aperçu : c'est lui qu'on envoie à l'impression pour
 * vérifier la pagination et la marge nulle. Séparé des états ci-dessus, parce qu'il POSE une
 * classe sur `body` — un aperçu d'écran ne doit pas le faire par surprise.
 */
export function PrintDocumentPreview() {
  const today = todayIso()
  const generated = useMemo(() => eighteenWeekPlan(today), [today])

  return (
    <PrintDocument
      plan={generated.plan}
      catalogue={generated.workouts}
      profile={demoAthleteProfile}
      race={{ ...demoRace, date: generated.raceDate }}
      today={today}
    />
  )
}
