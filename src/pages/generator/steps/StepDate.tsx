import { ProofGauge } from '../../../components/ui/ProofBadge/ProofBadge'
import { formatLongDate, weekdayName, weeksUntilRace } from '../../../domain/planGenerator/dates'
import { raceFormat } from '../../../domain/planGenerator/formats'
import { FramedField, MonoHint, StatRow } from '../GeneratorRows'
import { GeneratorSection, GeneratorStepFrame } from '../GeneratorStepFrame'
import type { GeneratorStepProps } from '../stepProps'
import styles from './StepDate.module.css'

/**
 * G2 · Date — « Quelle date ? »
 *
 * L'écran ne fait qu'une chose : montrer ce que la date choisie laisse comme préparation face au
 * plancher du format. L'alerte de délai n'apparaît que quand le délai est réellement trop court,
 * et elle n'interdit rien — le repli est proposé en fin de parcours, pas imposé ici.
 */
export function StepDate({ form, onChange, onBack, onContinue, onGoToStep, today }: GeneratorStepProps) {
  const definition = raceFormat(form.format)
  const availableWeeks = form.raceDate ? weeksUntilRace(today, form.raceDate) : 0
  const missingWeeks = Math.max(0, definition.minWeeks - availableWeeks)
  const showShortDelay = !form.noRace && form.raceDate !== '' && availableWeeks < definition.minWeeks

  return (
    <GeneratorStepFrame
      stepIndex={2}
      titleLines={['Quelle', 'date ?']}
      onBack={onBack}
      ctaLabel="Continuer"
      onContinue={onContinue}
      ctaDisabled={!form.noRace && form.raceDate === ''}
    >
      {form.noRace ? (
        // Sans course visée, il n'y a pas de date à choisir : la durée du plan vient du format.
        // Ni barre ni alerte, il n'y a plus rien à comparer à un plancher.
        <GeneratorSection noRule gap="sm">
          <FramedField size="lg">
            <span className={styles.duration}>{definition.minWeeks} semaines</span>
          </FramedField>
          <MonoHint>
            aucune course visée · durée déduite du format {definition.format}, son plancher de préparation
          </MonoHint>
        </GeneratorSection>
      ) : (
        <>
          <GeneratorSection noRule gap="sm">
            <FramedField size="lg">
              <input
                type="date"
                value={form.raceDate}
                aria-label="Date de la course"
                onChange={(event) => onChange({ raceDate: event.target.value })}
              />
            </FramedField>
            {form.raceDate ? (
              <MonoHint>
                {formatLongDate(form.raceDate)} · dans {availableWeeks} semaines · {weekdayName(form.raceDate)}
              </MonoHint>
            ) : (
              <MonoHint>aucune date choisie</MonoHint>
            )}
          </GeneratorSection>

          {form.raceDate !== '' && (
            <GeneratorSection label="Ce que ça laisse comme préparation" gap="lg">
              <div className={styles.bar}>
                <div className={styles.barAvailable} style={{ flexGrow: availableWeeks }} />
                {/* Une part manquante nulle n'est pas rendue : une barre à largeur zéro se lirait
                    comme un filet parasite alors qu'il n'y a rien à signaler. */}
                {missingWeeks > 0 && <div className={styles.barMissing} style={{ flexGrow: missingWeeks }} />}
              </div>
              <div className={styles.barLegend}>
                {missingWeeks > 0 ? (
                  <>
                    <span>{availableWeeks} sem. disponibles</span>
                    <span>{missingWeeks} sem. manquantes</span>
                  </>
                ) : (
                  <span>{availableWeeks} sem. disponibles · délai suffisant</span>
                )}
              </div>
            </GeneratorSection>
          )}

          {showShortDelay && (
            <div className={styles.alert} role="status">
              <div className={styles.alertHead}>
                <span className={styles.alertTitle}>Délai trop court pour un {definition.format}</span>
                <ProofGauge level="solid" />
              </div>
              <p className={styles.alertText}>
                {definition.minWeeks} semaines est le plancher raisonnable pour ce format à ton volume actuel. Tu
                peux continuer quand même — l'app proposera un repli en fin de parcours, sans le forcer.
              </p>
            </div>
          )}
        </>
      )}

      <div className={styles.stats}>
        <StatRow label="Course de préparation" value="aucune" />
        <StatRow label="Semaines bloquées" value="à l'étape 4" onClick={() => onGoToStep('constraints')} />
      </div>
    </GeneratorStepFrame>
  )
}
