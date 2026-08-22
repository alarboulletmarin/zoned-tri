import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../../context/AppDataContext'
import type { AthleteProfile } from '../../domain/types'
import type { CalculatorProofLevel, ProofLevel } from '../../domain/calculators/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ZoneTag } from '../../components/ui/Badge/Badge'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { ProofGauge } from '../../components/ui/ProofBadge/ProofBadge'
import {
  calculatorCounter,
  findCalculator,
  initialValues,
  type CalculatorField,
  type CalculatorSuccess,
  type CalculatorValues,
} from './calculators/registry'
import { CALCULATORS_PATH } from './toolsRoutes'
import styles from './CalculatorScreen.module.css'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'

const EVIDENCE_LEVELS: CalculatorProofLevel[] = ['solid', 'moderate', 'weak']

/** Les deux niveaux qui ne portent PAS de jauge : ce ne sont pas des affirmations scientifiques. */
const KIND_LABEL: Record<string, string> = {
  definition: 'définition',
  product_rule: 'règle produit',
}

function isEvidence(level: CalculatorProofLevel): level is ProofLevel {
  return EVIDENCE_LEVELS.includes(level)
}

export interface CalculatorScreenProps {
  /** Injectés par l'atelier d'aperçu et les tests. */
  id?: string
  profile?: AthleteProfile
}

/**
 * Écran 13 · Calculateur — la fiche d'un des douze : la saisie, le résultat, et la source qui
 * justifie la formule. Aucune formule ne vit ici : `definition.run` appelle le calculateur du
 * domaine et rend son `proofLevel` et son `source` tels qu'ils en sortent.
 */
