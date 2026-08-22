import { useParams } from 'react-router-dom'
import { demoPastRace, demoPlan, demoRace, demoWorkouts } from '../../domain/demoData'
import type { TrainingPlan } from '../../domain/types'
import { PlansScreen } from './PlansScreen'

/**
 * Atelier d'aperçu de « Mes plans » — **développement uniquement**, monté par `App` derrière
 * `import.meta.env.DEV`, sur le patron de `TodayPreview`. Il n'existe pas dans l'application
 * livrée et n'apparaît dans aucune navigation.
 *
 * Raison d'être : l'artboard 41 suppose trois plans sur l'appareil (un en cours, deux archivés) ;
 * `demoData` n'en porte qu'un, et le produit ne montre jamais de faux plan (règle de l'artboard
 * 01b). L'aperçu est le seul moyen d'inspecter l'écran sans en générer trois à la main.
 */
const PREVIEW_STATES = ['41'] as const
type PreviewState = (typeof PREVIEW_STATES)[number]

/** Lundi de la semaine 07 de `demoPlan` : la semaine que le canevas montre en cours. */
const PREVIEW_TODAY = '2026-06-15'

/** Retire `raceId` sans laisser la clé à `undefined` (`exactOptionalPropertyTypes`). */
function withoutRace(plan: TrainingPlan): TrainingPlan {
  const copy = { ...plan }
  delete copy.raceId
  return copy
}

/**
 * Les deux plans archivés que l'artboard 41 liste (l. 3862-3868).
 *
 * Le premier est celui du « Sprint de Senlis », la course déjà courue de `demoData` : douze
 * semaines terminées le 18 mai. Le second est abandonné en semaine 09 — le canevas l'appelle
 * « Hiver base », un nom que `TrainingPlan` ne porte pas ; sans course rattachée, la ligne retombe
 * sur le format du plan, et l'écart est signalé dans le rapport de reprise.
 *
 * Seules les métadonnées de la liste sont renseignées : `weeks` reste vide, un plan archivé n'est
 * rejoué par aucun écran tant qu'il n'est pas rouvert.
 */
const previewArchivedPlans: TrainingPlan[] = [
  {
    ...demoPlan,
    id: 'demo-plan-sprint-senlis',
    raceId: demoPastRace.id,
    format: 'Sprint',
    startDate: '2026-02-23',
    endDate: '2026-05-18',
    weeksCount: 12,
    status: 'archived_completed',
    phases: [],
    weeks: [],
  },
  {
    ...withoutRace(demoPlan),
    id: 'demo-plan-hiver-base',
    format: 'Olympique',
    startDate: '2025-12-15',
    endDate: '2026-04-05',
    weeksCount: 16,
    status: 'archived_abandoned',
    abandonedAtWeek: 9,
    phases: [],
    weeks: [],
  },
]

export function PlansPreview() {
  const { state } = useParams<{ state: string }>()

  if (!PREVIEW_STATES.includes(state as PreviewState)) {
    return <p className="preview-error">État inconnu. Attendus : {PREVIEW_STATES.join(' · ')}</p>
  }

  return (
    <PlansScreen
      plans={[demoPlan, ...previewArchivedPlans]}
      races={[demoRace, demoPastRace]}
      workouts={demoWorkouts}
      today={PREVIEW_TODAY}
      onResume={() => undefined}
      onGenerate={() => undefined}
      onReopen={() => undefined}
      onBack={() => undefined}
    />
  )
}
