import { useId } from 'react'
import type { PlanBlockedWeek } from '../../../domain/types'
import type { GeneratorConstraints } from '../../../domain/planGenerator/form'
import { weeksUntilRace } from '../../../domain/planGenerator/dates'
import { raceFormat } from '../../../domain/planGenerator/formats'
import { GeneratorSection, GeneratorStepFrame } from '../GeneratorStepFrame'
import { MonoHint, ToggleRow } from '../GeneratorRows'
import type { GeneratorStepProps } from '../stepProps'
import styles from './StepConstraints.module.css'

/** Clés de `GeneratorConstraints` qui sont de simples bascules (tout sauf `blockedWeeks`). */
type ConstraintToggleKey = Exclude<keyof GeneratorConstraints, 'blockedWeeks'>

interface ConstraintToggle {
  key: ConstraintToggleKey
  label: string
  /**
   * Écart assumé au canevas : celui-ci annonce des metas de démonstration (« bassin 25 m · lun. et
   * mar. soir », « lac à 20 min · à partir de juin », « 2 séances position aéro / sem. ») que
   * l'application ne collecte nulle part — ni créneaux de piscine, ni distance du lac, ni quota
   * aéro. Afficher ces phrases reviendrait à inventer des données. Chaque meta dit donc l'effet
   * réel de la bascule sur le plan à générer. Seule celle du capteur de puissance est reprise mot
   * pour mot : elle décrit déjà un effet vrai.
   */
  meta: string
}

const CONSTRAINT_TOGGLES: ConstraintToggle[] = [
  { key: 'pool', label: 'Piscine', meta: 'sans piscine, aucune séance en bassin dans le plan' },
  { key: 'openWater', label: 'Eau libre', meta: 'sans eau libre, aucune séance en milieu naturel' },
  { key: 'homeTrainer', label: 'Home-trainer', meta: 'sans home-trainer, aucune séance vélo en intérieur' },
  { key: 'powerMeter', label: 'Capteur de puissance', meta: 'sinon les séances passent en FC / ressenti' },
  {
    key: 'timeTrialBike',
    label: 'Vélo de contre-la-montre',
    meta: 'sans vélo de contre-la-montre, aucune séance en position aéro',
  },
]

/** « 04 » — les numéros de semaine sont des quantités, donc mono et sur deux chiffres. */
function weekLabel(weekNumber: number): string {
  return String(weekNumber).padStart(2, '0')
}

/** « sem. 04 », « sem. 04 et 05 », « sem. 04, 05 et 06 ». */
function joinWeeks(weekNumbers: number[]): string {
  const labels = weekNumbers.map(weekLabel)
  if (labels.length === 1) return `sem. ${labels[0]}`
  const last = labels[labels.length - 1]
  return `sem. ${labels.slice(0, -1).join(', ')} et ${last}`
}

/**
 * G4 · Contraintes — « Ce que tu as sous la main ».
 *
 * Deux blocs : les cinq bascules d'accès / matériel, puis le sélecteur de semaines bloquées. La
 * raison saisie est une seule chaîne appliquée à toutes les semaines bloquées : le canevas n'en
 * montre qu'une (« sem. 04 et 05 — déplacement pro… ») et rien ne justifie d'en collecter une par
 * semaine tant que le produit ne l'affiche pas.
 */
export function StepConstraints({
  form,
  onChange,
  onBack,
  onContinue,
  onGoToStep,
  today,
}: GeneratorStepProps) {
  const reasonInputId = useId()
  const { constraints } = form

  // Durée du plan : le délai réel quand une course est visée, le plancher du format sinon.
  const weekCount = form.noRace
    ? raceFormat(form.format).minWeeks
    : weeksUntilRace(today, form.raceDate)

  const blockedNumbers = constraints.blockedWeeks.map((week) => week.weekNumber).sort((a, b) => a - b)
  // Toutes les semaines bloquées partagent la même raison : on lit celle de la première.
  const reason = constraints.blockedWeeks[0]?.reason ?? ''

  function patchConstraints(patch: Partial<GeneratorConstraints>) {
    onChange({ constraints: { ...constraints, ...patch } })
  }

  function toggleWeek(weekNumber: number) {
    const isBlocked = constraints.blockedWeeks.some((week) => week.weekNumber === weekNumber)
    const next: PlanBlockedWeek[] = isBlocked
      ? constraints.blockedWeeks.filter((week) => week.weekNumber !== weekNumber)
      : [...constraints.blockedWeeks, { weekNumber, reason }].sort(
          (a, b) => a.weekNumber - b.weekNumber,
        )
    patchConstraints({ blockedWeeks: next })
  }

  function setReason(nextReason: string) {
    patchConstraints({
      blockedWeeks: constraints.blockedWeeks.map((week) => ({ ...week, reason: nextReason })),
    })
  }

  return (
    <GeneratorStepFrame
      stepIndex={4}
      titleLines={['Ce que tu as', 'sous la main']}
      titleScale="sm"
      onBack={onBack}
      onGoToStep={onGoToStep}
      ctaLabel="Continuer"
      onContinue={onContinue}
      footerNote="Ces contraintes façonnent le plan ; elles ne servent à rien d'autre."
    >
      <GeneratorSection>
        <div className={styles.toggles}>
          {CONSTRAINT_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              meta={toggle.meta}
              checked={constraints[toggle.key]}
              onToggle={(next) => patchConstraints({ [toggle.key]: next })}
            />
          ))}
        </div>
      </GeneratorSection>

      <GeneratorSection label="Semaines bloquées">
        {weekCount > 0 ? (
          <>
            <div className={styles.weeks} role="group" aria-label="Semaines bloquées">
              {Array.from({ length: weekCount }, (_, index) => {
                const weekNumber = index + 1
                const isBlocked = blockedNumbers.includes(weekNumber)
                return (
                  <button
                    key={weekNumber}
                    type="button"
                    className={styles.week}
                    onClick={() => toggleWeek(weekNumber)}
                    aria-pressed={isBlocked}
                    aria-label={`Semaine ${weekNumber}`}
                  >
                    <span className={isBlocked ? styles.weekFillBlocked : styles.weekFill} />
                  </button>
                )
              })}
            </div>

            {blockedNumbers.length > 0 && (
              <div className={styles.reason}>
                <label className={styles.reasonLabel} htmlFor={reasonInputId}>
                  Raison des semaines bloquées
                </label>
                <input
                  id={reasonInputId}
                  className={styles.reasonInput}
                  type="text"
                  value={reason}
                  placeholder="déplacement pro : volume réduit"
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            )}

            <MonoHint>
              {blockedNumbers.length === 0
                ? `aucune semaine bloquée — le plan occupera les ${weekCount} semaines`
                : `${joinWeeks(blockedNumbers)} — ${reason.trim() === '' ? 'raison non précisée' : reason.trim()}`}
            </MonoHint>
          </>
        ) : (
          // Un délai nul (date de course déjà passée) ne donne aucune semaine à bloquer : on le dit
          // plutôt que d'afficher une rangée vide.
          <MonoHint>aucune semaine à bloquer : la date visée est déjà passée</MonoHint>
        )}
      </GeneratorSection>
    </GeneratorStepFrame>
  )
}
