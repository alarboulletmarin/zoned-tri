import { DisciplineBadge } from '../../../components/ui/Badge/Badge'
import type { AvailableDays, TrainingDiscipline } from '../../../domain/planGenerator/form'
import {
  availableDayCount,
  TRAINING_DISCIPLINES,
  VOLUME_MAX_MIN,
  VOLUME_MIN_MIN,
  VOLUME_STEP_MIN,
} from '../../../domain/planGenerator/form'
import { formatDurationMin } from '../../../domain/workoutFormat'
import { MonoHint } from '../GeneratorRows'
import { GeneratorSection, GeneratorStepFrame } from '../GeneratorStepFrame'
import type { GeneratorStepProps } from '../stepProps'
import styles from './StepAvailability.module.css'
import { peakWeekMin } from '../../../domain/planGenerator/generatePlan'

/** Index 0 = lundi, même convention que `GeneratorForm.availableDays`. */
const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const DISCIPLINE_NAMES: Record<TrainingDiscipline, string> = {
  N: 'Natation',
  V: 'Vélo',
  C: 'Course',
}

const MAX_SESSIONS_PER_WEEK = 7

/** « vendredi laissé libre », « vendredi et dimanche laissés libres », « aucun jour libre ». */
function freeDaysLabel(days: AvailableDays): string {
  const free = DAY_NAMES.filter((_, index) => !days[index])
  if (free.length === 0) return 'aucun jour libre'
  if (free.length === 1) return `${free[0]} laissé libre`
  const last = free[free.length - 1]
  return `${free.slice(0, -1).join(', ')} et ${last} laissés libres`
}

/**
 * G3 · Disponibilité — « Combien de temps ? »
 *
 * Trois réglages, aucun deviné : le volume hebdomadaire visé, les jours réellement disponibles et
 * le plafond de séances par discipline.
 *
 * Le repère central annonçait « maxi tenable : 9 h », présenté comme « le plafond déclaré par
 * l'athlète ». Personne ne le déclarait : c'était une constante du code (`sustainableMaxMin: 540`)
 * — et `generatePlan` l'appliquait vraiment, bornant le volume de toutes les semaines à un chiffre
 * que l'athlète n'avait jamais donné. Le plafond est retiré ; le repère dit désormais la seule
 * conséquence vérifiable du curseur, la semaine la plus chargée que le plan produira.
 */
export function StepAvailability({ form, onChange, onBack, onContinue, onGoToStep }: GeneratorStepProps) {
  const volumeRatio = (form.weeklyVolumeTargetMin - VOLUME_MIN_MIN) / (VOLUME_MAX_MIN - VOLUME_MIN_MIN)
  const dayCount = availableDayCount(form.availableDays)

  function toggleDay(index: number) {
    const next = [...form.availableDays] as AvailableDays
    next[index] = !next[index]
    onChange({ availableDays: next })
  }

  function setSessions(discipline: TrainingDiscipline, value: number) {
    const clamped = Math.min(MAX_SESSIONS_PER_WEEK, Math.max(0, value))
    onChange({ maxSessionsPerDiscipline: { ...form.maxSessionsPerDiscipline, [discipline]: clamped } })
  }

  return (
    <GeneratorStepFrame
      stepIndex={3}
      titleLines={['Combien', 'de temps ?']}
      titleScale="md"
      onBack={onBack}
      onGoToStep={onGoToStep}
      ctaLabel="Continuer"
      onContinue={onContinue}
    >
      <GeneratorSection label="Volume hebdo visé">
        <div className={styles.volume}>{formatDurationMin(form.weeklyVolumeTargetMin)}</div>

        <div className={styles.slider}>
          <div className={styles.rail} aria-hidden="true" />
          {/* La poignée fait 20px : la part parcourue s'arrête sur son centre, pas sur le bord du rail. */}
          <div
            className={styles.fill}
            style={{ width: `calc(10px + (100% - 20px) * ${volumeRatio})` }}
            aria-hidden="true"
          />
          <input
            type="range"
            className={styles.range}
            min={VOLUME_MIN_MIN}
            max={VOLUME_MAX_MIN}
            step={VOLUME_STEP_MIN}
            value={form.weeklyVolumeTargetMin}
            aria-label="Volume hebdomadaire visé"
            aria-valuetext={formatDurationMin(form.weeklyVolumeTargetMin)}
            onChange={(event) => onChange({ weeklyVolumeTargetMin: Number(event.target.value) })}
          />
        </div>

        <div className={styles.marks}>
          <span>{formatDurationMin(VOLUME_MIN_MIN)}</span>
          <span className={styles.markCurrent}>
            semaine la plus chargée : {formatDurationMin(peakWeekMin(form.weeklyVolumeTargetMin))}
          </span>
          <span>{formatDurationMin(VOLUME_MAX_MIN)}</span>
        </div>
      </GeneratorSection>

      <GeneratorSection label="Jours d'entraînement" gap="lg">
        <div className={styles.days}>
          {DAY_INITIALS.map((initial, index) => (
            <button
              key={DAY_NAMES[index]}
              type="button"
              className={styles.day}
              data-active={form.availableDays[index]}
              aria-pressed={form.availableDays[index]}
              aria-label={DAY_NAMES[index]}
              onClick={() => toggleDay(index)}
            >
              {initial}
            </button>
          ))}
        </div>
        <MonoHint>
          {dayCount} {dayCount > 1 ? 'jours' : 'jour'} · {freeDaysLabel(form.availableDays)}
        </MonoHint>
      </GeneratorSection>

      <GeneratorSection label="Séances maxi par discipline" gap="lg">
        <div className={styles.disciplines}>
          {TRAINING_DISCIPLINES.map((discipline) => {
            const count = form.maxSessionsPerDiscipline[discipline]
            const name = DISCIPLINE_NAMES[discipline]
            return (
              <div key={discipline} className={styles.disciplineRow}>
                <DisciplineBadge discipline={discipline} />
                <span className={styles.disciplineName}>{name}</span>
                <div className={styles.counter} role="group" aria-label={`Séances maxi ${name.toLowerCase()}`}>
                  <button
                    type="button"
                    className={styles.counterButton}
                    aria-label={`Une séance de ${name.toLowerCase()} en moins`}
                    disabled={count === 0}
                    onClick={() => setSessions(discipline, count - 1)}
                  >
                    −
                  </button>
                  <span className={styles.counterValue} aria-live="polite">
                    {count} / sem
                  </span>
                  <button
                    type="button"
                    className={styles.counterButton}
                    aria-label={`Une séance de ${name.toLowerCase()} en plus`}
                    disabled={count === MAX_SESSIONS_PER_WEEK}
                    onClick={() => setSessions(discipline, count + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </GeneratorSection>
    </GeneratorStepFrame>
  )
}
