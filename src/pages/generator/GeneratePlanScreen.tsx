import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile, usePlans, useRaces } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import { currentWeekOf } from '../../domain/todayState'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { weeksUntilRace } from '../../domain/planGenerator/dates'
import { largestFormatWithin, raceFormat } from '../../domain/planGenerator/formats'
import {
  GENERATOR_STEPS,
  createInitialForm,
  type GeneratorForm,
  type GeneratorStepId,
} from '../../domain/planGenerator/form'
import { generatePlan } from '../../domain/planGenerator/generatePlan'
import { buildCommitEffect, type CommitEffect } from '../../domain/planGenerator/commitEffect'
import {
  clearGeneratorDraft,
  readGeneratorDraft,
  writeGeneratorDraft,
} from '../../domain/planGenerator/draft'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet/ConfirmSheet'
import type { GeneratedPlan } from '../../domain/planGenerator/summary'
import type { Race } from '../../domain/types'
import { OPENING_PATH, PLAN_PATH } from '../../navigation'
import type { GeneratorStepProps } from './stepProps'
import { StepFormat } from './steps/StepFormat'
import { StepDate } from './steps/StepDate'
import { StepAvailability } from './steps/StepAvailability'
import { StepConstraints } from './steps/StepConstraints'
import { StepReferences } from './steps/StepReferences'
import { StepSummary } from './steps/StepSummary'
import { SimulationScreen } from './SimulationScreen'

const STEP_COMPONENTS: Record<GeneratorStepId, (props: GeneratorStepProps) => ReactElement> = {
  format: StepFormat,
  date: StepDate,
  availability: StepAvailability,
  constraints: StepConstraints,
  references: StepReferences,
  summary: StepSummary,
}

interface SimulationState {
  fallback: GeneratedPlan
  weeksAvailable: number
}

/** Un plan généré, en attente de la confirmation qui l'écrira. */
interface PendingCommit {
  generated: GeneratedPlan
  raceName: string
  raceDate: string
}

/** L'étape courante vit dans l'URL : `/generate-plan?etape=references`. */
const STEP_PARAM = 'etape'

/**
 * Identifiant unique du plan à générer.
 *
 * Le moteur est pur : à entrées égales il rend le même identifiant. C'est ce qu'on veut pour les
 * tests, mais pas ici — deux générations successives avec les mêmes réponses écraseraient le plan
 * précédent au lieu de l'archiver, ce que la règle « Générer n'écrase rien » (écran 01c) interdit.
 * L'unicité est donc décidée ici, au moment de l'action, et injectée dans le moteur.
 */
function newPlanId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Route `/generate-plan` — machine à états du parcours G1→G6.
 *
 * Un seul écran qui avance : le compteur « 01 / 06 » et la barre à segments changent, la coquille
 * ne change pas (canevas, section 01·B : « 6 étapes · un seul écran, le compteur avance »).
 *
 * Cet écran détient l'unique exemplaire du formulaire ; les 6 composants d'étape sont contrôlés
 * et ne gardent aucun état. Rien n'est écrit en base tant que l'utilisateur n'a pas accepté :
 * « Générer le plan » enregistre directement quand le délai tient, et passe par l'écran 06 ·
 * Simulation (cadre pointillé, aucune écriture) quand il ne tient pas.
 */
