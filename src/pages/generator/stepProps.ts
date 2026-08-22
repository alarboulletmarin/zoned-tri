import type { GeneratorForm, GeneratorStepId } from '../../domain/planGenerator/form'

/**
 * Contrat unique des 6 composants d'étape (G1→G6).
 *
 * Chaque étape est un composant contrôlé : elle ne détient aucun état de formulaire, elle lit
 * `form` et publie ses modifications par `onChange`. La machine à états du parcours
 * (`GeneratePlanScreen`) détient l'unique exemplaire de `GeneratorForm`.
 */
export interface GeneratorStepProps {
  form: GeneratorForm
  /** Fusion superficielle dans le formulaire (`onChange({ format: 'Sprint' })`). */
  onChange: (patch: Partial<GeneratorForm>) => void
  /** Étape précédente — à l'étape 1, sortie du parcours. */
  onBack: () => void
  /** Étape suivante — à l'étape 6, lancement de la génération. */
  onContinue: () => void
  /** Saut direct vers une étape (G6 : « chaque ligne renvoie à son étape »). */
  onGoToStep: (step: GeneratorStepId) => void
  /** Jour courant ISO, injecté pour garder les étapes testables sans horloge. */
  today: string
}
