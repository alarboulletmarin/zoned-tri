import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet/ConfirmSheet'
import { UndoToast } from '../../components/ui/UndoToast/UndoToast'
import { usePlans, useRaces, useWorkouts } from '../../context/AppDataContext'
import { weeksElapsed } from '../../domain/planMacro'
import { todayIso } from '../../domain/planWeek'
import type { Race, TrainingPlan } from '../../domain/types'
import { PLAN_PATH } from '../../navigation'
import { PlansScreen } from './PlansScreen'

function planTitle(plan: TrainingPlan, races: Race[]): string {
  return (plan.raceId ? races.find((race) => race.id === plan.raceId)?.name : undefined) ?? plan.format
}

/** Ce qu'il faut garder pour revenir à l'état exact d'avant pendant les 6 s du bandeau. */
interface UndoState {
  message: string
  previous: TrainingPlan[]
}

/**
 * `/plans` — écran 41.
 *
 * Rouvrir un plan archivé écrit dans la base : ce n'est pas une navigation, c'est un changement de
 * plan actif, et c'est « Aujourd'hui » qui bascule derrière. La règle §3.5 du système s'applique
 * donc en entier — la feuille montre l'effet AVANT (`ConfirmSheet`, dont `effect` est obligatoire),
 * puis le bandeau laisse 6 s pour revenir en arrière (`UndoToast`).
 *
 * L'artboard ne dessine pas cette feuille : il ne dessine pas non plus la suppression que sa note
 * de pied annonce. Ce qui est ajouté ici n'est pas un contenu inventé, c'est la garantie que le
 * produit s'impose sur toute écriture.
 */
export function PlansRoute() {
  const navigate = useNavigate()
  const { plans, savePlan, loading } = usePlans()
  const { races } = useRaces()
  const { workouts } = useWorkouts()

  const [pendingId, setPendingId] = useState<string | null>(null)
  const [undo, setUndo] = useState<UndoState | null>(null)

  const today = todayIso()
  const activePlan = plans.find((plan) => plan.status === 'active')
  const pending = pendingId ? plans.find((plan) => plan.id === pendingId) : undefined

  const reopen = useCallback(
    async (target: TrainingPlan, current: TrainingPlan | undefined) => {
      const previous = current ? [target, current] : [target]

      await savePlan({ ...target, status: 'active' })
      if (current) {
        await savePlan({
          ...current,
          status: 'archived_abandoned',
          abandonedAtWeek: Math.max(1, weeksElapsed(current, today)),
        })
      }

      setPendingId(null)
      setUndo({ message: `« ${planTitle(target, races)} » est redevenu le plan actif`, previous })
    },
    [savePlan, races, today],
  )

  const applyUndo = useCallback(async () => {
    if (!undo) return
    for (const plan of undo.previous) await savePlan(plan)
    setUndo(null)
  }, [undo, savePlan])

  if (loading) return null

  return (
    <>
      <PlansScreen
        plans={plans}
        races={races}
        workouts={workouts}
        today={today}
        onResume={() => navigate('/plan')}
        onGenerate={() => navigate('/generate-plan')}
        onReopen={setPendingId}
        onBack={() => navigate(PLAN_PATH)}
      />

      {pending && (
        <ConfirmSheet
          isOpen
          title={`Rouvrir « ${planTitle(pending, races)} » ?`}
          effect={
            <>
              <p>
                « {planTitle(pending, races)} » redevient le plan actif : c’est lui qui alimentera « Aujourd’hui ».
              </p>
              {activePlan && (
                <p>
                  « {planTitle(activePlan, races)} » passe en archive à la semaine{' '}
                  {String(Math.max(1, weeksElapsed(activePlan, today))).padStart(2, '0')}. Rien n’est supprimé : sa
                  progression est conservée et il se reprend là où il s’arrête.
                </p>
              )}
            </>
          }
          confirmLabel="Rouvrir ce plan"
          onConfirm={() => void reopen(pending, activePlan)}
          onCancel={() => setPendingId(null)}
        />
      )}

      {undo && (
        <UndoToast message={undo.message} onUndo={() => void applyUndo()} onExpire={() => setUndo(null)} />
      )}
    </>
  )
}
