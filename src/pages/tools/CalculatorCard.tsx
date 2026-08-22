import { useNavigate } from 'react-router-dom'
import type { AthleteProfile } from '../../domain/types'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import {
  initialValues,
  type CalculatorDefinition,
  type CalculatorField,
  type CalculatorValues,
} from './calculators/registry'
import { calculatorPath } from './toolsRoutes'
import styles from './CalculatorCard.module.css'

/** Deux jetons de saisie au plus, comme les quatre cartes de l'artboard S8. */
const CHIP_LIMIT = 2

function chipLabel(field: CalculatorField, values: CalculatorValues): { value: string; unit: string } {
  const raw = values[field.key] ?? ''
  const option = field.options?.find((choice) => choice.value === raw)
  return {
    value: option ? option.label : raw,
    unit: field.short ?? field.unit ?? field.label.toLowerCase(),
  }
}

/**
 * Résumé du résultat pour la carte. Les calculateurs à grande valeur la donnent telle quelle
 * (`244 W`) ; ceux qui sortent un tableau de zones donnent leur ligne de seuil, comme la carte
 * « Allures course » de l'artboard S8 (`Z4 · 4:12 /km`).
 */
function summarize(definition: CalculatorDefinition, values: CalculatorValues, profile: AthleteProfile | undefined) {
  const outcome = definition.run(values, profile)
  if (!outcome.ok) return null
  if (outcome.headline) {
    return outcome.headlineUnit ? `${outcome.headline} ${outcome.headlineUnit}` : outcome.headline
  }
  const threshold = outcome.rows?.find((row) => row.label === 'Z4')
  if (threshold) return `${threshold.label} · ${threshold.value}`
  return outcome.rows?.[0] ? `${outcome.rows[0].label} · ${outcome.rows[0].value}` : null
}

export interface CalculatorCardProps {
  definition: CalculatorDefinition
  profile: AthleteProfile | undefined
}

export function CalculatorCard({ definition, profile }: CalculatorCardProps) {
  const navigate = useNavigate()
  const values = initialValues(definition, profile)
  const summary = summarize(definition, values, profile)

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>{definition.cardTitle}</h2>
        <span className={styles.index}>{String(definition.index).padStart(2, '0')}</span>
      </div>
      <p className={styles.description}>{definition.cardDescription}</p>

      <div className={styles.inputs}>
        {definition.fields.slice(0, CHIP_LIMIT).map((field) => {
          const chip = chipLabel(field, values)
          return (
            <span key={field.key} className={styles.chip}>
              <span className={chip.value === '' ? styles.chipValueEmpty : styles.chipValue}>
                {chip.value === '' ? '—' : chip.value}
              </span>
              <span className={styles.chipUnit}>{chip.unit}</span>
            </span>
          )
        })}
      </div>

      <div className={styles.footer}>
        <span className={summary ? styles.result : `${styles.result} ${styles.resultEmpty}`}>
          {summary ?? '—'}
        </span>
        <SecondaryAction
          className={styles.action}
          onClick={() => navigate(calculatorPath(definition.id))}
          aria-label={`Ouvrir le calculateur ${definition.cardTitle}`}
        >
          Calculer
        </SecondaryAction>
      </div>
    </article>
  )
}
