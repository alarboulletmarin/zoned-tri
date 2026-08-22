// Forme de retour commune a tous les calculateurs (cf. thoughts/shared/research/2026-08-21-calculators-spec.md)
//
// Choix : un calculateur qui porte une AFFIRMATION scientifique (zones, estimations)
// retourne { value, proofLevel: ProofLevel, source } — l'UI peut afficher <ProofBadge> +
// <EvidenceNote> directement depuis ce retour, sans dupliquer la logique de preuve.
//
// Un calculateur qui n'est qu'une DEFINITION mathematique ou une conversion d'unite
// (IF, TSS, convertisseur d'allure) retourne { value, proofLevel: 'definition' } — l'UI
// ne doit jamais afficher un badge SOLIDE/MODEREE/FAIBLE dessus.
//
// Un calculateur qui applique une regle produit assumee mais non sourcee (pacing
// multi-segments) retourne { value, proofLevel: 'product_rule', source } avec `source`
// utilise comme texte d'avertissement produit plutot que comme citation academique.
import type { ProofLevel } from '../types'

export type { ProofLevel }

export type CalculatorProofLevel = ProofLevel | 'definition' | 'product_rule'

export interface CalculatorResult<T> {
  value: T
  proofLevel: CalculatorProofLevel
  source: string
}

export function definitionResult<T>(value: T, source: string): CalculatorResult<T> {
  return { value, proofLevel: 'definition', source }
}

export function evidenceResult<T>(value: T, proofLevel: ProofLevel, source: string): CalculatorResult<T> {
  return { value, proofLevel, source }
}

export function productRuleResult<T>(value: T, source: string): CalculatorResult<T> {
  return { value, proofLevel: 'product_rule', source }
}
