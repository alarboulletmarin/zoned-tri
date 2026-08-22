import { currentWeekOf } from '../todayState'
import type { TrainingPlan } from '../types'
import type { GeneratedPlan } from './summary'

/**
 * Ce que « Générer le plan » écrit — dit AVANT de l'écrire.
 *
 * Le bouton faisait trois choses d'un coup, sans en annoncer aucune : il archivait le plan actif,
 * créait une fiche de course à partir du nom saisi, et écrivait le plan et ses séances datées. La
 * règle nº 2 du produit — « rien dans le dos de l'utilisateur » — impose de montrer l'effet avant
 * l'écriture, et l'archivage du plan en cours est exactement le genre d'effet qu'on ne découvre
 * pas après coup.
 *
 * L'écran 01c promet d'ailleurs « Générer n'écrase rien : le plan en cours passe en archive ».
 * C'était vrai en base et invisible à l'écran : la promesse n'était tenue que par le code.
 */
export interface CommitEffect {
  /** Ce que le plan à venir pose sur l'appareil. */
  writes: string[]
  /** Ce que le plan à venir déplace — vide quand aucun plan n'est actif. */
  archives: string | null
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`
}

export function buildCommitEffect(input: {
  generated: GeneratedPlan
  /** Le plan actif d'avant, s'il y en a un : c'est lui qui part en archive. */
  activePlan?: TrainingPlan
  /** Nom saisi à l'étape 1, une fois nettoyé : il devient une fiche de course. */
  raceName: string
  today: string
}): CommitEffect {
  const { generated, activePlan, raceName, today } = input

  const writes = [
    `${plural(generated.plan.weeks.length, 'semaine')} de plan, du ${generated.plan.startDate} au ${generated.plan.endDate}`,
    `${plural(generated.workouts.length, 'séance')} datée${generated.workouts.length > 1 ? 's' : ''} sur cet appareil`,
  ]

  const trimmed = raceName.trim()
  if (trimmed) writes.push(`une fiche de course « ${trimmed} »`)

  if (!activePlan) return { writes, archives: null }

  const reached = currentWeekOf(activePlan, today)?.weekNumber
  const position = reached
    ? `arrêté semaine ${String(reached).padStart(2, '0')} sur ${activePlan.weeksCount}`
    : `${plural(activePlan.weeksCount, 'semaine')}`

  return {
    writes,
    archives: `Ton plan en cours (${activePlan.format}, ${position}) passe en archive. Il n’est pas supprimé : « Mes plans » le rouvre.`,
  }
}
