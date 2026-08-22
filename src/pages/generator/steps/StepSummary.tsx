import type { ReactNode } from 'react'
import type { GeneratorStepId } from '../../../domain/planGenerator/form'
import { TRAINING_DISCIPLINES, availableDayCount } from '../../../domain/planGenerator/form'
import { formatDayMonthLong, weeksUntilRace } from '../../../domain/planGenerator/dates'
import { raceFormat } from '../../../domain/planGenerator/formats'
import { formatDurationMin } from '../../../domain/workoutFormat'
import { GeneratorSection, GeneratorStepFrame } from '../GeneratorStepFrame'
import { StatRow } from '../GeneratorRows'
import type { GeneratorStepProps } from '../stepProps'
import styles from './StepSummary.module.css'

/** Statut d'une règle de génération — c'est le cœur de l'honnêteté produit de cet écran. */
type EngineRuleStatus =
  /** Appliquée et sourcée : pastille en aplat encre. */
  | 'applied'
  /** Règle métier assumée, sans source citée : pastille en contour 2 px. */
  | 'rule'
  /** Écartée faute de preuve : pastille hachurée. */
  | 'discarded'

interface EngineRule {
  status: EngineRuleStatus
  text: string
  noteNumber?: number
}

const ENGINE_RULES: EngineRule[] = [
  { status: 'applied', text: 'Placer 4 phases et un affûtage de 2 semaines', noteNumber: 2 },
  { status: 'applied', text: 'Répartir 78 % du volume en Z1–Z2', noteNumber: 3 },
  { status: 'rule', text: 'Caler les longues sorties sur le samedi' },
  { status: 'discarded', text: 'Aucun calcul de charge type ACWR : écarté faute de preuve' },
]

const RULE_PIP_CLASS: Record<EngineRuleStatus, string> = {
  applied: styles.pipApplied,
  rule: styles.pipRule,
  discarded: styles.pipDiscarded,
}

const RULE_PIP_LABEL: Record<EngineRuleStatus, string> = {
  applied: 'Appliqué et sourcé',
  rule: 'Règle métier sans source',
  discarded: 'Écarté',
}

/** Formes courtes du canevas pour le résumé de contraintes (« piscine 2×, HT, sem. 04–05 »). */
const CONSTRAINT_SHORT_LABELS = [
  ['pool', 'piscine'],
  ['openWater', 'eau libre'],
  ['homeTrainer', 'HT'],
  ['powerMeter', 'capteur'],
  ['timeTrialBike', 'CLM'],
] as const

