import type { ReactNode } from 'react'
import { MissingScreen, type MissingScreenExit } from '../../components/MissingScreen'
import { GENERATOR_PATH, PLANS_PATH, PLAN_PATH, type TrailSegment } from '../../navigation'

/**
 * Une section du Plan qui n'a rien à montrer, faute de plan actif.
 *
 * C'est `MissingScreen` avec les deux sorties que le manque appelle toujours ici : générer un plan,
 * et — s'il y en a — rouvrir un plan archivé. Sept routes du Plan renvoyaient à l'ouverture par un
 * `<Navigate replace />` muet ; elles s'ouvrent désormais, vides, en disant ce qui manque.
 */
export interface PlanMissingScreenProps {
  trail: TrailSegment[]
  headline: string[]
  sentence: ReactNode
  /** Sortie supplémentaire, quand l'écran en a une de plus que « générer un plan ». */
  extraExit?: { label: string; to: string }
  /** Nombre de plans archivés : s'il y en a, on ne propose pas d'en générer un sans le dire. */
  archivedCount?: number
}

export function PlanMissingScreen({
  trail,
  headline,
  sentence,
  extraExit,
  archivedCount = 0,
}: PlanMissingScreenProps) {
  const exits: MissingScreenExit[] = [{ label: 'Générer un plan', to: GENERATOR_PATH, primary: true }]

  if (archivedCount > 0) {
    exits.push({
      label:
        archivedCount > 1
          ? `Rouvrir un de mes ${archivedCount} plans archivés`
          : 'Rouvrir mon plan archivé',
      to: PLANS_PATH,
    })
  }

  if (extraExit) exits.push(extraExit)

  return (
    <MissingScreen trail={trail} headline={headline} sentence={sentence} exits={exits} backTo={PLAN_PATH} />
  )
}
