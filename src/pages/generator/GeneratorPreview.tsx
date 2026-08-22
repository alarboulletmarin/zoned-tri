import { useMemo, useState, type ReactElement } from 'react'
import { useParams } from 'react-router-dom'
import { createInitialForm, defaultRaceDate, type GeneratorForm } from '../../domain/planGenerator/form'
import { generatePlan } from '../../domain/planGenerator/generatePlan'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { todayIso } from '../../domain/planWeek'
import { demoAthleteProfile } from '../../domain/demoData'
import type { GeneratorStepProps } from './stepProps'
import { StepFormat } from './steps/StepFormat'
import { StepDate } from './steps/StepDate'
import { StepAvailability } from './steps/StepAvailability'
import { StepConstraints } from './steps/StepConstraints'
import { StepReferences } from './steps/StepReferences'
import { StepSummary } from './steps/StepSummary'
import { SimulationScreen } from './SimulationScreen'

/**
 * Atelier d'aperçu du générateur — **développement uniquement**, monté par `App` derrière
 * `import.meta.env.DEV`. Il n'existe pas dans l'application livrée et n'apparaît dans aucune
 * navigation.
 *
 * Raison d'être : les six étapes ne sont atteignables qu'en les traversant, et trois d'entre elles
 * ne montrent leur vrai contenu qu'avec les données de l'artboard — l'alerte de délai de G2 ne
 * paraît que si la course est à moins de 16 semaines, la ligne « test sem. 1 » de G5 que si une
 * référence manque, les semaines réduites de G4 que si deux d'entre elles sont bloquées. La recette
 * a besoin d'atteindre chaque état directement, sans cliquer six fois.
 *
 * Les valeurs sont EXACTEMENT celles du canevas : 70.3 Vichy à 11 semaines, 7 h 30 sur 6 jours,
 * vendredi libre, 2 N / 3 V / 3 C, semaines 04 et 05 réduites, CSS et FTP connus, seuil à tester.
 */
const GENERATOR_PREVIEW_STATES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', '06'] as const
export type GeneratorPreviewState = (typeof GENERATOR_PREVIEW_STATES)[number]

function isPreviewState(value: string | undefined): value is GeneratorPreviewState {
  return GENERATOR_PREVIEW_STATES.includes(value as GeneratorPreviewState)
}

/** Le canevas montre « dans 11 semaines » : la course tombe donc onze semaines après le jour d'essai. */
const CANVAS_WEEKS_TO_RACE = 11

function canvasForm(today: string): GeneratorForm {
  const base = createInitialForm(demoAthleteProfile, today)
  return {
    ...base,
    format: '70.3',
    raceName: 'Vichy',
    noRace: false,
    // Le dimanche à onze semaines, comme l'écrit le canevas sous le champ de date.
    raceDate: defaultRaceDate(today, CANVAS_WEEKS_TO_RACE),
    weeklyVolumeTargetMin: 450,
    sustainableMaxMin: 540,
    availableDays: [true, true, true, true, false, true, true],
    maxSessionsPerDiscipline: { N: 2, V: 3, C: 3 },
    constraints: {
      pool: true,
      openWater: true,
      homeTrainer: true,
      powerMeter: false,
      timeTrialBike: true,
      blockedWeeks: [
        { weekNumber: 4, reason: 'déplacement pro : volume réduit, pas de longue sortie' },
        { weekNumber: 5, reason: 'déplacement pro : volume réduit, pas de longue sortie' },
      ],
    },
    // G5 : CSS et FTP repris du profil, seuil en course absent — c'est lui qui déclenche le test.
    references: {
      cssPaceMinPer100m: demoAthleteProfile.css?.paceMinPer100m,
      ftpWatts: demoAthleteProfile.ftp?.watts,
      runThresholdPaceMinPerKm: undefined,
    },
    testSessions: { N: false, V: false, C: true },
  }
}

const STEPS: Record<Exclude<GeneratorPreviewState, '06'>, (props: GeneratorStepProps) => ReactElement> = {
  G1: StepFormat,
  G2: StepDate,
  G3: StepAvailability,
  G4: StepConstraints,
  G5: StepReferences,
  G6: StepSummary,
}

export function GeneratorPreview() {
  const { state } = useParams<{ state: string }>()
  const today = useMemo(() => todayIso(), [])
  // L'aperçu reste manipulable : cocher un jour ou bouger le curseur doit se voir, sinon on ne
  // mesure qu'un écran mort.
  const [form, setForm] = useState<GeneratorForm>(() => canvasForm(today))

  if (!isPreviewState(state)) {
    return <p className="preview-error">État inconnu. Attendus : {GENERATOR_PREVIEW_STATES.join(' · ')}</p>
  }

  if (state === '06') {
    // Le repli du canevas : un 70.3 demandé à 11 semaines, un olympique proposé à la place.
    const fallback = generatePlan({ ...form, format: 'Olympique' }, today, SEED_WORKOUTS, {
      idPrefix: 'apercu-simulation',
    })
    return (
      <SimulationScreen
        requestedFormat={form.format}
        requestedRaceDate={form.raceDate}
        weeksAvailable={CANVAS_WEEKS_TO_RACE}
        fallback={fallback}
        onAcceptFallback={() => undefined}
        onForceRequested={() => undefined}
        onBack={() => undefined}
      />
    )
  }

  const Step = STEPS[state]
  return (
    <Step
      form={form}
      today={today}
      onChange={(patch) => setForm({ ...form, ...patch })}
      onBack={() => undefined}
      onContinue={() => undefined}
      onGoToStep={() => undefined}
    />
  )
}