const REFERENCE_SHORT_LABELS: Record<(typeof TRAINING_DISCIPLINES)[number], string> = {
  N: 'CSS',
  V: 'FTP',
  C: 'seuil',
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** « sem. 04–05 » quand les semaines se suivent, « sem. 04, 07 » sinon. */
function formatBlockedWeeks(weekNumbers: number[]): string {
  const sorted = [...weekNumbers].sort((a, b) => a - b)
  const contiguous = sorted.every((week, index) => index === 0 || week === sorted[index - 1] + 1)
  if (sorted.length > 1 && contiguous) return `sem. ${pad2(sorted[0])}–${pad2(sorted[sorted.length - 1])}`
  return `sem. ${sorted.map(pad2).join(', ')}`
}

/**
 * G6 · Récapitulatif.
 *
 * Chaque ligne du tableau renvoie à l'étape qui l'a produite : c'est la seule façon de corriger une
 * valeur sans repartir de l'étape 1. Les valeurs sont recalculées depuis `form`, jamais mémorisées.
 */
export function StepSummary({ form, onBack, onContinue, onGoToStep, today }: GeneratorStepProps) {
  const definition = raceFormat(form.format)
  const weekCount = form.noRace ? definition.minWeeks : weeksUntilRace(today, form.raceDate)

  const formatValue = form.noRace
    ? `${form.format} · aucune course`
    : form.raceName.trim() === ''
      ? `${form.format} · course sans nom`
      : `${form.format} ${form.raceName.trim()}`

  const dateValue = form.noRace
    ? `aucune date · ${weekCount} sem.`
    : `${formatDayMonthLong(form.raceDate)} · ${weekCount} sem.`

  const dayCount = availableDayCount(form.availableDays)
  const volumeValue = `${formatDurationMin(form.weeklyVolumeTargetMin)} · ${dayCount} ${dayCount > 1 ? 'jours' : 'jour'}`

  const activeConstraints = CONSTRAINT_SHORT_LABELS.filter(([key]) => form.constraints[key]).map(
    ([, label]) => label,
  )
  const blockedNumbers = form.constraints.blockedWeeks.map((week) => week.weekNumber)
  const constraintsParts: string[] = [...activeConstraints]
  if (blockedNumbers.length > 0) constraintsParts.push(formatBlockedWeeks(blockedNumbers))
  const constraintsValue = constraintsParts.length === 0 ? 'aucune' : constraintsParts.join(', ')

  const knownReferences = TRAINING_DISCIPLINES.filter((discipline) => {
    if (discipline === 'N') return form.references.cssPaceMinPer100m !== undefined
    if (discipline === 'V') return form.references.ftpWatts !== undefined
    return form.references.runThresholdPaceMinPerKm !== undefined
  })
  const testedReferences = TRAINING_DISCIPLINES.filter(
    (discipline) => !knownReferences.includes(discipline) && form.testSessions[discipline],
  )
  const referenceParts: string[] = []
  referenceParts.push(
    knownReferences.length === 0
      ? 'aucune'
      : knownReferences.map((discipline) => REFERENCE_SHORT_LABELS[discipline]).join(', '),
  )
  if (testedReferences.length > 0) {
    referenceParts.push(
      `${testedReferences.map((discipline) => REFERENCE_SHORT_LABELS[discipline]).join(', ')} à tester`,
    )
  }
  const referencesValue = referenceParts.join(' · ')

  const rows: { label: string; value: ReactNode; step: GeneratorStepId }[] = [
    { label: 'FORMAT', value: formatValue, step: 'format' },
    { label: 'DATE', value: dateValue, step: 'date' },
    { label: 'VOLUME', value: volumeValue, step: 'availability' },
    { label: 'CONTRAINTES', value: constraintsValue, step: 'constraints' },
    { label: 'RÉFÉRENCES', value: referencesValue, step: 'references' },
  ]

  return (
    <GeneratorStepFrame
      stepIndex={6}
      titleLines={['Récapi-', 'tulatif']}
      headNote="chaque ligne renvoie à son étape"
      onBack={onBack}
      ctaLabel="Générer le plan"
      onContinue={onContinue}
      footerNote="L'étape suivante est une simulation : rien n'est enregistré avant que tu l'acceptes."
    >
      <GeneratorSection noRule gap="sm">
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Étape</span>
            <span>Valeur</span>
          </div>
          <div className={styles.tableBody}>
            {rows.map((row) => (
              <StatRow
                key={row.label}
                monoLabel
                label={row.label}
                value={row.value}
                onClick={() => onGoToStep(row.step)}
              />
            ))}
          </div>
        </div>
      </GeneratorSection>

      <GeneratorSection label="Ce que le moteur va faire" gap="sm">
        <ul className={styles.rules}>
          {ENGINE_RULES.map((rule) => (
            <li key={rule.text} className={styles.rule}>
              <span
                className={RULE_PIP_CLASS[rule.status]}
                role="img"
                aria-label={RULE_PIP_LABEL[rule.status]}
              />
              <span className={styles.ruleText}>
                {rule.text}
                {rule.noteNumber !== undefined && (
                  <sup className={styles.ruleNote}>{rule.noteNumber}</sup>
                )}
              </span>
            </li>
          ))}
        </ul>
      </GeneratorSection>
    </GeneratorStepFrame>
  )
}