export function CalculatorScreen({ id: idProp, profile: profileProp }: CalculatorScreenProps) {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile: storedProfile } = useProfile()

  const profile = profileProp ?? storedProfile
  const definition = findCalculator(idProp ?? params.id)

  // Les saisies de l'athlète, par-dessus les valeurs de départ tirées du profil : le profil qui
  // arrive après le premier rendu remplit les champs, sans jamais écraser ce qui a été tapé.
  const [edits, setEdits] = useState<CalculatorValues>({})

  if (!definition) {
    return (
      <div className={styles.screen}>
        <AppHeader variant="detail" trail={['Outils', 'Calculateurs']} onBack={() => navigate(CALCULATORS_PATH)} />
        <p className={styles.notFound}>Calculateur inconnu.</p>
      </div>
    )
  }

  const values: CalculatorValues = { ...initialValues(definition, profile), ...edits }
  const outcome = definition.run(values, profile)
  const [firstField, ...others] = definition.fields
  // L'artboard 13 écrit la longueur du bassin DANS l'étiquette du champ principal : les choix
  // marqués `inlineWithLabel` s'y rangent, les autres forment la rangée du dessous.
  const inlineFields = others.filter((field) => field.inlineWithLabel)
  const restFields = others.filter((field) => !field.inlineWithLabel)

  return (
    <div className={styles.screen}>
      <AppHeader variant="detail" trail={['Outils', 'Calculateurs']} onBack={() => navigate(CALCULATORS_PATH)} />

      <div className={styles.column}>
        <div className={styles.head}>
          <div className={styles.counter}>Calculateur {calculatorCounter(definition)}</div>
          <StackedTitle className={styles.title} lines={definition.titleLines} />
        </div>

        <div
          className={styles.frieze}
          style={{
            background: definition.discipline
              ? `var(--color-discipline-${definition.discipline.toLowerCase()})`
              : 'var(--color-ink)',
          }}
          aria-hidden="true"
        />

        <div className={styles.fields}>
          {firstField && (
            <Field
              field={firstField}
              value={values[firstField.key] ?? ''}
              onChange={(next) => setEdits((current) => ({ ...current, [firstField.key]: next }))}
              inline={inlineFields.map((field) => (
                <Choices
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ''}
                  onChange={(next) => setEdits((current) => ({ ...current, [field.key]: next }))}
                  compact
                />
              ))}
            />
          )}
          {restFields.length > 0 && (
            <div className={styles.fieldRow}>
              {restFields.map((field) => (
                <div key={field.key} className={styles.field}>
                  <Field
                    field={field}
                    value={values[field.key] ?? ''}
                    onChange={(next) => setEdits((current) => ({ ...current, [field.key]: next }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <section className={styles.block}>
          <div className={styles.blockLabel}>{definition.resultLabel}</div>
          {outcome.ok ? (
            <Result outcome={outcome} noteNumber={definition.footnote ? definition.footnote.mark : undefined} />
          ) : (
            <EmptyState className={styles.resultEmpty} sentence={outcome.reason} />
          )}
        </section>

        {(definition.worth || outcome.ok) && (
          <section className={styles.block}>
            <div className={styles.worthHeader}>
              <span className={styles.blockLabel}>Ce que vaut ce chiffre</span>
              {outcome.ok &&
                (isEvidence(outcome.proofLevel) ? (
                  <ProofGauge level={outcome.proofLevel} />
                ) : (
                  <span className={styles.worthKind}>{KIND_LABEL[outcome.proofLevel] ?? outcome.proofLevel}</span>
                ))}
            </div>
            {/* Quand l'artboard écrit lui-même le paragraphe (13), il DIT déjà la source : la
                répéter en dessous ferait doublon. Les onze autres fiches n'ont pas de paragraphe
                d'artboard — c'est alors la source du calculateur qui tient ce rôle. */}
            {definition.worth ? (
              <p className={styles.worthText}>{definition.worth}</p>
            ) : (
              outcome.ok && <div className={styles.worthSource}>Source · {outcome.source}</div>
            )}
          </section>
        )}

        {definition.footnote && (
          <div className={styles.footnote}>
            <span className={styles.footnoteMark}>{definition.footnote.mark}</span>
            <span className={styles.footnoteText}>{definition.footnote.text}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Saisie -------------------------------------------------------------------------------

function Choices({
  field,
  value,
  onChange,
  compact = false,
}: {
  field: CalculatorField
  value: string
  onChange: (next: string) => void
  /** Rangée posée sur la ligne d'étiquette : jetons plus courts, même cible de 44 px. */
  compact?: boolean
}) {
  return (
    <div className={compact ? `${styles.choices} ${styles.choicesInline}` : styles.choices} role="group" aria-label={field.label}>
      {(field.options ?? []).map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={option.value === value ? `${styles.choice} ${styles.choiceOn}` : styles.choice}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
  inline,
}: {
  field: CalculatorField
  value: string
  onChange: (next: string) => void
  /** Contrôles rangés sur la ligne d'étiquette (artboard 13 : la longueur du bassin). */
  inline?: ReactNode
}) {
  // Étiquette IMPLICITE : le champ vit dans son `<label>`, si bien que toute la hauteur du bloc —
  // l'étiquette comme la boîte — est cible de clic. C'est ce qui tient la règle des 44 px sans
  // grossir la boîte au-delà de ce que l'artboard dessine.
  const labelId = `calculateur-champ-${field.key}`
  const label = (
    <span className={field.emphasis ? styles.fieldLabel : `${styles.fieldLabel} ${styles.fieldLabelSmall}`}>
      {field.label}
    </span>
  )

  // Un choix à plus de deux options tient dans un champ unique, comme l'artboard 13 le dessine
  // (« SIGHTING · tous les 6 cycles » est une boîte, pas une rangée de jetons).
  if (field.kind === 'choice') {
    return (
      <label className={styles.fieldBlock}>
        {label}
        <span className={styles.fieldControl}>
          <select className={styles.fieldSelect} value={value} onChange={(event) => onChange(event.target.value)}>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>
    )
  }

  if (field.emphasis) {
    return (
      <div className={styles.fieldBlock}>
        {/* Les jetons de la ligne d'étiquette sont des boutons : ils restent HORS du `<label>`,
            sinon un clic dessus renverrait le focus dans le champ de saisie. */}
        <div className={styles.mainLabelRow}>
          <label htmlFor={labelId}>{label}</label>
          {inline}
        </div>
        <label className={styles.mainField} htmlFor={labelId}>
          <input
            id={labelId}
            className={styles.mainInput}
            value={value}
            inputMode={field.inputMode ?? 'text'}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.unit && <span className={styles.mainUnit}>{field.unit}</span>}
        </label>
      </div>
    )
  }

  return (
    <label className={styles.fieldBlock}>
      {label}
      <span className={styles.fieldControl}>
        <input
          className={styles.fieldInput}
          value={value}
          inputMode={field.inputMode ?? 'text'}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.unit && <span className={styles.fieldUnit}>{field.unit}</span>}
      </span>
    </label>
  )
}

// --- Résultat -----------------------------------------------------------------------------

function Result({ outcome, noteNumber }: { outcome: CalculatorSuccess; noteNumber?: string }) {
  return (
    <>
      {outcome.headline && (
        <div className={styles.headline}>
          {outcome.headline}
          {outcome.headlineUnit && <span className={styles.headlineUnit}> {outcome.headlineUnit}</span>}
          {noteNumber && <sup className={styles.headlineNote}>{noteNumber.replace('.', '')}</sup>}
        </div>
      )}
      {outcome.secondary && <div className={styles.secondary}>{outcome.secondary}</div>}

      {outcome.range && (
        <div className={styles.range}>
          <div className={styles.rangeBar} aria-hidden="true">
            <span className={styles.rangeBlank} style={{ width: `${outcome.range.lowPercent}%` }} />
            <span className={styles.rangeHatch} />
            <span className={styles.rangeBlank} style={{ width: `${100 - outcome.range.highPercent}%` }} />
          </div>
          <div className={styles.rangeLabels}>
            <span>{outcome.range.lowLabel}</span>
            <span>{outcome.range.caption}</span>
            <span>{outcome.range.highLabel}</span>
          </div>
        </div>
      )}

      {outcome.rows && outcome.rows.length > 0 && (
        <div className={styles.table}>
          {outcome.rowsHead && (
            <div className={styles.tableHead}>
              <span>{outcome.rowsHead[0]}</span>
              <span>{outcome.rowsHead[1]}</span>
            </div>
          )}
          {outcome.rows.map((row) => (
            <div key={row.label} className={styles.tableRow}>
              <span className={styles.tableLabel}>
                {row.zone ? <ZoneTag zone={row.zone} size="sm" /> : row.label}
              </span>
              <span className={styles.tableValue}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
