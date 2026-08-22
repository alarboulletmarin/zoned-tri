import { RACE_FORMATS } from '../../../domain/planGenerator/formats'
import { FramedField, MonoHint, SelectableRow } from '../GeneratorRows'
import { GeneratorSection, GeneratorStepFrame } from '../GeneratorStepFrame'
import type { GeneratorStepProps } from '../stepProps'
import styles from './StepFormat.module.css'

/**
 * G1 · Objectif — « Quel format ? »
 *
 * Écart assumé au canevas : celui-ci annonce « catalogue de 1 240 courses ». Ce catalogue n'existe
 * pas (report décidé en session), donc l'écran ne le mentionne pas : la course visée est une saisie
 * libre et l'aide sous le champ le dit. Annoncer une recherche absente serait la seule chose que
 * l'écran promet et ne tient pas.
 */
export function StepFormat({ form, onChange, onBack, onContinue }: GeneratorStepProps) {
  return (
    <GeneratorStepFrame
      stepIndex={1}
      titleLines={['Quel', 'format ?']}
      intro="Le format fixe la durée du plan et la distribution d'intensité. Rien n'est définitif : tu pourras changer."
      onBack={onBack}
      ctaLabel="Continuer"
      onContinue={onContinue}
      footerNote="Aucune donnée envoyée : tout reste sur l'appareil."
    >
      <GeneratorSection>
        <div className={styles.formats}>
          {RACE_FORMATS.map((definition) => (
            <SelectableRow
              key={definition.format}
              label={definition.format}
              meta={definition.metaLabel}
              selected={form.format === definition.format}
              onSelect={() => onChange({ format: definition.format })}
            />
          ))}
        </div>
      </GeneratorSection>

      <GeneratorSection label="Course visée">
        <div className={styles.field}>
          <FramedField>
            <input
              type="text"
              value={form.raceName}
              placeholder="ex. 70.3 Vichy"
              aria-label="Nom de la course visée"
              disabled={form.noRace}
              onChange={(event) => onChange({ raceName: event.target.value })}
            />
          </FramedField>
        </div>

        <MonoHint>saisie libre · sinon coche « aucune course »</MonoHint>

        <button
          type="button"
          className={styles.noRace}
          aria-pressed={form.noRace}
          data-active={form.noRace}
          // Cocher « aucune course » vide le nom : garder un nom saisi alors qu'aucune course n'est
          // visée laisserait une valeur fantôme dans le récapitulatif G6.
          onClick={() => onChange({ noRace: !form.noRace, raceName: form.noRace ? form.raceName : '' })}
        >
          Aucune course, je m'entraîne
          <span aria-hidden="true">{form.noRace ? '✓' : '—'}</span>
        </button>
      </GeneratorSection>
    </GeneratorStepFrame>
  )
}