export function GeneratePlanScreen() {
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const { profile, loading: profileLoading } = useProfile()
  const { plans, savePlan, savePlanWithWorkouts } = usePlans()
  const { saveRace } = useRaces()

  const today = useMemo(() => todayIso(), [])
  // Le brouillon est lu UNE fois, au montage : après, c'est l'état React qui fait foi et le
  // brouillon n'est plus qu'une copie de sauvegarde qu'on écrit derrière lui.
  const [draft] = useState(() => readGeneratorDraft())
  const [edited, setEdited] = useState<GeneratorForm | null>(draft?.form ?? null)
  const [simulation, setSimulation] = useState<SimulationState | null>(null)
  const [pending, setPending] = useState<PendingCommit | null>(null)
  const [saving, setSaving] = useState(false)

  // L'étape vit dans l'URL (`?etape=references`). Elle était un `useState` : le bouton « retour »
  // du navigateur sortait donc du parcours d'un coup, depuis n'importe quelle étape, et un
  // rechargement le ramenait à l'étape 1 avec les réponses perdues. Elle est maintenant une
  // adresse : on recule d'une étape, on partage l'endroit où l'on en est, on recharge sans casse.
  const requested = search.get(STEP_PARAM)
  const stepFromUrl = GENERATOR_STEPS.indexOf(requested as GeneratorStepId)
  const stepIndex = stepFromUrl === -1 ? 0 : stepFromUrl

  const goToStep = useCallback(
    (index: number, options: { replace?: boolean } = {}) => {
      const clamped = Math.min(Math.max(index, 0), GENERATOR_STEPS.length - 1)
      setSearch({ [STEP_PARAM]: GENERATOR_STEPS[clamped]! }, { replace: options.replace ?? false })
    },
    [setSearch],
  )

  // Le formulaire de départ reprend les références du profil : on attend donc que la base soit
  // lue. Tant que l'utilisateur n'a rien modifié, la valeur est dérivée au rendu ; dès sa première
  // saisie, `edited` prend le relais et le profil ne repasse plus par-dessus.
  const initialForm = useMemo(
    () => (profileLoading ? null : createInitialForm(profile, today)),
    [profileLoading, profile, today],
  )
  const form = edited ?? initialForm

  // Une adresse sans étape reprend celle du brouillon, s'il y en a un : rouvrir `/generate-plan`
  // après un rechargement remet exactement là où l'on en était, réponses comprises.
  useEffect(() => {
    if (requested === null && draft) goToStep(GENERATOR_STEPS.indexOf(draft.step), { replace: true })
  }, [draft, goToStep, requested])

  // Le brouillon suit les réponses, pas l'inverse : on n'écrit que ce que l'utilisateur a saisi.
  useEffect(() => {
    if (edited) writeGeneratorDraft({ form: edited, step: GENERATOR_STEPS[stepIndex]! })
  }, [edited, stepIndex])

  /**
   * « Générer n'écrase rien : le plan en cours passe en archive » (écran 01c) et « un seul plan
   * alimente Aujourd'hui » : le plan actif précédent est donc archivé — pas supprimé — avant que
   * le nouveau ne prenne sa place. La semaine atteinte est conservée, c'est elle qui permettra
   * de le « reprendre là où il s'était arrêté ».
   */
  const commit = useCallback(
    async (generated: GeneratedPlan, raceName: string, raceDate: string) => {
      setSaving(true)
      for (const previous of plans.filter((plan) => plan.status === 'active')) {
        await savePlan({
          ...previous,
          status: 'archived_abandoned',
          abandonedAtWeek: currentWeekOf(previous, today)?.weekNumber ?? previous.abandonedAtWeek,
        })
      }

      // Le catalogue de courses est reporté : la course visée est une saisie libre. On en fait
      // quand même une vraie fiche `Race` — nom, date, distances du format — sinon le nom saisi
      // disparaîtrait et l'application n'afficherait jamais que « 70.3 » au lieu de « 70.3 Vichy ».
      // Rien n'est inventé au-delà des distances officielles du format.
      const trimmedName = raceName.trim()
      let plan = generated.plan
      if (trimmedName && raceDate) {
        const race: Race = {
          id: `race-${generated.plan.id}`,
          name: trimmedName,
          date: raceDate,
          format: generated.plan.format,
          role: 'primary_goal',
          distances: raceFormat(generated.plan.format).distances,
        }
        await saveRace(race)
        plan = { ...plan, raceId: race.id }
      }

      await savePlanWithWorkouts(plan, generated.workouts)
      // Le brouillon a un successeur : il n'a plus de raison d'être, et le laisser ferait rouvrir
      // le générateur sur les réponses d'un plan déjà écrit.
      clearGeneratorDraft()
      navigate(PLAN_PATH)
    },
    [navigate, plans, savePlan, savePlanWithWorkouts, saveRace, today],
  )

  /**
   * Rien ne s'écrit sans que l'écriture ait été montrée (règle nº 2).
   *
   * Le pied du récapitulatif promettait « l'étape suivante est une simulation : rien n'est
   * enregistré avant que tu l'acceptes » — ce qui n'était vrai QUE quand le délai était trop
   * court. Dans le cas courant, « Générer le plan » écrivait le plan, ses séances, une fiche de
   * course, et archivait le plan en cours, d'un seul clic et sans un mot.
   */
  const askToCommit = useCallback(
    (generated: GeneratedPlan, raceName: string, raceDate: string) => {
      setPending({ generated, raceName, raceDate })
    },
    [],
  )

  const handleGenerate = useCallback(
    (current: GeneratorForm) => {
      const requestedFormat = raceFormat(current.format)
      const weeksAvailable = current.noRace
        ? requestedFormat.minWeeks
        : weeksUntilRace(today, current.raceDate)

      if (!current.noRace && weeksAvailable < requestedFormat.minWeeks) {
        // Repli : on GÉNÈRE le plan de repli pour pouvoir en montrer les vrais compteurs, mais on
        // ne l'écrit pas. Quand même un sprint ne tient pas dans le délai, on simule tout de même
        // le format demandé : l'écran 06 dit alors la vérité plutôt que de rester vide.
        const fallbackFormat = largestFormatWithin(weeksAvailable)
        const fallbackForm: GeneratorForm = fallbackFormat
          ? { ...current, format: fallbackFormat.format }
          : current
        setSimulation({
          fallback: generatePlan(fallbackForm, today, SEED_WORKOUTS, { idPrefix: newPlanId() }),
          weeksAvailable,
        })
        return
      }

      askToCommit(
        generatePlan(current, today, SEED_WORKOUTS, { idPrefix: newPlanId() }),
        current.raceName,
        current.raceDate,
      )
    },
    [askToCommit, today],
  )

  if (form === null) return null

  const activePlan = plans.find((plan) => plan.status === 'active')

  const confirmSheet = pending && (
    <ConfirmSheet
      isOpen
      title={activePlan ? 'Remplacer ton plan en cours ?' : 'Écrire ce plan sur cet appareil ?'}
      effect={
        <ConfirmEffect
          effect={buildCommitEffect({
            generated: pending.generated,
            ...(activePlan ? { activePlan } : {}),
            raceName: pending.raceName,
            today,
          })}
        />
      }
      confirmLabel={saving ? 'Écriture…' : 'Écrire le plan'}
      onConfirm={() => {
        if (saving) return
        void commit(pending.generated, pending.raceName, pending.raceDate)
      }}
      onCancel={() => setPending(null)}
      cancelLabel="Revenir au récapitulatif"
    />
  )

  if (simulation) {
    return (
      <>
        <SimulationScreen
          requestedFormat={form.format}
          requestedRaceDate={form.raceDate}
          weeksAvailable={simulation.weeksAvailable}
          fallback={simulation.fallback}
          onAcceptFallback={() => askToCommit(simulation.fallback, form.raceName, form.raceDate)}
          onForceRequested={() =>
            askToCommit(
              generatePlan(form, today, SEED_WORKOUTS, { idPrefix: newPlanId() }),
              form.raceName,
              form.raceDate,
            )
          }
          onBack={() => setSimulation(null)}
        />
        {confirmSheet}
      </>
    )
  }

  const stepId = GENERATOR_STEPS[stepIndex]!
  const StepComponent = STEP_COMPONENTS[stepId]
  const isLastStep = stepIndex === GENERATOR_STEPS.length - 1

  return (
    <>
      <StepComponent
        form={form}
        today={today}
        onChange={(patch) => setEdited({ ...form, ...patch })}
        onBack={() => {
          // Reculer depuis la première étape, c'est quitter le parcours : on revient à l'ouverture,
          // qui est l'écran d'où part « Générer mon plan ».
          if (stepIndex === 0) navigate(OPENING_PATH)
          else goToStep(stepIndex - 1)
        }}
        onContinue={() => {
          if (saving) return
          if (isLastStep) handleGenerate(form)
          else goToStep(stepIndex + 1)
        }}
        onGoToStep={(step) => goToStep(GENERATOR_STEPS.indexOf(step))}
      />
      {confirmSheet}
    </>
  )
}

/** L'effet, tel que la feuille le montre : ce qui s'écrit, puis ce qui se déplace. */
function ConfirmEffect({ effect }: { effect: CommitEffect }) {
  return (
    <>
      <ul>
        {effect.writes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {effect.archives && <p>{effect.archives}</p>}
    </>
  )
}
