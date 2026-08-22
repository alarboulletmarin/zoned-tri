import type { GeneratorReferences, TrainingDiscipline } from '../../../domain/planGenerator/form'
import { TRAINING_DISCIPLINES } from '../../../domain/planGenerator/form'
import { DisciplineBadge } from '../../../components/ui/Badge/Badge'
import { ProofGauge } from '../../../components/ui/ProofBadge/ProofBadge'
import { GeneratorSection, GeneratorStepFrame } from '../GeneratorStepFrame'
import { MonoHint, ToggleRow } from '../GeneratorRows'
import type { GeneratorStepProps } from '../stepProps'
import styles from './StepReferences.module.css'

interface ReferenceField {
  discipline: TrainingDiscipline
  /** Étiquette mono du canevas : « CSS », « FTP », « SEUIL ». */
  label: string
  unit: string
  placeholder: string
  ariaLabel: string
}

const REFERENCE_FIELDS: ReferenceField[] = [
  {
    discipline: 'N',
    label: 'CSS',
    unit: '/100 m',
    placeholder: '1:32',
    ariaLabel: 'CSS en natation, minutes:secondes aux 100 m',
  },
  { discipline: 'V', label: 'FTP', unit: 'W', placeholder: '248', ariaLabel: 'FTP en vélo, en watts' },
  {
    discipline: 'C',
    label: 'SEUIL',
    unit: '/km',
    placeholder: '4:15',
    ariaLabel: 'Allure seuil en course à pied, minutes:secondes au kilomètre',
  },
]

/** Test proposé quand la référence manque — libellés exacts, un par discipline. */
const TEST_SESSIONS: Record<TrainingDiscipline, { label: string; meta: string }> = {
  N: { label: 'Test CSS 400 m / 200 m', meta: 'natation · semaine 1' },
  V: { label: 'Test FTP 20 min', meta: 'vélo · semaine 1' },
  C: { label: '30 min contre-la-montre', meta: 'course à pied · semaine 1' },
}

/**
 * G5 · Références — « Tes allures de référence ».
 *
 * Deux règles produit tiennent tout l'écran : aucune valeur n'est devinée (une référence absente
 * reste absente et déclenche le test correspondant), et saisir une valeur décoche aussitôt ce test
 * — le test n'a plus d'objet dès qu'on a mesuré.
 *
 * Écart assumé au canevas : celui-ci affiche une date de mesure à droite de chaque référence
 * (« 3 août »). `GeneratorForm.references` ne porte aucune date, et le contrat `GeneratorStepProps`
 * ne donne accès qu'au formulaire. On affiche donc un tiret — « valeur absente = tiret » — plutôt
 * qu'une date inventée.
 */
export function StepReferences({ form, onChange, onBack, onContinue, onGoToStep }: GeneratorStepProps) {
  const { references, testSessions } = form

  /** Écrit une référence et synchronise le test de la discipline : mesurée ⇒ plus de test. */
  function setReference(
    discipline: TrainingDiscipline,
    patch: Partial<GeneratorReferences>,
    hasValue: boolean,
  ) {
    onChange({
      references: { ...references, ...patch },
      testSessions: { ...testSessions, [discipline]: !hasValue },
    })
  }

  function currentValue(discipline: TrainingDiscipline): string {
    if (discipline === 'N') return references.cssPaceMinPer100m ?? ''
    if (discipline === 'V') return references.ftpWatts === undefined ? '' : String(references.ftpWatts)
    return references.runThresholdPaceMinPerKm ?? ''
  }

  function handleInput(discipline: TrainingDiscipline, raw: string) {
    if (discipline === 'V') {
      // Le FTP est un entier de watts : on ne garde que les chiffres, ce qui évite tout `NaN`
      // transitoire pendant la frappe.
      const digits = raw.replace(/[^0-9]/g, '')
      setReference('V', { ftpWatts: digits === '' ? undefined : Number(digits) }, digits !== '')
      return
    }
    const trimmed = raw.trim()
    const value = trimmed === '' ? undefined : raw
    if (discipline === 'N') setReference('N', { cssPaceMinPer100m: value }, trimmed !== '')
    else setReference('C', { runThresholdPaceMinPerKm: value }, trimmed !== '')
  }

  const missing = TRAINING_DISCIPLINES.filter((discipline) => currentValue(discipline).trim() === '')

  return (
    <GeneratorStepFrame
      stepIndex={5}
      titleLines={['Tes allures', 'de référence']}
      titleScale="sm"
      intro="Reprises de ton profil. Sans référence, l'app place un test en semaine 1 plutôt que de deviner."
      onBack={onBack}
      onGoToStep={onGoToStep}
      ctaLabel="Continuer"
      onContinue={onContinue}
    >
      <GeneratorSection>
        <div className={styles.references}>
          {REFERENCE_FIELDS.map((field) => {
            const value = currentValue(field.discipline)
            const filled = value.trim() !== ''
            return (
              <div key={field.discipline} className={styles.reference}>
                <DisciplineBadge discipline={field.discipline} />
                <div className={styles.referenceBody}>
                  <div className={styles.referenceLabel}>{field.label}</div>
                  <div className={filled ? styles.valueFilled : styles.valueEmpty}>
                    <input
                      className={styles.valueInput}
                      type="text"
                      inputMode={field.discipline === 'V' ? 'numeric' : 'text'}
                      value={value}
                      placeholder={filled ? field.placeholder : 'non renseigné'}
                      aria-label={field.ariaLabel}
                      onChange={(event) => handleInput(field.discipline, event.target.value)}
                    />
                    {filled && <span className={styles.unit}>{field.unit}</span>}
                  </div>
                </div>
                <span className={styles.referenceMeta}>
                  {!filled && testSessions[field.discipline] ? 'test sem. 1' : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </GeneratorSection>

      <GeneratorSection label="Test proposé" gap="sm">
        {missing.length === 0 ? (
          <MonoHint>aucun test nécessaire : tes trois références sont renseignées</MonoHint>
        ) : (
          <div className={styles.tests}>
            {missing.map((discipline) => (
              <ToggleRow
                key={discipline}
                label={TEST_SESSIONS[discipline].label}
                meta={TEST_SESSIONS[discipline].meta}
                checked={testSessions[discipline]}
                onToggle={(next) =>
                  onChange({ testSessions: { ...testSessions, [discipline]: next } })
                }
              />
            ))}
          </div>
        )}
      </GeneratorSection>

      <GeneratorSection
        gap="sm"
        label="Pourquoi pas d'estimation"
        labelAside={<ProofGauge level="weak" />}
      >
        <p className={styles.proofText}>
          Déduire une allure de course d'un FTP vélo donne des écarts de 20 à 40 s/km. Mieux vaut
          mesurer une fois.
        </p>
      </GeneratorSection>
    </GeneratorStepFrame>
  )
}
